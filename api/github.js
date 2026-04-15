import Identicon from 'identicon.js';
import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  // identicon.js requires a 15+ char hex hash
  const hash = createHash('md5').update(seed).digest('hex');

  const options = {
    size: sz,
    format: 'svg',
    margin: 0.1,
  };

  const data = new Identicon(hash, options).toString();
  // returns base64-encoded SVG
  let svg = Buffer.from(data, 'base64').toString('utf-8');
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}
