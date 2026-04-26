import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const validateInstance = (instance: string): boolean => {
  return /^[a-z0-9-]+\.atlassian\.net$/.test(instance.toLowerCase());
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;
  const storedState = req.cookies.oauth_state;
  const rawInstance = req.cookies.jira_instance || process.env.JIRA_INSTANCE_URL || '';

  if (!validateInstance(rawInstance)) {
    console.error('Invalid Jira instance in cookie:', rawInstance);
    return res.status(400).json({ error: 'Invalid Jira instance configuration' });
  }

  const instanceUrl = rawInstance.toLowerCase();

  if (state !== storedState) {
    return res.status(400).json({ error: 'State mismatch — CSRF attack detected' });
  }

  if (!code) {
    return res.status(400).json({ error: 'No auth code received' });
  }

  try {
    // Atlassian token endpoint is always auth.atlassian.com regardless of instance
    const appUrl = process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    const tokenResponse = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      code,
      redirect_uri: `https://${appUrl}/api/jira-callback`,
    });

    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token;

    res.setHeader('Set-Cookie', [
      `access_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${tokenResponse.data.expires_in}`,
      `refresh_token=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`,
    ]);

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><head><title>Connected</title></head><body>
<script>
  if (window.opener) {
    window.opener.postMessage('jira-auth-success', '*');
    window.close();
  } else {
    window.location.href = '/';
  }
</script>
<p>Connected! You can close this window.</p>
</body></html>`);
  } catch (error) {
    console.error('OAuth token exchange failed:', error);
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
}
