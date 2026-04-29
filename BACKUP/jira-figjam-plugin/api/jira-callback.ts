import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { createHmac } from 'crypto';

const validateInstance = (i: string) => /^[a-z0-9-]+\.atlassian\.net$/.test(i.toLowerCase());

function makeCode(payload: object): string {
  const secret = process['env']['ATLASSIAN_CLIENT_SECRET'];
  if (!secret) throw new Error('ATLASSIAN_CLIENT_SECRET not set');
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

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

    const verifyCode = makeCode({
      a: tok.data.access_token,
      r: tok.data.refresh_token,
      i: rawInstance.toLowerCase(),
      x: Date.now() + 300000,
      e: tok.data.expires_in,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Connected</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}.card{background:white;border-radius:12px;padding:32px;max-width:500px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,.1);text-align:center}h2{color:#16a34a;margin:0 0 8px}p{color:#4b5563;margin:0 0 20px}.code-box{background:#f9fafb;border:2px solid #e5e7eb;border-radius:8px;padding:16px;font-family:monospace;font-size:11px;word-break:break-all;color:#111827;margin:0 0 16px;text-align:left}button{background:#2563eb;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer;font-weight:600}.hint{font-size:12px;color:#9ca3af;margin-top:12px}</style>
</head><body><div class="card">
<h2>&#10003; Connected to Jira!</h2>
<p>Copy this code and paste it into the FigJam plugin.</p>
<div class="code-box" id="vc">${verifyCode}</div>
<button onclick="navigator.clipboard.writeText(document.getElementById('vc').textContent).then(()=>this.textContent='&#10003; Copied!')">Copy Code</button>
<p class="hint">Expires in 5 minutes. Return to FigJam and paste it there.</p>
</div></body></html>`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Token exchange failed:', msg);
    res.status(500).json({ error: `Token exchange failed: ${msg}` });
  }
}
