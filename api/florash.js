import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// Florash-style: flower/petal radial patterns from hash
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('sha256').update(seed).digest('hex');
  let svg = buildFlorash(hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

function buildFlorash(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const cx = size / 2, cy = size / 2;
  const baseHue = bytes[0] * 360 / 255;
  const sat = 55 + bytes[1] * 35 / 255;
  const petalCount = 5 + (bytes[2] % 4); // 5–8 petals
  const layers = 3;

  const shapes = [];

  for (let layer = layers; layer >= 0; layer--) {
    const r = (size * 0.45) * (0.3 + (layer / layers) * 0.7);
    const hue = (baseHue + layer * 25) % 360;
    const l = 40 + layer * 10;

    for (let p = 0; p < petalCount; p++) {
      const angle = (Math.PI * 2 * p / petalCount) + (bytes[3 + layer] / 255) * Math.PI;
      const px = cx + Math.cos(angle) * r * 0.55;
      const py = cy + Math.sin(angle) * r * 0.55;
      shapes.push(
        `<ellipse cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" ` +
        `rx="${(r * 0.4).toFixed(2)}" ry="${(r * 0.22).toFixed(2)}" ` +
        `fill="hsl(${hue.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%)" ` +
        `transform="rotate(${((angle * 180 / Math.PI) + 90).toFixed(1)},${px.toFixed(2)},${py.toFixed(2)})" ` +
        `opacity="0.88" />`
      );
    }
  }

  // Center circle
  const centerHue = (baseHue + 180) % 360;
  shapes.push(`<circle cx="${cx}" cy="${cy}" r="${(size * 0.12).toFixed(2)}" fill="hsl(${centerHue.toFixed(1)},${sat.toFixed(1)}%,55%)" />`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${cx}" cy="${cy}" r="${cx}" fill="hsl(${baseHue.toFixed(1)},${sat.toFixed(1)}%,92%)" />` +
    shapes.join('') +
    `</svg>`;
}
