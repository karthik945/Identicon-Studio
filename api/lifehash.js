import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// LifeHash-style: Conway's Game of Life cellular automata pattern as colored grid
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('sha256').update(seed).digest('hex');
  let svg = buildLifeHash(hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

const GRID = 16;

function buildLifeHash(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const baseHue = bytes[0] * 360 / 255;
  const sat = 55 + bytes[1] * 35 / 255;

  // Seed the grid from hash bytes
  let cells = Array.from({ length: GRID * GRID }, (_, i) => {
    const byte = bytes[Math.floor(i / 8) % bytes.length];
    return (byte >> (i % 8)) & 1;
  });

  // Run 5 generations of Game of Life
  for (let g = 0; g < 5; g++) {
    cells = step(cells);
  }

  // Count generation for color intensity
  const alive = cells.filter(Boolean).length;
  const cell = size / GRID;
  const rects = [];

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (cells[row * GRID + col]) {
        const hue = (baseHue + (row * col / (GRID * GRID)) * 60) % 360;
        const l = 35 + ((row + col) / (GRID * 2)) * 25;
        rects.push(
          `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" ` +
          `fill="hsl(${hue.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%)" />`
        );
      }
    }
  }

  const bg = `hsl(${baseHue.toFixed(1)},${(sat * 0.3).toFixed(1)}%,92%)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="${bg}" />` +
    rects.join('') +
    `</svg>`;
}

function step(cells) {
  const next = new Array(GRID * GRID).fill(0);
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      let neighbors = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = (row + dr + GRID) % GRID;
          const c = (col + dc + GRID) % GRID;
          neighbors += cells[r * GRID + c];
        }
      }
      const alive = cells[row * GRID + col];
      next[row * GRID + col] = alive
        ? (neighbors === 2 || neighbors === 3 ? 1 : 0)
        : (neighbors === 3 ? 1 : 0);
    }
  }
  return next;
}
