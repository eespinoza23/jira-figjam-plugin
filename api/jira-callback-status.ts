import { VercelRequest, VercelResponse } from '@vercel/node';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL!;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
const TTL = 300; // 5 minutes

async function redisSet(key: string, value: string) {
  const res = await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?ex=${TTL}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Redis SET failed: ${res.status}`);
}

async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

async function redisDel(key: string) {
  await fetch(`${UPSTASH_URL}/del/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  }).catch(() => {});
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  // POST: store tokens from callback
  if (req.method === 'POST') {
    const { sessionId, accessToken, refreshToken, instance, expiresIn } = req.body;
    if (!sessionId || !accessToken) return res.status(400).json({ error: 'Missing params' });

    await redisSet(`token:${sessionId}`, JSON.stringify({ accessToken, refreshToken, instance, expiresIn }));
    return res.json({ ok: true });
  }

  // GET: poll for tokens
  if (req.method === 'GET') {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const raw = await redisGet(`token:${sessionId}`);
    if (!raw) return res.json({ ready: false });

    await redisDel(`token:${sessionId}`); // one-time retrieval
    return res.json({ ready: true, tokens: JSON.parse(raw) });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
