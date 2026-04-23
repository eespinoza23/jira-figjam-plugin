import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expired = 'Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
  res.setHeader('Set-Cookie', [
    `access_token=; ${expired}`,
    `refresh_token=; ${expired}`,
    `cloud_id=; ${expired}`,
    `jira_instance=; ${expired}`,
    `oauth_state=; ${expired}`,
  ]);
  res.json({ success: true });
}
