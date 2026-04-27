import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  try {
    const response = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: process['env']['ATLASSIAN_CLIENT_ID'],
      client_secret: process['env']['ATLASSIAN_CLIENT_SECRET'],
      refresh_token: refreshToken,
    });
    return response.data;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Refresh-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jql } = req.body;
  const authHeader = req.headers.authorization;
  let accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;

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
          fields: 'summary,description,issuetype,priority,assignee,customfield_10000,customfield_10016,customfield_10028,story_points,status,sprint,labels,components,parent,fixVersions,reporter,updated',
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.setHeader('Set-Cookie', `cloud_id=${cloudId}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=86400`);
    res.json({ issues: response.data.issues });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401 && refreshToken) {
      const newTokenData = await refreshAccessToken(refreshToken);
      if (newTokenData) {
        accessToken = newTokenData.access_token;
        const cookieOptions = 'Path=/; HttpOnly; Secure; SameSite=None';
        res.setHeader('Set-Cookie', [
          `access_token=${accessToken}; ${cookieOptions}; Max-Age=${newTokenData.expires_in}`,
          `refresh_token=${newTokenData.refresh_token}; ${cookieOptions}; Max-Age=2592000`,
        ]);
        
        try {
          const cloudId = req.cookies.cloud_id || await getCloudId(accessToken);
          const retryResponse = await axios.get(
            `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`,
            {
              params: {
                jql,
                maxResults: 100,
                fields: 'summary,description,issuetype,priority,assignee,customfield_10000,customfield_10016,customfield_10028,story_points,status,sprint,labels,components,parent,fixVersions,reporter,updated',
              },
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          return res.json({ issues: retryResponse.data.issues });
        } catch (retryError) {
          console.error('Retry after token refresh failed:', retryError);
        }
      }
      return res.status(401).json({ error: 'Token expired and refresh failed — re-authenticate' });
    }
    
    console.error('Jira search failed:', error);
    const detail = axios.isAxiosError(error) ? error.response?.data : String(error);
    res.status(500).json({ error: 'Failed to search Jira', detail });
  }
}
