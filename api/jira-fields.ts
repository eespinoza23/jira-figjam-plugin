import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getCloudId } from './_atlassian';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = req.cookies.access_token;
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const cloudId = req.cookies.cloud_id || await getCloudId(accessToken);
    const response = await axios.get(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/field`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const storyPointsField = response.data.find((f: { name: string; id: string }) =>
      f.name.toLowerCase().includes('story point') ||
      f.name.toLowerCase().includes('story_point') ||
      f.name.toLowerCase() === 'points'
    );

    res.json({
      storyPointsFieldId: storyPointsField?.id || null,
      storyPointsFieldName: storyPointsField?.name || null,
      allFields: response.data.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })),
    });
  } catch (error) {
    const detail = axios.isAxiosError(error) ? error.response?.data : String(error);
    res.status(500).json({ error: 'Failed to fetch fields', detail });
  }
}
