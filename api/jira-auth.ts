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
  const sessionId = req.query.sessionId as string;

  if (instanceParam && !validateInstance(instanceParam)) {
    return res.status(400).json({ error: 'Invalid Jira instance URL' });
  }

  const cleanInstance = instanceParam ? instanceParam.toLowerCase() : process.env.JIRA_INSTANCE_URL;
  // APP_URL is stable; VERCEL_PROJECT_PRODUCTION_URL is set by Vercel for prod; VERCEL_URL is per-deployment
  const appUrl = process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const redirectUri = `https://${appUrl}/api/jira-callback`;
  const scope = 'read:me read:jira-work write:jira-work read:jira-user offline_access';
  // Encode sessionId in state for retrieval in callback
  const stateRandom = randomBytes(16).toString('hex');
  const state = sessionId ? `${sessionId}:${stateRandom}` : stateRandom;

  res.setHeader('Set-Cookie', [
    `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600`,
    `jira_instance=${cleanInstance}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600`,
  ]);

  // Atlassian OAuth 2.0 (3LO) uses auth.atlassian.com, NOT the instance URL
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&prompt=consent`;

  res.redirect(authUrl);
}
