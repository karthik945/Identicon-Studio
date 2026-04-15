import { createHash } from 'crypto';
import { remapSvgColors } from '../lib/colorRemap.js';

// Pictogrify-style: simple pictogram icons derived from hash (face/animal features)
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  const hash = createHash('sha256').update(seed).digest('hex');
  let svg = buildPictogrify(hash, sz);
  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}

function buildPictogrify(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const cx = size / 2, cy = size / 2;
  const hue = (bytes[0] * 360 / 255).toFixed(1);
  const sat = (50 + bytes[1] * 40 / 255).toFixed(1);
  const bg  = `hsl(${hue},${sat}%,88%)`;
  const skin = `hsl(${hue},${sat}%,72%)`;
  const dark = `hsl(${hue},${sat}%,25%)`;
  const accent = `hsl(${((+hue + 180) % 360).toFixed(1)},${sat}%,50%)`;

  const faceR = size * 0.36;
  const eyeOffset = faceR * 0.35;
  const eyeR = faceR * 0.12;

  // Eye style from hash
  const eyeStyle = bytes[2] % 3;
  let leftEye, rightEye;
  if (eyeStyle === 0) {
    leftEye  = `<circle cx="${(cx - eyeOffset).toFixed(1)}" cy="${(cy - faceR * 0.1).toFixed(1)}" r="${eyeR}" fill="${dark}" />`;
    rightEye = `<circle cx="${(cx + eyeOffset).toFixed(1)}" cy="${(cy - faceR * 0.1).toFixed(1)}" r="${eyeR}" fill="${dark}" />`;
  } else if (eyeStyle === 1) {
    const ey = (cy - faceR * 0.1).toFixed(1);
    leftEye  = `<ellipse cx="${(cx - eyeOffset).toFixed(1)}" cy="${ey}" rx="${eyeR * 1.3}" ry="${eyeR * 0.7}" fill="${dark}" />`;
    rightEye = `<ellipse cx="${(cx + eyeOffset).toFixed(1)}" cy="${ey}" rx="${eyeR * 1.3}" ry="${eyeR * 0.7}" fill="${dark}" />`;
  } else {
    const ey = cy - faceR * 0.1;
    leftEye  = `<rect x="${(cx - eyeOffset - eyeR).toFixed(1)}" y="${(ey - eyeR).toFixed(1)}" width="${(eyeR*2).toFixed(1)}" height="${(eyeR*2).toFixed(1)}" fill="${dark}" />`;
    rightEye = `<rect x="${(cx + eyeOffset - eyeR).toFixed(1)}" y="${(ey - eyeR).toFixed(1)}" width="${(eyeR*2).toFixed(1)}" height="${(eyeR*2).toFixed(1)}" fill="${dark}" />`;
  }

  // Mouth style from hash
  const mouthY = cy + faceR * 0.3;
  const mouthStyle = bytes[3] % 3;
  let mouth;
  if (mouthStyle === 0) {
    // Smile arc
    mouth = `<path d="M ${(cx - faceR * 0.3).toFixed(1)} ${mouthY.toFixed(1)} Q ${cx} ${(mouthY + faceR * 0.25).toFixed(1)} ${(cx + faceR * 0.3).toFixed(1)} ${mouthY.toFixed(1)}" stroke="${dark}" stroke-width="${(size * 0.025).toFixed(1)}" fill="none" stroke-linecap="round" />`;
  } else if (mouthStyle === 1) {
    // Straight line
    mouth = `<line x1="${(cx - faceR * 0.3).toFixed(1)}" y1="${mouthY.toFixed(1)}" x2="${(cx + faceR * 0.3).toFixed(1)}" y2="${mouthY.toFixed(1)}" stroke="${dark}" stroke-width="${(size * 0.025).toFixed(1)}" stroke-linecap="round" />`;
  } else {
    // Frown
    mouth = `<path d="M ${(cx - faceR * 0.3).toFixed(1)} ${mouthY.toFixed(1)} Q ${cx} ${(mouthY - faceR * 0.2).toFixed(1)} ${(cx + faceR * 0.3).toFixed(1)} ${mouthY.toFixed(1)}" stroke="${dark}" stroke-width="${(size * 0.025).toFixed(1)}" fill="none" stroke-linecap="round" />`;
  }

  // Optional: hair/hat
  const feature = bytes[4] % 3;
  let topFeature = '';
  if (feature === 0) {
    topFeature = `<ellipse cx="${cx}" cy="${(cy - faceR * 0.92).toFixed(1)}" rx="${(faceR * 0.85).toFixed(1)}" ry="${(faceR * 0.35).toFixed(1)}" fill="${accent}" />`;
  } else if (feature === 1) {
    topFeature = `<rect x="${(cx - faceR * 0.55).toFixed(1)}" y="${(cy - faceR * 1.25).toFixed(1)}" width="${(faceR * 1.1).toFixed(1)}" height="${(faceR * 0.5).toFixed(1)}" fill="${accent}" rx="${(faceR*0.1).toFixed(1)}" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="${bg}" />` +
    topFeature +
    `<circle cx="${cx}" cy="${cy}" r="${faceR}" fill="${skin}" />` +
    leftEye + rightEye + mouth +
    `</svg>`;
}
