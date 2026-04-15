import { remapSvgColors } from '../lib/colorRemap.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;
  // Deterministic pure-JS blockies (no canvas dependency)
  const colors = generateBlockiesColors(seed.toLowerCase());
  const grid = generateBlockiesGrid(seed.toLowerCase());
  const cellSize = sz / 8;

  const rects = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const idx = y * 8 + x;
      const color = grid[idx] === 1 ? colors.color : grid[idx] === 2 ? colors.spotColor : colors.bgColor;
      rects.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}" />`);
    }
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}">${rects.join('')}</svg>`;
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

// Deterministic blockies color + grid generation (pure JS, no canvas needed)
function hsl(h, s, l) {
  return `hsl(${Math.round(h * 360)},${Math.round(s * 100)}%,${Math.round(l * 100)}%)`;
}

function generateBlockiesColors(seed) {
  const rng = buildRng(seed);
  const h1 = rng(), s1 = rng() * 0.6 + 0.4, l1 = (rng() + rng() + rng() + rng()) * 0.25;
  const h2 = (h1 + 0.5 + rng() * 0.1 - 0.05) % 1;
  return {
    color:      hsl(h1, s1, l1),
    bgColor:    hsl(h1, s1, l1 * 0.6 + 0.2),
    spotColor:  hsl(h2, s1, l1),
  };
}

function generateBlockiesGrid(seed) {
  const rng = buildRng(seed);
  // consume the color values
  rng(); rng(); rng(); rng(); rng(); rng(); rng(); rng();
  const grid = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const v = Math.floor(rng() * 2.3);
      grid[y * 8 + x] = v;
      grid[y * 8 + (7 - x)] = v; // mirror
    }
  }
  return grid;
}

function buildRng(seed) {
  const randseed = new Uint32Array(4);
  for (let i = 0; i < seed.length; i++) {
    randseed[i % 4] = ((randseed[i % 4] << 5) - randseed[i % 4]) + seed.charCodeAt(i);
  }
  return function () {
    const t = randseed[0] ^ (randseed[0] << 11);
    randseed[0] = randseed[1];
    randseed[1] = randseed[2];
    randseed[2] = randseed[3];
    randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);
    return (randseed[3] >>> 0) / ((1 << 31) >>> 0);
  };
}
