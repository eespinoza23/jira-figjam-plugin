import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const response = await axios.get('https://api.atlassian.com/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const instance = req.cookies.jira_instance || process.env.JIRA_INSTANCE_URL || null;
    res.json({ authenticated: true, user: response.data, instance });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'Token invalid or insufficient scope — re-auth needed' });
      }
    }
    const detail = axios.isAxiosError(error) ? error.response?.data : String(error);
    res.status(500).json({ error: 'Atlassian API call failed', detail });
  }
}
