import { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';

const validateInstance = (instance: string): boolean => {
  return /^[a-z0-9-]+\.atlassian\.net$/.test(instance.toLowerCase());
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  const instanceParam = req.query.instance as string;

  // Validate instance parameter if provided
  if (instanceParam && !validateInstance(instanceParam)) {
    return res.status(400).json({ error: 'Invalid Jira instance URL' });
  }

  const cleanInstance = instanceParam ? instanceParam.toLowerCase() : process.env.JIRA_INSTANCE_URL;
  const baseUrl = `https://${cleanInstance}`;
  const vercelUrl = process.env.VERCEL_URL;
  const redirectUri = `https://${vercelUrl}/api/jira-callback`;
  const scope = 'read:jira-work write:jira-work offline_access';
  const state = randomBytes(16).toString('hex');

  // Store both state and instance in HttpOnly cookies
  res.setHeader('Set-Cookie', [
    `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    `jira_instance=${cleanInstance}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  ]);

  const authUrl = `${baseUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;

  res.redirect(authUrl);
}
