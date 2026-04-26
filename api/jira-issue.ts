import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { issueKey } = req.query;
  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!issueKey) {
    return res.status(400).json({ error: 'Issue key required' });
  }

  try {
    const cloudId = req.cookies.cloud_id || await getCloudId(accessToken);

    const response = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issues/${issueKey}`,
      {
        params: {
          fields: 'summary,parent',
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const issue = response.data;
    const parentKey = issue.fields?.parent?.key;
    let parentTitle: string | null = null;

    // If this issue has a parent, fetch the parent's summary
    if (parentKey) {
      try {
        const parentResponse = await axios.get(
          `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issues/${parentKey}`,
          {
            params: { fields: 'summary' },
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        parentTitle = parentResponse.data.fields?.summary || null;
      } catch (err) {
        // If parent fetch fails, continue with just the key
        console.error(`Failed to fetch parent ${parentKey}:`, err);
      }
    }

    res.json({
      key: issue.key,
      summary: issue.fields?.summary || null,
      parentKey,
      parentTitle,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired — re-authenticate' });
    }
    console.error('Jira issue fetch failed:', error);
    const detail = axios.isAxiosError(error) ? error.response?.data : String(error);
    res.status(500).json({ error: 'Failed to fetch Jira issue', detail });
  }
}
