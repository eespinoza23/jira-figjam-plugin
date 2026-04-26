import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { boardId } = req.query;
  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const cloudId = req.cookies.cloud_id || await getCloudId(accessToken);

    // Fetch all sprints (active and future) from the board
    const response = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/board${boardId ? `/${boardId}` : ''}/sprints`,
      {
        params: {
          state: 'active,future',
          maxResults: 50,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const sprints = response.data.values?.map((sprint: any) => ({
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
    })) || [];

    res.json(sprints);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired — re-authenticate' });
    }

    // If board-specific fetch fails, try generic sprint search
    try {
      const cloudId = req.cookies.cloud_id || await getCloudId(accessToken);
      const response = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/sprints`,
        {
          params: {
            state: 'active,future',
            maxResults: 50,
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const sprints = response.data.values?.map((sprint: any) => ({
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
      })) || [];

      return res.json(sprints);
    } catch (fallbackError) {
      console.error('Jira sprints fetch failed:', fallbackError);
      const detail = axios.isAxiosError(fallbackError) ? fallbackError.response?.data : String(fallbackError);
      res.status(500).json({ error: 'Failed to fetch Jira sprints', detail });
    }
  }
}
