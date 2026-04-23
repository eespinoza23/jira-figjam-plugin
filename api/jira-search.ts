import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jql } = req.body;
  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!jql) {
    return res.status(400).json({ error: 'JQL query required' });
  }

  try {
    const cloudId = req.cookies.cloud_id || await getCloudId(accessToken);

    const response = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`,
      {
        params: {
          jql,
          maxResults: 100,
          fields: 'summary,issuetype,priority,assignee,customfield_10000,customfield_10016,customfield_10028,story_points,status,sprint,labels,components,parent,fixVersions,reporter,updated',
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.setHeader('Set-Cookie', `cloud_id=${cloudId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
    res.json(response.data.issues);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired — re-authenticate' });
    }
    console.error('Jira search failed:', error);
    const detail = axios.isAxiosError(error) ? error.response?.data : String(error);
    res.status(500).json({ error: 'Failed to search Jira', detail });
  }
}
