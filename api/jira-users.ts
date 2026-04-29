import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const query = (req.query.q as string || '').trim();
  if (!query || query.length < 2) return res.json({ users: [] });

  try {
    const cloudId = req.cookies.cloud_id || await getCloudId(token);
    const r = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/user/search`,
      {
        params: { query, maxResults: 10 },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const users = (r.data as any[]).map((u: any) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      avatarUrl: u.avatarUrls?.['24x24'] || '',
    }));
    return res.json({ users });
  } catch (err: any) {
    console.error('User search failed:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({ error: 'User search failed' });
  }
}
