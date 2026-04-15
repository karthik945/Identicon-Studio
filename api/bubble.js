import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// Bubble Identicon — overlapping translucent circles derived from hash
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('sha256').update(seed).digest('hex');
  let svg = buildBubble(hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

function buildBubble(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const baseHue = bytes[0] * 360 / 255;
  const sat = 55 + bytes[1] * 35 / 255;
  const bubbleCount = 8 + (bytes[2] % 6);

  const circles = [];
  for (let i = 0; i < bubbleCount; i++) {
    const bi = (i * 3 + 3) % bytes.length;
    const cx = (bytes[bi] / 255) * size;
    const cy = (bytes[(bi + 1) % bytes.length] / 255) * size;
    const r  = size * (0.08 + (bytes[(bi + 2) % bytes.length] / 255) * 0.22);
    const hue = (baseHue + i * 30) % 360;
    const l   = 45 + (bytes[(bi + 3) % bytes.length] / 255) * 25;
    circles.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" ` +
      `fill="hsl(${hue.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%)" opacity="0.72" />`
    );
  }

  const bg = `hsl(${baseHue.toFixed(1)},${sat.toFixed(1)}%,92%)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="${bg}" />` +
    circles.join('') +
    `</svg>`;
}
