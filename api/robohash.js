import { createHash } from 'crypto';

// RoboHash — proxies to robohash.org public API
// (self-hosting requires the full image set download; proxy is standard practice)
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', set = '1' } = req.query;
  const sz = parseInt(size, 10) || 256;
  const hash = createHash('md5').update(seed).digest('hex');

  const url = `https://robohash.org/${encodeURIComponent(hash)}.png?size=${sz}x${sz}&set=set${set}`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const buffer = await upstream.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch from robohash.org', detail: err.message });
  }
}
