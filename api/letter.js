import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// Letter Avatar — first character(s) of seed on colored background
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('md5').update(seed).digest('hex');
  let svg = buildLetterAvatar(seed, hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

function buildLetterAvatar(seed, hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const hue = (bytes[0] * 360 / 255).toFixed(1);
  const sat = (50 + bytes[1] * 30 / 255).toFixed(1);
  const bg  = `hsl(${hue},${sat}%,45%)`;
  const fg  = `hsl(${hue},${sat}%,95%)`;

  // Get up to 2 initials
  const clean = seed.trim().replace(/[^a-zA-Z0-9]/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  let letters;
  if (parts.length >= 2) {
    letters = (parts[0][0] + parts[1][0]).toUpperCase();
  } else {
    letters = clean.slice(0, 2).toUpperCase();
  }
  if (!letters) letters = '?';

  const fontSize = size * (letters.length === 1 ? 0.48 : 0.38);
  const cx = size / 2, cy = size / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${cx}" cy="${cy}" r="${cx}" fill="${bg}" />` +
    `<text x="${cx}" y="${cy}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize.toFixed(1)}" ` +
    `font-weight="bold" fill="${fg}" text-anchor="middle" dominant-baseline="central">${letters}</text>` +
    `</svg>`;
}
