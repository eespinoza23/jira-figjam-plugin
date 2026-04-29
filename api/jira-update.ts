import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

async function tryRefresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const r = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: process['env']['ATLASSIAN_CLIENT_ID'],
      client_secret: process['env']['ATLASSIAN_CLIENT_SECRET'],
      refresh_token: refreshToken,
    });
    return r.data;
  } catch {
    return null;
  }
}

async function patchIssue(cloudId: string, key: string, fields: object, token: string) {
  return axios.put(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${key}`,
    { fields },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Refresh-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { key, fields } = req.body;
  if (!key || !fields) return res.status(400).json({ error: 'Missing key or fields' });

  const ALLOWED_FIELDS = new Set(['summary', 'description', 'customfield_10016', 'priority', 'assignee', 'labels', 'fixVersions', 'components']);
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([k]) => ALLOWED_FIELDS.has(k))
  );
  if (Object.keys(safeFields).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies.access_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated', code: 'no_token' });

  let cloudId: string;
  try {
    cloudId = req.cookies.cloud_id || await getCloudId(token);
    if (!cloudId) return res.status(401).json({ error: 'Could not resolve cloud ID', code: 'no_cloud_id' });
  } catch (e: any) {
    return res.status(401).json({ error: 'Cloud ID lookup failed', detail: e.message, code: 'cloud_id_error' });
  }

  try {
    await patchIssue(cloudId, key, safeFields, token);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    const status = err.response?.status;
    const atlassianError = err.response?.data;

    // Not a token issue — surface the real error
    if (status !== 401) {
      console.error('Jira update failed:', status, atlassianError);
      return res.status(status || 500).json({ error: 'Update failed. Please try again.' });
    }

    // 401 — try refresh once
    const refreshToken = req.headers['x-refresh-token'] as string || req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Session expired', code: 'auth_expired' });
    }

    const newTokens = await tryRefresh(refreshToken);
    if (!newTokens) {
      return res.status(401).json({ error: 'Session expired', code: 'auth_expired' });
    }

    try {
      const newCloudId = await getCloudId(newTokens.access_token);
      await patchIssue(newCloudId, key, safeFields, newTokens.access_token);
      return res.status(200).json({
        ok: true,
        new_access_token: newTokens.access_token,
        new_refresh_token: newTokens.refresh_token,
      });
    } catch (retryErr: any) {
      const retryStatus = retryErr.response?.status;
      const retryDetail = retryErr.response?.data;
      console.error('Jira update retry failed:', retryStatus, retryDetail);
      return res.status(retryStatus || 500).json({
        error: retryStatus === 401 ? 'Session expired' : 'Update failed. Please try again.',
        code: retryStatus === 401 ? 'auth_expired' : 'update_failed',
      });
    }
  }
}
