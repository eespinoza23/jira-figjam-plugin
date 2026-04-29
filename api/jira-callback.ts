import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const validateInstance = (i: string) => /^[a-z0-9-]+\.atlassian\.net$/.test(i.toLowerCase());

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state } = req.query;
  const rawInstance = req.cookies.jira_instance || process['env']['JIRA_INSTANCE_URL'] || '';

  if (!validateInstance(rawInstance)) return res.status(400).json({ error: 'Invalid Jira instance' });
  if (state !== req.cookies.oauth_state) return res.status(400).json({ error: 'State mismatch' });
  if (!code) return res.status(400).json({ error: 'No auth code' });

  try {
    const appUrl = process['env']['APP_URL'] || process['env']['VERCEL_PROJECT_PRODUCTION_URL'] || process['env']['VERCEL_URL'];
    const tok = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process['env']['ATLASSIAN_CLIENT_ID'],
      client_secret: process['env']['ATLASSIAN_CLIENT_SECRET'],
      code,
      redirect_uri: `https://${appUrl}/api/jira-callback`,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Connecting…</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}.card{background:white;border-radius:12px;padding:32px;max-width:500px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,.1);text-align:center}h2{color:#16a34a;margin:0 0 8px}p{color:#4b5563;margin:0}spinner{display:inline-block;width:20px;height:20px;border:3px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:spin .6s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.hint{font-size:12px;color:#9ca3af;margin-top:12px}</style>
</head><body><div class="card">
<h2><spinner></spinner></h2>
<p>Connecting to Jira…</p>
<p class="hint">You can close this window. The plugin will update automatically.</p>
</div>
<script>
if (window.opener) {
  window.opener.postMessage({
    type: 'jira-auth-callback',
    data: {
      accessToken: '${tok.data.access_token}',
      refreshToken: '${tok.data.refresh_token}',
      instance: '${rawInstance.toLowerCase()}',
      expiresIn: ${tok.data.expires_in}
    }
  }, '*');
  setTimeout(() => { window.close(); }, 1500);
} else {
  document.querySelector('p').textContent = 'Connected! You can close this window.';
  document.querySelector('.hint').textContent = 'Return to FigJam — the plugin will detect the connection.';
}
</script>
</body></html>`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Token exchange failed:', msg);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
}
