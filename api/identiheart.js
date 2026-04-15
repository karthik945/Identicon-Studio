import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// IdentiHeart-style: geometric heart/diamond shapes from hash
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('sha256').update(seed).digest('hex');
  let svg = buildIdentiHeart(hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

function buildIdentiHeart(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const hue = (bytes[0] * 360 / 255).toFixed(1);
  const sat = (50 + bytes[1] * 40 / 255).toFixed(1);
  const bg  = `hsl(${hue},${sat}%,92%)`;
  const c1  = `hsl(${hue},${sat}%,45%)`;
  const c2  = `hsl(${((+hue + 30) % 360).toFixed(1)},${sat}%,60%)`;
  const c3  = `hsl(${((+hue + 60) % 360).toFixed(1)},${sat}%,35%)`;

  const shapes = [];
  const grid = 4;
  const cell = size / grid;

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const bi = (row * grid + col + 2) % bytes.length;
      const val = bytes[bi];
      if (val < 80) continue;

      const x = col * cell + cell / 2;
      const y = row * cell + cell / 2;
      const r = cell * 0.4;
      const color = val < 140 ? c1 : val < 200 ? c2 : c3;
      const type = val % 3;

      if (type === 0) {
        shapes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" />`);
      } else if (type === 1) {
        const pts = `${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}`;
        shapes.push(`<polygon points="${pts}" fill="${color}" />`);
      } else {
        shapes.push(`<rect x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" fill="${color}" rx="${r*0.2}" />`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="${bg}" />` +
    shapes.join('') +
    `</svg>`;
}
