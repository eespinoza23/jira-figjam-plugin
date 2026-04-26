import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const accessToken = req.cookies.access_token;
  const instance = req.cookies.jira_instance;

  if (accessToken && instance) {
    res.json({ authenticated: true, instance });
  } else {
    res.json({ authenticated: false });
  }
}
