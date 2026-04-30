import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory cache for callback tokens (expires after 10 minutes)
interface CallbackCache {
  [sessionId: string]: {
    tokens: any;
    expiresAt: number;
  };
}

const callbackCache: CallbackCache = {};

// Clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(callbackCache).forEach(key => {
    if (callbackCache[key].expiresAt < now) {
      delete callbackCache[key];
    }
  });
}, 5 * 60 * 1000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: Store tokens from callback
  if (req.method === 'POST') {
    const { sessionId, accessToken, refreshToken, instance, expiresIn } = req.body;
    if (!sessionId || !accessToken) return res.status(400).json({ error: 'Missing params' });

    callbackCache[sessionId] = {
      tokens: { accessToken, refreshToken, instance, expiresIn },
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    return res.json({ ok: true });
  }

  // GET: Check if tokens are ready
  if (req.method === 'GET') {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const entry = callbackCache[sessionId];
    if (entry && entry.expiresAt > Date.now()) {
      delete callbackCache[sessionId]; // One-time retrieval
      return res.json({ ready: true, tokens: entry.tokens });
    }
    return res.json({ ready: false });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
