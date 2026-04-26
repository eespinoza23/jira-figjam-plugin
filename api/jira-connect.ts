import { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';

function verifyCode(code: string): { a: string; r: string; i: string; x: number; e: number } | null {
  try {
    const [data, sig] = code.split('.');
    if (!data || !sig) return null;
    const secret = process['env']['ATLASSIAN_CLIENT_SECRET'];
    if (!secret) throw new Error('ATLASSIAN_CLIENT_SECRET not set');
    const expected = createHmac('sha256', secret).update(data).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (Date.now() > payload.x) return null;
    return payload;
  } catch {
    return null;
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.json({ authenticated: !!req.cookies.access_token, instance: req.cookies.jira_instance || null });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body as { code: string };
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const payload = verifyCode(code.trim());
  if (!payload) return res.status(400).json({ error: 'Invalid or expired code' });

  res.setHeader('Set-Cookie', [
    `access_token=${payload.a}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${payload.e}`,
    `refresh_token=${payload.r}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`,
    `jira_instance=${payload.i}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`,
  ]);

  res.json({ ok: true, instance: payload.i, access_token: payload.a, refresh_token: payload.r });
}
