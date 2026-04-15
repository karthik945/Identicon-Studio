import { remapSvgColors } from '../lib/colorRemap.js';

// Pure-JS Jazzicon implementation (no DOM/canvas required)
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const numericSeed = stringToSeed(seed);
  let svg = generateJazzicon(numericSeed, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

const COLORS = [
  '#01888C','#FC7500','#034F5D','#F73F01','#FC1960',
  '#C7144C','#F3C100','#1598F2','#2465E1','#F19E02',
];

function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateJazzicon(seed, size) {
  const rng = mulberry32(seed);
  const colors = [...COLORS].sort(() => rng() - 0.5);
  const numShapes = 4;
  const half = size / 2;

  const shapes = [];
  for (let i = 0; i < numShapes; i++) {
    const center = size / 2;
    const diameter = size;
    const fill = colors[i % colors.length];
    const type = Math.floor(rng() * 3);

    if (type === 0) {
      // Rectangle
      const x = (rng() - 0.5) * size;
      const y = (rng() - 0.5) * size;
      const w = diameter * (0.3 + rng() * 0.4);
      const h = diameter * (0.3 + rng() * 0.4);
      shapes.push(`<rect x="${center + x - w/2}" y="${center + y - h/2}" width="${w}" height="${h}" fill="${fill}" />`);
    } else if (type === 1) {
      // Circle
      const cx = (rng() - 0.5) * size + center;
      const cy = (rng() - 0.5) * size + center;
      const r = diameter * (0.15 + rng() * 0.25);
      shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`);
    } else {
      // Triangle
      const pts = Array.from({length: 3}, () =>
        `${((rng() - 0.5) * size + center).toFixed(1)},${((rng() - 0.5) * size + center).toFixed(1)}`
      ).join(' ');
      shapes.push(`<polygon points="${pts}" fill="${fill}" />`);
    }
  }

  const bg = colors[numShapes % colors.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="${bg}" />` +
    `<clipPath id="c"><circle cx="${half}" cy="${half}" r="${half}" /></clipPath>` +
    `<g clip-path="url(#c)">${shapes.join('')}</g>` +
    `</svg>`;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
