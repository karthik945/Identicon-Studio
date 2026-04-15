import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// Solacon-style: concentric geometric shapes derived from hash
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('sha256').update(seed).digest('hex');
  let svg = buildSolacon(hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

function buildSolacon(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const cx = size / 2, cy = size / 2;

  const hue1 = (bytes[0] * 360 / 255).toFixed(1);
  const hue2 = ((bytes[0] * 360 / 255 + 180) % 360).toFixed(1);
  const sat  = (50 + bytes[1] * 50 / 255).toFixed(1);

  const shapes = [];
  const layers = 5;

  for (let i = 0; i < layers; i++) {
    const r = (size * 0.45) * (1 - i / layers);
    const sides = 3 + (bytes[2 + i] % 5); // 3–7 sides
    const rotation = (bytes[7 + i] / 255) * 360;
    const hue = i % 2 === 0 ? hue1 : hue2;
    const l = (40 + i * 8).toFixed(1);
    const fill = `hsl(${hue},${sat}%,${l}%)`;

    const pts = polygon(cx, cy, r, sides, rotation);
    shapes.push(`<polygon points="${pts}" fill="${fill}" opacity="0.85" />`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${cx}" cy="${cy}" r="${cx}" fill="hsl(${hue1},${sat}%,15%)" />` +
    shapes.join('') +
    `</svg>`;
}

function polygon(cx, cy, r, sides, rotationDeg) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i / sides) - (Math.PI / 2) + (rotationDeg * Math.PI / 180);
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}
