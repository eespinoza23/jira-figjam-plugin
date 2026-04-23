import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const accessToken = req.cookies.access_token;
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { issueKey } = req.query;
  if (!issueKey) return res.status(400).json({ error: 'issueKey required' });

  try {
    const cloudId = req.cookies.cloud_id || await getCloudId(accessToken);
    const response = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/user/assignable/search`,
      {
        params: { issueKey, maxResults: 50 },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired' });
    }
    const detail = axios.isAxiosError(error) ? error.response?.data : String(error);
    res.status(500).json({ error: 'Failed to fetch assignable users', detail });
  }
}
