import { createHash } from 'crypto';

// Wavatars — proxies to gravatar wavatars service
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256' } = req.query;
  const sz = Math.min(parseInt(size, 10) || 256, 512);
  const hash = createHash('md5').update(seed.trim().toLowerCase()).digest('hex');

  const url = `https://www.gravatar.com/avatar/${hash}?d=wavatar&s=${sz}&r=pg&f=y`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const buffer = await upstream.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch Wavatars', detail: err.message });
  }
}
