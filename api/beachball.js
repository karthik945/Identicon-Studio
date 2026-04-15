import { polkadotIcon } from '@polkadot/ui-shared';
import { remapSvgColors } from '../lib/colorRemap.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { seed = 'hello', size = '256', preset, hueShift, saturation, lightness } = req.query;
  const sz = parseInt(size, 10) || 256;

  // polkadotIcon returns an array of circle descriptors
  const circles = polkadotIcon(seed, { isAlternative: false });

  const svgCircles = circles.map(({ cx, cy, fill, r }) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`
  ).join('');

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${sz}" height="${sz}">${svgCircles}</svg>`;

  svg = remapSvgColors(svg, { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}
