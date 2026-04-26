import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { issueKey, updates } = req.body;
  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!issueKey || !updates) {
    return res.status(400).json({ error: 'issueKey and updates required' });
  }

  try {
    const cloudId = req.cookies.cloud_id || await getCloudId(accessToken);
    const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`;
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    const fields: Record<string, unknown> = {};

    if (updates.title) fields.summary = updates.title;
    if (updates.description !== undefined) {
      // Wrap plain text into ADF (Atlassian Document Format)
      fields.description = updates.description
        ? { version: 1, type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(updates.description) }] }] }
        : { version: 1, type: 'doc', content: [] };
    }
    if (updates.points !== undefined) {
      fields.customfield_10016 = updates.points;
    }
    if (updates.priority) fields.priority = { name: updates.priority };
    if (updates.assigneeAccountId) fields.assignee = { accountId: updates.assigneeAccountId };
    if (updates.fixVersion !== undefined) {
      fields.fixVersions = updates.fixVersion ? [{ name: updates.fixVersion }] : [];
    }
    if (updates.labels !== undefined) {
      const raw = String(updates.labels);
      fields.labels = raw ? raw.split(',').map((l: string) => l.trim()).filter(Boolean) : [];
    }

    if (Object.keys(fields).length > 0) {
      try {
        await axios.put(base, { fields }, { headers });
      } catch (fieldError) {
        if (axios.isAxiosError(fieldError) && fieldError.response?.status === 400 && updates.points !== undefined) {
          // customfield_10016 rejected — retry with 10028 (NextGen) then 10000 (legacy)
          const fallbacks = ['customfield_10028', 'customfield_10000'];
          let saved = false;
          for (const fieldId of fallbacks) {
            try {
              const retry = { ...fields };
              delete retry.customfield_10016;
              retry[fieldId] = updates.points;
              await axios.put(base, { fields: retry }, { headers });
              saved = true;
              break;
            } catch { /* try next */ }
          }
          if (!saved) throw fieldError;
        } else {
          throw fieldError;
        }
      }
    }

    // Status requires a transition
    if (updates.status) {
      const transitionsRes = await axios.get(`${base}/transitions`, { headers });
      const transitions: { id: string; name: string; to: { name: string } }[] = transitionsRes.data.transitions;

      const statusMap: Record<string, string[]> = {
        'To Do': ['to do', 'open', 'backlog'],
        'In Progress': ['in progress', 'in development', 'started'],
        'Done': ['done', 'closed', 'resolved', 'complete'],
      };

      const targetStatus = updates.status as string;
      const keywords = statusMap[targetStatus] || [targetStatus.toLowerCase()];
      const match = transitions.find(t =>
        keywords.some(k => t.to.name.toLowerCase().includes(k) || t.name.toLowerCase().includes(k))
      );

      if (match) {
        await axios.post(`${base}/transitions`, { transition: { id: match.id } }, { headers });
      }
    }

    res.setHeader('Set-Cookie', `cloud_id=${cloudId}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=86400`);
    res.json({ success: true, issueKey });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Jira update failed:', error);
    const detail = axios.isAxiosError(error) ? error.response?.data : String(error);
    res.status(500).json({ error: 'Failed to update issue', detail });
  }
}
