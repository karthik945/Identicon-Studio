import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// Hexicon-style: honeycomb hex grid with per-cell colors from hash
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('sha256').update(seed).digest('hex');
  let svg = buildHexicon(hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

function buildHexicon(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const baseHue = bytes[0] * 360 / 255;
  const sat = 50 + bytes[1] * 50 / 255;
  const cx = size / 2, cy = size / 2;
  const hexR = size / 8; // hex cell radius

  // Hex grid offsets (ring layout)
  const positions = hexRingPositions(cx, cy, hexR);
  const hexes = [];

  positions.forEach((pos, i) => {
    const byte = bytes[(i + 2) % bytes.length];
    const active = byte > 80;
    const hue = (baseHue + (byte / 255) * 60) % 360;
    const l = 35 + (byte / 255) * 30;
    const fill = active ? `hsl(${hue.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%)` : `hsl(${hue.toFixed(1)},20%,85%)`;
    hexes.push(hexPath(pos.x, pos.y, hexR * 0.92, fill));
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="hsl(${baseHue.toFixed(1)},${sat.toFixed(1)}%,95%)" />` +
    hexes.join('') +
    `</svg>`;
}

function hexRingPositions(cx, cy, r) {
  const positions = [{ x: cx, y: cy }];
  const spacing = r * 1.75;
  const dirs = [
    [1, 0], [0.5, 0.866], [-0.5, 0.866],
    [-1, 0], [-0.5, -0.866], [0.5, -0.866],
  ];
  // Ring 1
  for (let d = 0; d < 6; d++) {
    const [dx, dy] = dirs[d];
    positions.push({ x: cx + dx * spacing, y: cy + dy * spacing });
  }
  // Ring 2 partial
  for (let d = 0; d < 6; d++) {
    const [dx, dy] = dirs[d];
    const [nx, ny] = dirs[(d + 2) % 6];
    positions.push({ x: cx + dx * spacing * 2, y: cy + dy * spacing * 2 });
    positions.push({ x: cx + dx * spacing * 2 + nx * spacing, y: cy + dy * spacing * 2 + ny * spacing });
  }
  return positions;
}

function hexPath(cx, cy, r, fill) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" />`;
}
