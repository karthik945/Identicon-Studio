import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// Gradient Avatar — radial/linear gradient avatar from seed
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('sha256').update(seed).digest('hex');
  let svg = buildGradientAvatar(hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

function buildGradientAvatar(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const h1 = (bytes[0] * 360 / 255).toFixed(1);
  const h2 = ((bytes[0] * 360 / 255 + 120 + bytes[1] * 60 / 255) % 360).toFixed(1);
  const h3 = ((bytes[0] * 360 / 255 + 240 + bytes[2] * 60 / 255) % 360).toFixed(1);
  const s  = (60 + bytes[3] * 30 / 255).toFixed(1);
  const angle = ((bytes[4] / 255) * 360).toFixed(1);
  const cx = (size * 0.3 + (bytes[5] / 255) * size * 0.4).toFixed(1);
  const cy = (size * 0.3 + (bytes[6] / 255) * size * 0.4).toFixed(1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle},0.5,0.5)">
      <stop offset="0%"   stop-color="hsl(${h1},${s}%,55%)" />
      <stop offset="50%"  stop-color="hsl(${h2},${s}%,50%)" />
      <stop offset="100%" stop-color="hsl(${h3},${s}%,45%)" />
    </linearGradient>
    <radialGradient id="g2" cx="${cx}" cy="${cy}" r="60%" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="hsl(${h2},${s}%,75%)" stop-opacity="0.6" />
      <stop offset="100%" stop-color="hsl(${h1},${s}%,30%)" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g1)" />
  <rect width="${size}" height="${size}" fill="url(#g2)" />
</svg>`;
}
