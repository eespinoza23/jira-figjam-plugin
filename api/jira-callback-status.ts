import { VercelRequest, VercelResponse } from '@vercel/node';
import { redisGet, redisDel } from './_redis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionId = req.query.sessionId as string;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const raw = await redisGet(`token:${sessionId}`);
  if (!raw) return res.json({ ready: false });

  await redisDel(`token:${sessionId}`);
  return res.json({ ready: true, tokens: JSON.parse(raw) });
}
