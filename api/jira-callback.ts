import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import crypto from 'crypto';
import { redisSet } from './_redis';

const validateInstance = (i: string) => /^[a-z0-9-]+\.atlassian\.net$/.test(i.toLowerCase());

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state } = req.query;
  const rawInstance = req.cookies.jira_instance || process['env']['JIRA_INSTANCE_URL'] || '';

  if (!validateInstance(rawInstance)) return res.status(400).json({ error: 'Invalid Jira instance' });
  if (state !== req.cookies.oauth_state) return res.status(400).json({ error: 'State mismatch' });
  if (!code) return res.status(400).json({ error: 'No auth code' });

  // Extract sessionId from state (format: "sessionId:randomBytes" or just "randomBytes")
  const sessionId = typeof state === 'string' && state.includes(':') ? state.split(':')[0] : null;

  try {
    const appUrl = process['env']['APP_URL'] || process['env']['VERCEL_PROJECT_PRODUCTION_URL'] || process['env']['VERCEL_URL'];
    const tok = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process['env']['ATLASSIAN_CLIENT_ID'],
      client_secret: process['env']['ATLASSIAN_CLIENT_SECRET'],
      code,
      redirect_uri: `https://${appUrl}/api/jira-callback`,
    });

    let redisOk = false;
    let redisError = '';
    if (sessionId) {
      const tokenData = JSON.stringify({
        accessToken: tok.data.access_token,
        refreshToken: tok.data.refresh_token,
        instance: rawInstance.toLowerCase(),
        expiresIn: tok.data.expires_in,
      });
      try {
        await redisSet(`token:${sessionId}`, tokenData);
        redisOk = true;
      } catch (e: any) {
        redisError = e.message || String(e);
        console.error('Redis write failed:', redisError);
      }
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Connected</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}.card{background:white;border-radius:12px;padding:32px;max-width:500px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,.1);text-align:center}h2{color:#16a34a;margin:0 0 8px}p{color:#4b5563;margin:0}.hint{font-size:12px;color:#9ca3af;margin-top:12px}</style>
<script>window.onload=function(){setTimeout(function(){window.close()},1500)};</script>
</head><body><div class="card">
<h2>✓</h2>
<p>Connected to Jira!</p>
<p class="hint">This window will close automatically.</p>
</div>
</body></html>`);
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Token exchange failed:', msg, err?.response?.data);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
}
