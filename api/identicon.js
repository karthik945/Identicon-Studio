/**
 * Universal Identicon Studio — single dispatcher endpoint
 * GET /api/identicon?style=jdenticon&seed=hello&size=256
 *
 * All 18 styles in one serverless function (Vercel Hobby = 12 function limit).
 */

import { remapSvgColors } from '../lib/colorRemap.js';
import { ROBOTO_BOLD_B64 } from '../lib/robotoFont.js';
import { toSvg as jdenticonToSvg } from 'jdenticon';
import Identicon from 'identicon.js';
import { createHash } from 'crypto';

// Lazy DOM setup — jsdom dynamically imported so it never crashes on module load
let _domReady = false;
async function ensureDOM() {
  if (_domReady) return;
  const { parseHTML } = await import('linkedom');
  const { document: _doc, window: _win } = parseHTML('');
  global.document = _doc;
  global.window   = _win;
  global.self     = _win;
  _domReady = true;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    style = 'jdenticon',
    seed  = 'hello',
    size  = '256',
    shape = 'circle',   // 'circle' | 'square'
    bg    = 'white',    // 'white' | 'black' | 'transparent'
    preset, hueShift, saturation, lightness,
  } = req.query;

  const sz     = Math.max(16, Math.min(512, parseInt(size, 10) || 256));
  const colors = { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 };

  try {
    switch (style) {

      // ── SVG styles ──────────────────────────────────────────────────────

      case 'beachball': {
        await ensureDOM();
        const { beachballIcon } = await import('@polkadot/ui-shared');
        const pkHex = '0x' + createHash('sha256').update(seed).digest('hex');
        const div = beachballIcon(pkHex, { isAlternative: false });
        const svgEl = div.querySelector('svg');
        svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgEl.setAttribute('width', sz);
        svgEl.setAttribute('height', sz);
        let svg = svgEl.outerHTML;
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'jdenticon': {
        let svg = jdenticonToSvg(seed, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'blockies': {
        const blockColors = generateBlockiesColors(seed.toLowerCase());
        const grid        = generateBlockiesGrid(seed.toLowerCase());
        const cell        = sz / 8;
        const rects = [];
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const v = grid[y * 8 + x];
            const fill = v === 1 ? blockColors.color : v === 2 ? blockColors.spotColor : blockColors.bgColor;
            rects.push(`<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="${fill}"/>`);
          }
        }
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}">${rects.join('')}</svg>`;
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'jazzicon': {
        await ensureDOM();
        const { default: jazzicon } = await import('@metamask/jazzicon');
        const seedNum = parseInt(createHash('md5').update(seed).digest('hex').slice(0, 8), 16);
        const el = jazzicon(sz, seedNum);
        const svgEl = el.querySelector('svg');
        svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        // wrap in a circle-clipped container matching the outer div background
        const bg = el.style.background || '#ccc';
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}"><circle cx="${sz/2}" cy="${sz/2}" r="${sz/2}" fill="${bg}"/><g clip-path="url(#jc)"><clipPath id="jc"><circle cx="${sz/2}" cy="${sz/2}" r="${sz/2}"/></clipPath>${svgEl.innerHTML}</g></svg>`;
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'github': {
        const hash = createHash('md5').update(seed).digest('hex');
        const data = new Identicon(hash, { size: sz, format: 'svg', margin: 0.1 }).toString();
        let svg = Buffer.from(data, 'base64').toString('utf-8');
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'hashicon': {
        const { createCanvas } = await import('@napi-rs/canvas');
        const hashicon = (await import('hashicon')).default;
        const canvas = hashicon(seed, { size: sz, createCanvas });
        const buffer = await canvas.encode('png');
        return sendPng(res, buffer);
      }

      case 'solacon': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildSolacon(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'hexicon': {
        await ensureDOM();
        const { default: Hexicon } = await import('hexicon');
        const h = new Hexicon({ type: 'hexagon', random: seed, size: sz });
        let svg = h.toSVG();
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'gradient': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildGradientAvatar(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'identiheart': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildIdentiHeart(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'florash': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildFlorash(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'letter': {
        const hash = createHash('md5').update(seed).digest('hex');
        let svg = buildLetterAvatar(seed, hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'bubble': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildBubble(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'lifehash': {
        const { LifeHash } = await import('lifehash');
        const img = LifeHash.makeFrom(seed);
        // img.colors is a flat Uint8Array of RGBA pixels, img.width x img.height
        const w = img.width, h = img.height;
        const scale = Math.floor(sz / w) || 1;
        const rects = [];
        for (let row = 0; row < h; row++) {
          for (let col = 0; col < w; col++) {
            const i = (row * w + col) * 4;
            const r = img.colors[i], g = img.colors[i+1], b = img.colors[i+2];
            rects.push(`<rect x="${col*scale}" y="${row*scale}" width="${scale}" height="${scale}" fill="rgb(${r},${g},${b})"/>`);
          }
        }
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}">${rects.join('')}</svg>`;
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      case 'pictogrify': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildPictogrify(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg, sz, shape, bg);
      }

      // ── PNG styles (proxy) ───────────────────────────────────────────────

      case 'robohash': {
        const hash = createHash('md5').update(seed).digest('hex');
        const url  = `https://robohash.org/${encodeURIComponent(hash)}.png?size=${sz}x${sz}&set=set1`;
        return proxyPng(res, url);
      }

      case 'monsterid': {
        const hash = createHash('md5').update(seed.trim().toLowerCase()).digest('hex');
        const url  = `https://www.gravatar.com/avatar/${hash}?d=monsterid&s=${sz}&r=pg&f=y`;
        return proxyPng(res, url);
      }

      case 'wavatars': {
        const hash = createHash('md5').update(seed.trim().toLowerCase()).digest('hex');
        const url  = `https://www.gravatar.com/avatar/${hash}?d=wavatar&s=${sz}&r=pg&f=y`;
        return proxyPng(res, url);
      }

      case 'gradletter': {
        const { createCanvas, GlobalFonts } = await import('@napi-rs/canvas');
        ensureGradLetterFont(GlobalFonts);
        const canvas = buildGradLetterCanvas(seed, sz, shape, bg, colors, createCanvas);
        return sendPng(res, await canvas.encode('png'));
      }

      default:
        return res.status(400).json({ error: `Unknown style: "${style}". Valid styles: beachball, jdenticon, blockies, jazzicon, github, hashicon, solacon, hexicon, gradient, identiheart, florash, letter, bubble, lifehash, pictogrify, gradletter, robohash, monsterid, wavatars` });
    }
  } catch (err) {
    console.error(`[identicon] style=${style} seed=${seed}`, err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Response helpers ────────────────────────────────────────────────────────

function sendSvg(res, svg, sz, shape, bg) {
  // Strip the outer <svg> wrapper so we can re-wrap with our own
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  const bgColor = bg === 'black' ? '#000000' : bg === 'white' ? '#ffffff' : null;
  const isCircle = shape === 'circle';
  const r = sz / 2;

  let bgRect = bgColor
    ? `<rect width="${sz}" height="${sz}" fill="${bgColor}" ${isCircle ? `rx="${r}" ry="${r}"` : ''}/>`
    : '';

  let content;
  if (isCircle) {
    content = `<defs><clipPath id="clip"><circle cx="${r}" cy="${r}" r="${r}"/></clipPath></defs>${bgRect}<g clip-path="url(#clip)">${inner}</g>`;
  } else {
    content = `${bgRect}${inner}`;
  }

  const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">${content}</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(out);
}

function sendPng(res, buffer) {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(buffer);
}

async function proxyPng(res, url) {
  const upstream = await fetch(url);
  if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
  const buffer = await upstream.arrayBuffer();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(Buffer.from(buffer));
}

// ─── Blockies ────────────────────────────────────────────────────────────────

function generateBlockiesColors(seed) {
  const rng = buildRng(seed);
  const h1 = rng(), s1 = rng() * 0.6 + 0.4, l1 = (rng() + rng() + rng() + rng()) * 0.25;
  const h2 = (h1 + 0.5 + rng() * 0.1 - 0.05) % 1;
  return {
    color:     `hsl(${(h1*360).toFixed(0)},${(s1*100).toFixed(0)}%,${(l1*100).toFixed(0)}%)`,
    bgColor:   `hsl(${(h1*360).toFixed(0)},${(s1*100).toFixed(0)}%,${(l1*60+20).toFixed(0)}%)`,
    spotColor: `hsl(${(h2*360).toFixed(0)},${(s1*100).toFixed(0)}%,${(l1*100).toFixed(0)}%)`,
  };
}

function generateBlockiesGrid(seed) {
  const rng = buildRng(seed);
  for (let i = 0; i < 8; i++) rng(); // consume color values
  const grid = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const v = Math.floor(rng() * 2.3);
      grid[y * 8 + x] = v;
      grid[y * 8 + (7 - x)] = v;
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
    randseed[0] = randseed[1]; randseed[1] = randseed[2]; randseed[2] = randseed[3];
    randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);
    return (randseed[3] >>> 0) / ((1 << 31) >>> 0);
  };
}


// ─── Solacon ─────────────────────────────────────────────────────────────────

function buildSolacon(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const cx = size/2, cy = size/2;
  const hue1 = (bytes[0]*360/255).toFixed(1), hue2 = ((bytes[0]*360/255+180)%360).toFixed(1);
  const sat = (50+bytes[1]*50/255).toFixed(1);
  const shapes = [];
  for (let i = 0; i < 5; i++) {
    const r = (size*0.45)*(1-i/5);
    const sides = 3+(bytes[2+i]%5), rotation = (bytes[7+i]/255)*360;
    const hue = i%2===0 ? hue1 : hue2;
    const pts = polygon(cx, cy, r, sides, rotation);
    shapes.push(`<polygon points="${pts}" fill="hsl(${hue},${sat}%,${(40+i*8).toFixed(1)}%)" opacity="0.85"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${cx}" cy="${cy}" r="${cx}" fill="hsl(${hue1},${sat}%,15%)"/>${shapes.join('')}</svg>`;
}

function polygon(cx, cy, r, sides, rotDeg) {
  return Array.from({length:sides},(_,i)=>{
    const a = (Math.PI*2*i/sides)-(Math.PI/2)+(rotDeg*Math.PI/180);
    return `${(cx+r*Math.cos(a)).toFixed(2)},${(cy+r*Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}


// ─── Gradient Avatar ─────────────────────────────────────────────────────────

function buildGradientAvatar(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const h1=(bytes[0]*360/255).toFixed(1), h2=((bytes[0]*360/255+120+bytes[1]*60/255)%360).toFixed(1), h3=((bytes[0]*360/255+240+bytes[2]*60/255)%360).toFixed(1);
  const s=(60+bytes[3]*30/255).toFixed(1), angle=((bytes[4]/255)*360).toFixed(1);
  const cx=(size*0.3+(bytes[5]/255)*size*0.4).toFixed(1), cy=(size*0.3+(bytes[6]/255)*size*0.4).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle},0.5,0.5)"><stop offset="0%" stop-color="hsl(${h1},${s}%,55%)"/><stop offset="50%" stop-color="hsl(${h2},${s}%,50%)"/><stop offset="100%" stop-color="hsl(${h3},${s}%,45%)"/></linearGradient><radialGradient id="g2" cx="${cx}" cy="${cy}" r="60%" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="hsl(${h2},${s}%,75%)" stop-opacity="0.6"/><stop offset="100%" stop-color="hsl(${h1},${s}%,30%)" stop-opacity="0"/></radialGradient></defs><rect width="${size}" height="${size}" fill="url(#g1)"/><rect width="${size}" height="${size}" fill="url(#g2)"/></svg>`;
}

// ─── IdentiHeart ─────────────────────────────────────────────────────────────

function buildIdentiHeart(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const hue=(bytes[0]*360/255).toFixed(1), sat=(50+bytes[1]*40/255).toFixed(1);
  const bg=`hsl(${hue},${sat}%,92%)`, c1=`hsl(${hue},${sat}%,45%)`;
  const c2=`hsl(${((+hue+30)%360).toFixed(1)},${sat}%,60%)`, c3=`hsl(${((+hue+60)%360).toFixed(1)},${sat}%,35%)`;
  const cell=size/4, shapes=[];
  for (let row=0;row<4;row++) for (let col=0;col<4;col++) {
    const bi=(row*4+col+2)%bytes.length, val=bytes[bi];
    if (val<80) continue;
    const x=col*cell+cell/2, y=row*cell+cell/2, r=cell*0.4;
    const color=val<140?c1:val<200?c2:c3, type=val%3;
    if (type===0) shapes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`);
    else if (type===1) shapes.push(`<polygon points="${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}" fill="${color}"/>`);
    else shapes.push(`<rect x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" fill="${color}" rx="${r*0.2}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/>${shapes.join('')}</svg>`;
}

// ─── Florash ─────────────────────────────────────────────────────────────────

function buildFlorash(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const cx=size/2, cy=size/2, baseHue=bytes[0]*360/255, sat=55+bytes[1]*35/255;
  const petalCount=5+(bytes[2]%4), shapes=[];
  for (let layer=3;layer>=0;layer--) {
    const r=(size*0.45)*(0.3+(layer/3)*0.7), hue=(baseHue+layer*25)%360, l=40+layer*10;
    for (let p=0;p<petalCount;p++) {
      const angle=(Math.PI*2*p/petalCount)+(bytes[3+layer]/255)*Math.PI;
      const px=cx+Math.cos(angle)*r*0.55, py=cy+Math.sin(angle)*r*0.55;
      shapes.push(`<ellipse cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" rx="${(r*0.4).toFixed(2)}" ry="${(r*0.22).toFixed(2)}" fill="hsl(${hue.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%)" transform="rotate(${((angle*180/Math.PI)+90).toFixed(1)},${px.toFixed(2)},${py.toFixed(2)})" opacity="0.88"/>`);
    }
  }
  shapes.push(`<circle cx="${cx}" cy="${cy}" r="${(size*0.12).toFixed(2)}" fill="hsl(${((baseHue+180)%360).toFixed(1)},${sat.toFixed(1)}%,55%)"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${cx}" cy="${cy}" r="${cx}" fill="hsl(${baseHue.toFixed(1)},${sat.toFixed(1)}%,92%)"/>${shapes.join('')}</svg>`;
}

// ─── Letter Avatar ───────────────────────────────────────────────────────────

function buildLetterAvatar(seed, hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const hue=(bytes[0]*360/255).toFixed(1), sat=(50+bytes[1]*30/255).toFixed(1);
  const bg=`hsl(${hue},${sat}%,45%)`, fg=`hsl(${hue},${sat}%,95%)`;
  const clean=seed.trim().replace(/[^a-zA-Z0-9]/g,' ').trim(), parts=clean.split(/\s+/).filter(Boolean);
  let letters = parts.length>=2 ? (parts[0][0]+parts[1][0]).toUpperCase() : clean.slice(0,2).toUpperCase();
  if (!letters) letters='?';
  const fontSize=(size*(letters.length===1?0.48:0.38)).toFixed(1);
  const cx=size/2, cy=size/2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${cx}" cy="${cy}" r="${cx}" fill="${bg}"/><text x="${cx}" y="${cy}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="${fg}" text-anchor="middle" dominant-baseline="central">${letters}</text></svg>`;
}

// ─── Bubble ──────────────────────────────────────────────────────────────────

function buildBubble(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const baseHue=bytes[0]*360/255, sat=55+bytes[1]*35/255, count=8+(bytes[2]%6);
  const circles=[];
  for (let i=0;i<count;i++) {
    const bi=(i*3+3)%bytes.length;
    const cx=(bytes[bi]/255)*size, cy=(bytes[(bi+1)%bytes.length]/255)*size;
    const r=size*(0.08+(bytes[(bi+2)%bytes.length]/255)*0.22);
    const hue=(baseHue+i*30)%360, l=45+(bytes[(bi+3)%bytes.length]/255)*25;
    circles.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="hsl(${hue.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%)" opacity="0.72"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="hsl(${baseHue.toFixed(1)},${sat.toFixed(1)}%,92%)"/>${circles.join('')}</svg>`;
}


// ─── Pictogrify ──────────────────────────────────────────────────────────────

function buildPictogrify(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const cx=size/2, cy=size/2;
  const hue=(bytes[0]*360/255).toFixed(1), sat=(50+bytes[1]*40/255).toFixed(1);
  const bg=`hsl(${hue},${sat}%,88%)`, skin=`hsl(${hue},${sat}%,72%)`, dark=`hsl(${hue},${sat}%,25%)`;
  const accent=`hsl(${((+hue+180)%360).toFixed(1)},${sat}%,50%)`;
  const faceR=size*0.36, eyeOff=faceR*0.35, eyeR=faceR*0.12;
  const ey=(cy-faceR*0.1).toFixed(1);
  const eyeStyle=bytes[2]%3;
  let lEye,rEye;
  if (eyeStyle===0) {
    lEye=`<circle cx="${(cx-eyeOff).toFixed(1)}" cy="${ey}" r="${eyeR}" fill="${dark}"/>`;
    rEye=`<circle cx="${(cx+eyeOff).toFixed(1)}" cy="${ey}" r="${eyeR}" fill="${dark}"/>`;
  } else if (eyeStyle===1) {
    lEye=`<ellipse cx="${(cx-eyeOff).toFixed(1)}" cy="${ey}" rx="${(eyeR*1.3).toFixed(1)}" ry="${(eyeR*0.7).toFixed(1)}" fill="${dark}"/>`;
    rEye=`<ellipse cx="${(cx+eyeOff).toFixed(1)}" cy="${ey}" rx="${(eyeR*1.3).toFixed(1)}" ry="${(eyeR*0.7).toFixed(1)}" fill="${dark}"/>`;
  } else {
    lEye=`<rect x="${(cx-eyeOff-eyeR).toFixed(1)}" y="${(cy-faceR*0.1-eyeR).toFixed(1)}" width="${(eyeR*2).toFixed(1)}" height="${(eyeR*2).toFixed(1)}" fill="${dark}"/>`;
    rEye=`<rect x="${(cx+eyeOff-eyeR).toFixed(1)}" y="${(cy-faceR*0.1-eyeR).toFixed(1)}" width="${(eyeR*2).toFixed(1)}" height="${(eyeR*2).toFixed(1)}" fill="${dark}"/>`;
  }
  const mouthY=cy+faceR*0.3, sw=(size*0.025).toFixed(1);
  const mouthStyle=bytes[3]%3;
  let mouth;
  if (mouthStyle===0) mouth=`<path d="M ${(cx-faceR*0.3).toFixed(1)} ${mouthY.toFixed(1)} Q ${cx} ${(mouthY+faceR*0.25).toFixed(1)} ${(cx+faceR*0.3).toFixed(1)} ${mouthY.toFixed(1)}" stroke="${dark}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
  else if (mouthStyle===1) mouth=`<line x1="${(cx-faceR*0.3).toFixed(1)}" y1="${mouthY.toFixed(1)}" x2="${(cx+faceR*0.3).toFixed(1)}" y2="${mouthY.toFixed(1)}" stroke="${dark}" stroke-width="${sw}" stroke-linecap="round"/>`;
  else mouth=`<path d="M ${(cx-faceR*0.3).toFixed(1)} ${mouthY.toFixed(1)} Q ${cx} ${(mouthY-faceR*0.2).toFixed(1)} ${(cx+faceR*0.3).toFixed(1)} ${mouthY.toFixed(1)}" stroke="${dark}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
  const feat=bytes[4]%3;
  let top='';
  if (feat===0) top=`<ellipse cx="${cx}" cy="${(cy-faceR*0.92).toFixed(1)}" rx="${(faceR*0.85).toFixed(1)}" ry="${(faceR*0.35).toFixed(1)}" fill="${accent}"/>`;
  else if (feat===1) top=`<rect x="${(cx-faceR*0.55).toFixed(1)}" y="${(cy-faceR*1.25).toFixed(1)}" width="${(faceR*1.1).toFixed(1)}" height="${(faceR*0.5).toFixed(1)}" fill="${accent}" rx="${(faceR*0.1).toFixed(1)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/>${top}<circle cx="${cx}" cy="${cy}" r="${faceR}" fill="${skin}"/>${lEye}${rEye}${mouth}</svg>`;
}

// ─── Gradient Letter Avatar (canvas → PNG) ────────────────────────────────────

let _gradFontReady = false;
function ensureGradLetterFont(GlobalFonts) {
  if (_gradFontReady) return;
  _gradFontReady = true;
  GlobalFonts.register(Buffer.from(ROBOTO_BOLD_B64, 'base64'), 'RobotoGL');
}

const GRAD_LETTER_PRESETS = {
  pastel:     { hueShift: 0,   saturation: -40, lightness: 20 },
  neon:       { hueShift: 0,   saturation: 40,  lightness: 0 },
  muted:      { hueShift: 0,   saturation: -30, lightness: 0 },
  darkmode:   { hueShift: 0,   saturation: 0,   lightness: -30 },
  monochrome: { hueShift: 0,   saturation: -100,lightness: 0 },
  warm:       { hueShift: 0,   saturation: 0,   lightness: 0 },
  cool:       { hueShift: 0,   saturation: 0,   lightness: 0 },
  earth:      { hueShift: 0,   saturation: -20, lightness: 0 },
};

function buildGradLetterCanvas(seed, size, shape, bg, colors, createCanvas) {
  const hash  = createHash('sha256').update(seed).digest('hex');
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));

  // Two vivid hues
  let h1  = bytes[0] * 360 / 255;
  let h2  = (h1 + 120 + bytes[1] * 60 / 255) % 360;
  let sat = 65 + bytes[3] * 25 / 255;

  // Resolve preset or manual sliders
  const resolved = colors.preset ? (GRAD_LETTER_PRESETS[colors.preset.toLowerCase()] ?? {}) : colors;
  const hueShift = resolved.hueShift ?? 0;
  const satDelta = resolved.saturation ?? 0;
  const litDelta = resolved.lightness ?? 0;

  h1  = (h1 + hueShift + 360) % 360;
  h2  = (h2 + hueShift + 360) % 360;
  sat = Math.max(0, Math.min(100, sat + satDelta));
  const l1 = Math.max(0, Math.min(100, 55 + litDelta));
  const l2 = Math.max(0, Math.min(100, 45 + litDelta));

  const angle = bytes[4] * 360 / 255;
  const rad   = angle * Math.PI / 180;
  const half  = size / 2;

  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');

  // Background fill
  if (bg === 'white') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size); }
  else if (bg === 'black') { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, size, size); }

  // Circle clip
  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.clip();
  }

  // Gradient background
  const gx1 = half - Math.cos(rad) * half;
  const gy1 = half - Math.sin(rad) * half;
  const gx2 = half + Math.cos(rad) * half;
  const gy2 = half + Math.sin(rad) * half;
  const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
  grad.addColorStop(0, `hsl(${h1.toFixed(1)},${sat.toFixed(1)}%,${l1}%)`);
  grad.addColorStop(1, `hsl(${h2.toFixed(1)},${sat.toFixed(1)}%,${l2}%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Initials
  const clean   = seed.trim().replace(/[^a-zA-Z0-9]/g, ' ').trim();
  const parts   = clean.split(/\s+/).filter(Boolean);
  let letters   = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : clean.slice(0, 2).toUpperCase();
  if (!letters) letters = '?';

  const fontSize = Math.round(size * (letters.length === 1 ? 0.44 : 0.34));
  ctx.font = `bold ${fontSize}px RobotoGL, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Drop shadow text pass
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillText(letters, half + size * 0.01, half + size * 0.02);

  // Main white text
  ctx.fillStyle = 'white';
  ctx.fillText(letters, half, half);

  return canvas;
}
