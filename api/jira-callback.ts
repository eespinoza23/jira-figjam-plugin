import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;
  const storedState = req.cookies.oauth_state;

  if (state !== storedState) {
    return res.status(400).json({ error: 'State mismatch — CSRF attack detected' });
  }

  if (!code) {
    return res.status(400).json({ error: 'No auth code received' });
  }

  try {
    const tokenResponse = await axios.post(`${process.env.JIRA_INSTANCE_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      code,
      redirect_uri: `https://${process.env.VERCEL_URL}/api/jira-callback`,
    });

    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token;

    res.setHeader('Set-Cookie', [
      `access_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${tokenResponse.data.expires_in}`,
      `refresh_token=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    ]);

    res.redirect('/plugin');
  } catch (error) {
    console.error('OAuth token exchange failed:', error);
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
}
