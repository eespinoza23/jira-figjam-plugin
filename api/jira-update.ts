import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

async function refreshAccessToken(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return null;

  try {
    const response = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: process['env']['ATLASSIAN_CLIENT_ID'],
      client_secret: process['env']['ATLASSIAN_CLIENT_SECRET'],
      refresh_token: refreshToken,
    });

    res.setHeader('Set-Cookie', [
      `access_token=${response.data.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
      `refresh_token=${response.data.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
    ]);

    return response.data.access_token;
  } catch (err) {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { key, fields } = req.body;
  if (!key) return res.status(400).json({ error: 'Missing issue key' });

  let accessToken = req.cookies.access_token;
  const cloudId = req.cookies.cloud_id;
  if (!accessToken || !cloudId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const response = await axios.patch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${key}`,
      { fields },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.status(200).json({ ok: true, issue: response.data });
  } catch (err: any) {
    if (err.response?.status === 401) {
      const newToken = await refreshAccessToken(req, res);
      if (!newToken) return res.status(401).json({ error: 'Token refresh failed' });

      try {
        const retryResponse = await axios.patch(
          `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${key}`,
          { fields },
          { headers: { Authorization: `Bearer ${newToken}` } }
        );
        res.status(200).json({ ok: true, issue: retryResponse.data });
      } catch (retryErr: any) {
        res.status(retryErr.response?.status || 500).json({ error: retryErr.message });
      }
    } else {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  }
}
