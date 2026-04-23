import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const validateInstance = (instance: string): boolean => {
  return /^[a-z0-9-]+\.atlassian\.net$/.test(instance.toLowerCase());
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { issueKey, updates } = req.body;
  const accessToken = req.cookies.access_token;
  const rawInstance = req.cookies.jira_instance || process.env.JIRA_INSTANCE_URL;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!issueKey || !updates) {
    return res.status(400).json({ error: 'issueKey and updates required' });
  }

  if (!validateInstance(rawInstance)) {
    console.error('Invalid Jira instance in cookie:', rawInstance);
    return res.status(400).json({ error: 'Invalid Jira instance configuration' });
  }

  const instanceUrl = rawInstance.toLowerCase();

  try {
    const fieldsToUpdate = {};
    const allowedFields = ['summary', 'priority', 'assignee', 'status', 'customfield_10000'];

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        fieldsToUpdate[key] = value;
      }
    });

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await axios.put(`https://${instanceUrl}/rest/api/3/issue/${issueKey}`, {
      fields: fieldsToUpdate,
    }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json({ success: true, issueKey });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Jira update failed:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
}
