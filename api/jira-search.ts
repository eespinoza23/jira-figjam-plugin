import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const validateInstance = (instance: string): boolean => {
  return /^[a-z0-9-]+\.atlassian\.net$/.test(instance.toLowerCase());
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jql } = req.body;
  const accessToken = req.cookies.access_token;
  const rawInstance = req.cookies.jira_instance || process.env.JIRA_INSTANCE_URL;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated — call /api/jira-auth first' });
  }

  if (!jql) {
    return res.status(400).json({ error: 'JQL query required' });
  }

  if (!validateInstance(rawInstance)) {
    console.error('Invalid Jira instance in cookie:', rawInstance);
    return res.status(400).json({ error: 'Invalid Jira instance configuration' });
  }

  const instanceUrl = rawInstance.toLowerCase();

  try {
    const response = await axios.get(`https://${instanceUrl}/rest/api/3/search`, {
      params: { jql, expand: 'changelog', maxResults: 100 },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json(response.data.issues);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired — re-authenticate' });
    }
    console.error('Jira search failed:', error);
    res.status(500).json({ error: 'Failed to search Jira' });
  }
}
