import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Refresh-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const cloudId = req.cookies.cloud_id || await getCloudId(token);

    // GET — list active + future sprints for a project
    if (req.method === 'GET') {
      const project = (req.query.project as string || '').trim();
      if (!project) return res.status(400).json({ error: 'project param required' });

      // Step 1: find boards for this project
      const boardsRes = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board`,
        { params: { projectKeyOrId: project, maxResults: 5 }, headers: { Authorization: `Bearer ${token}` } }
      );
      const boards: any[] = boardsRes.data.values || [];
      if (!boards.length) return res.json({ sprints: [] });

      // Step 2: get sprints for the first board
      const boardId = boards[0].id;
      const sprintsRes = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${boardId}/sprint`,
        { params: { state: 'active,future', maxResults: 50 }, headers: { Authorization: `Bearer ${token}` } }
      );
      const sprints = (sprintsRes.data.values || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        state: s.state,
      }));
      return res.json({ sprints });
    }

    // POST — move issue to sprint
    if (req.method === 'POST') {
      const { key, sprintId } = req.body;
      if (!key || !sprintId) return res.status(400).json({ error: 'Missing key or sprintId' });

      await axios.post(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/sprint/${sprintId}/issue`,
        { issues: [key] },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    const status = err.response?.status;
    console.error('Sprints API error:', err.response?.data || err.message);
    if (status === 401) return res.status(401).json({ error: 'Session expired', code: 'auth_expired' });
    return res.status(status || 500).json({ error: 'Sprint operation failed' });
  }
}
