import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  const baseUrl = process.env.JIRA_INSTANCE_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const redirectUri = `https://${vercelUrl}/api/jira-callback`;
  const scope = 'read:jira-work write:jira-work offline_access';
  const state = Math.random().toString(36).substring(7);

  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  const authUrl = `${baseUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;

  res.redirect(authUrl);
}
