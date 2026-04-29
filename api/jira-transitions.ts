import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

async function tryRefresh(refreshToken: string) {
  try {
    const r = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: process['env']['ATLASSIAN_CLIENT_ID'],
      client_secret: process['env']['ATLASSIAN_CLIENT_SECRET'],
      refresh_token: refreshToken,
    });
    return r.data as { access_token: string; refresh_token: string };
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Refresh-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies.access_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated', code: 'no_token' });

  let cloudId: string;
  try {
    cloudId = req.cookies.cloud_id || await getCloudId(token);
    if (!cloudId) return res.status(401).json({ error: 'Could not resolve cloud ID', code: 'no_cloud_id' });
  } catch (e: any) {
    return res.status(401).json({ error: 'Cloud ID lookup failed', code: 'cloud_id_error' });
  }

  const key = (req.method === 'GET' ? req.query.key : req.body?.key) as string;
  if (!key) return res.status(400).json({ error: 'Missing issue key' });

  // GET — list available transitions
  if (req.method === 'GET') {
    try {
      const r = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${key}/transitions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.json({ transitions: r.data.transitions });
    } catch (err: any) {
      if (err.response?.status !== 401) {
        return res.status(err.response?.status || 500).json({ error: 'Failed to fetch transitions', detail: err.response?.data });
      }
      const refreshToken = req.headers['x-refresh-token'] as string || req.cookies.refresh_token;
      if (!refreshToken) return res.status(401).json({ error: 'Session expired', code: 'auth_expired' });
      const newTokens = await tryRefresh(refreshToken);
      if (!newTokens) return res.status(401).json({ error: 'Session expired', code: 'auth_expired' });
      try {
        const newCloudId = await getCloudId(newTokens.access_token);
        const r = await axios.get(
          `https://api.atlassian.com/ex/jira/${newCloudId}/rest/api/3/issue/${key}/transitions`,
          { headers: { Authorization: `Bearer ${newTokens.access_token}` } }
        );
        return res.json({ transitions: r.data.transitions, new_access_token: newTokens.access_token, new_refresh_token: newTokens.refresh_token });
      } catch { return res.status(401).json({ error: 'Session expired', code: 'auth_expired' }); }
    }
  }

  // POST — apply a transition
  if (req.method === 'POST') {
    const { transitionId } = req.body || {};
    if (!transitionId) return res.status(400).json({ error: 'Missing transitionId' });
    try {
      await axios.post(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${key}/transitions`,
        { transition: { id: transitionId } },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      return res.json({ ok: true });
    } catch (err: any) {
      if (err.response?.status !== 401) {
        return res.status(err.response?.status || 500).json({ error: 'Transition failed', detail: err.response?.data });
      }
      const refreshToken = req.headers['x-refresh-token'] as string || req.cookies.refresh_token;
      if (!refreshToken) return res.status(401).json({ error: 'Session expired', code: 'auth_expired' });
      const newTokens = await tryRefresh(refreshToken);
      if (!newTokens) return res.status(401).json({ error: 'Session expired', code: 'auth_expired' });
      try {
        const newCloudId = await getCloudId(newTokens.access_token);
        await axios.post(
          `https://api.atlassian.com/ex/jira/${newCloudId}/rest/api/3/issue/${key}/transitions`,
          { transition: { id: transitionId } },
          { headers: { Authorization: `Bearer ${newTokens.access_token}`, 'Content-Type': 'application/json' } }
        );
        return res.json({ ok: true, new_access_token: newTokens.access_token, new_refresh_token: newTokens.refresh_token });
      } catch { return res.status(401).json({ error: 'Session expired', code: 'auth_expired' }); }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
