import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// Pure-JS HashIcon — geometric hash-based icon (inspired by hashicon package)
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('sha256').update(seed).digest('hex');
  let svg = buildHashicon(hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

function buildHashicon(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const hue = (bytes[0] * 360 / 255).toFixed(1);
  const sat = (40 + bytes[1] * 60 / 255).toFixed(1);
  const bgL  = (80 + bytes[2] * 15 / 255).toFixed(1);
  const fgL  = (20 + bytes[3] * 30 / 255).toFixed(1);
  const bg   = `hsl(${hue},${sat}%,${bgL}%)`;
  const fg   = `hsl(${hue},${sat}%,${fgL}%)`;

  // 5×5 symmetric grid
  const grid = [];
  let bi = 4;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      grid[row * 5 + col] = (bytes[bi++] & 1) === 1;
      grid[row * 5 + (4 - col)] = grid[row * 5 + col];
    }
  }

  const cell = size / 5;
  const rects = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row * 5 + col]) {
        rects.push(`<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="${fg}" />`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="${bg}" />` +
    rects.join('') +
    `</svg>`;
}
