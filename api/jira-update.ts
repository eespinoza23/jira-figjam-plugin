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

    const allowedFields = ['summary', 'priority', 'assignee', 'status', 'customfield_10000'];
    const fieldsToUpdate: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) fieldsToUpdate[key] = value;
    });

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await axios.put(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`,
      { fields: fieldsToUpdate },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.setHeader('Set-Cookie', `cloud_id=${cloudId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
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
