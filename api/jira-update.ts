import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const response = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: process['env']['ATLASSIAN_CLIENT_ID'],
      client_secret: process['env']['ATLASSIAN_CLIENT_SECRET'],
      refresh_token: refreshToken,
    });
    return response.data;
  } catch (err) {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Refresh-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { key, fields } = req.body;
  if (!key) return res.status(400).json({ error: 'Missing issue key' });

  const authHeader = req.headers.authorization;
  let accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies.access_token;
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const cloudId = req.cookies.cloud_id || await getCloudId(accessToken);
  if (!cloudId) return res.status(401).json({ error: 'Could not resolve Jira cloud ID' });

  try {
    const response = await axios.patch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${key}`,
      { fields },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    res.status(200).json({ ok: true });
  } catch (err: any) {
    if (err.response?.status === 401) {
      const refreshToken = req.headers['x-refresh-token'] as string || req.cookies.refresh_token;
      if (!refreshToken) return res.status(401).json({ error: 'Session expired — reconnect' });

      const newTokens = await refreshAccessToken(refreshToken);
      if (!newTokens) return res.status(401).json({ error: 'Session expired — reconnect' });

      try {
        const newCloudId = await getCloudId(newTokens.access_token);
        await axios.patch(
          `https://api.atlassian.com/ex/jira/${newCloudId}/rest/api/3/issue/${key}`,
          { fields },
          { headers: { Authorization: `Bearer ${newTokens.access_token}` } }
        );
        res.status(200).json({ ok: true, new_access_token: newTokens.access_token, new_refresh_token: newTokens.refresh_token });
      } catch (retryErr: any) {
        res.status(retryErr.response?.status || 500).json({ error: retryErr.message });
      }
    } else {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  }
}
