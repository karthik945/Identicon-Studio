/**
 * Universal Identicon Studio — single dispatcher endpoint
 * GET /api/identicon?style=jdenticon&seed=hello&size=256
 *
 * All 18 styles in one serverless function (Vercel Hobby = 12 function limit).
 */

import { remapSvgColors } from '../lib/colorRemap.js';
import { polkadotIcon }   from '@polkadot/ui-shared';
import { toSvg as jdenticonToSvg } from 'jdenticon';
import Identicon from 'identicon.js';
import { createHash } from 'crypto';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    style = 'jdenticon',
    seed  = 'hello',
    size  = '256',
    preset, hueShift, saturation, lightness,
  } = req.query;

  const sz     = Math.max(16, Math.min(512, parseInt(size, 10) || 256));
  const colors = { preset, hueShift: +hueShift || 0, saturation: +saturation || 0, lightness: +lightness || 0 };

  try {
    switch (style) {

      // ── SVG styles ──────────────────────────────────────────────────────

      case 'beachball': {
        const circles = polkadotIcon(seed, { isAlternative: false });
        const parts = circles.map(({ cx, cy, fill, r }) =>
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`
        ).join('');
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${sz}" height="${sz}">${parts}</svg>`;
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'jdenticon': {
        let svg = jdenticonToSvg(seed, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
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
        return sendSvg(res, svg);
      }

      case 'jazzicon': {
        const numericSeed = stringToSeed(seed);
        let svg = generateJazzicon(numericSeed, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'github': {
        const hash = createHash('md5').update(seed).digest('hex');
        const data = new Identicon(hash, { size: sz, format: 'svg', margin: 0.1 }).toString();
        let svg = Buffer.from(data, 'base64').toString('utf-8');
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'hashicon': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildHashicon(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'solacon': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildSolacon(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'hexicon': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildHexicon(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'gradient': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildGradientAvatar(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'identiheart': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildIdentiHeart(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'florash': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildFlorash(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'letter': {
        const hash = createHash('md5').update(seed).digest('hex');
        let svg = buildLetterAvatar(seed, hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'bubble': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildBubble(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'lifehash': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildLifeHash(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
      }

      case 'pictogrify': {
        const hash = createHash('sha256').update(seed).digest('hex');
        let svg = buildPictogrify(hash, sz);
        svg = remapSvgColors(svg, colors);
        return sendSvg(res, svg);
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

      default:
        return res.status(400).json({ error: `Unknown style: "${style}". Valid styles: beachball, jdenticon, blockies, jazzicon, github, hashicon, solacon, hexicon, gradient, identiheart, florash, letter, bubble, lifehash, pictogrify, robohash, monsterid, wavatars` });
    }
  } catch (err) {
    console.error(`[identicon] style=${style} seed=${seed}`, err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Response helpers ────────────────────────────────────────────────────────

function sendSvg(res, svg) {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(svg);
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

// ─── Jazzicon ────────────────────────────────────────────────────────────────

const JAZZ_COLORS = ['#01888C','#FC7500','#034F5D','#F73F01','#FC1960','#C7144C','#F3C100','#1598F2','#2465E1','#F19E02'];

function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); hash |= 0; }
  return Math.abs(hash);
}

function generateJazzicon(seed, size) {
  const rng = mulberry32(seed);
  const colors = [...JAZZ_COLORS].sort(() => rng() - 0.5);
  const half = size / 2;
  const shapes = [];
  for (let i = 0; i < 4; i++) {
    const fill = colors[i % colors.length];
    const type = Math.floor(rng() * 3);
    const center = size / 2;
    if (type === 0) {
      const x = (rng()-0.5)*size, y = (rng()-0.5)*size;
      const w = size*(0.3+rng()*0.4), h = size*(0.3+rng()*0.4);
      shapes.push(`<rect x="${(center+x-w/2).toFixed(1)}" y="${(center+y-h/2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"/>`);
    } else if (type === 1) {
      const cx=(rng()-0.5)*size+center, cy=(rng()-0.5)*size+center, r=size*(0.15+rng()*0.25);
      shapes.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}"/>`);
    } else {
      const pts = Array.from({length:3},()=>`${((rng()-0.5)*size+center).toFixed(1)},${((rng()-0.5)*size+center).toFixed(1)}`).join(' ');
      shapes.push(`<polygon points="${pts}" fill="${fill}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${colors[4]}"/><clipPath id="c"><circle cx="${half}" cy="${half}" r="${half}"/></clipPath><g clip-path="url(#c)">${shapes.join('')}</g></svg>`;
}

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a>>>15, 1|a);
    t = t + Math.imul(t ^ t>>>7, 61|t) ^ t;
    return ((t ^ t>>>14) >>> 0) / 4294967296;
  };
}

// ─── Hashicon ────────────────────────────────────────────────────────────────

function buildHashicon(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const hue = (bytes[0]*360/255).toFixed(1), sat = (40+bytes[1]*60/255).toFixed(1);
  const bg = `hsl(${hue},${sat}%,${(80+bytes[2]*15/255).toFixed(1)}%)`;
  const fg = `hsl(${hue},${sat}%,${(20+bytes[3]*30/255).toFixed(1)}%)`;
  const grid = []; let bi = 4;
  for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) {
    grid[row*5+col] = (bytes[bi++]&1)===1;
    grid[row*5+(4-col)] = grid[row*5+col];
  }
  const cell = size/5;
  const rects = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++)
    if (grid[row*5+col]) rects.push(`<rect x="${col*cell}" y="${row*cell}" width="${cell}" height="${cell}" fill="${fg}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/>${rects.join('')}</svg>`;
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

// ─── Hexicon ─────────────────────────────────────────────────────────────────

function buildHexicon(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const baseHue = bytes[0]*360/255, sat = 50+bytes[1]*50/255;
  const cx = size/2, cy = size/2, hexR = size/8;
  const positions = hexRingPositions(cx, cy, hexR);
  const hexes = positions.map((pos,i)=>{
    const byte = bytes[(i+2)%bytes.length];
    const hue = (baseHue+(byte/255)*60)%360;
    const l = 35+(byte/255)*30;
    const fill = byte>80 ? `hsl(${hue.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%)` : `hsl(${hue.toFixed(1)},20%,85%)`;
    return hexPath(pos.x, pos.y, hexR*0.92, fill);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="hsl(${baseHue.toFixed(1)},${sat.toFixed(1)}%,95%)"/>${hexes.join('')}</svg>`;
}

function hexRingPositions(cx, cy, r) {
  const pos = [{x:cx,y:cy}], sp = r*1.75;
  const dirs = [[1,0],[0.5,0.866],[-0.5,0.866],[-1,0],[-0.5,-0.866],[0.5,-0.866]];
  for (let d=0;d<6;d++) pos.push({x:cx+dirs[d][0]*sp,y:cy+dirs[d][1]*sp});
  for (let d=0;d<6;d++) {
    pos.push({x:cx+dirs[d][0]*sp*2,y:cy+dirs[d][1]*sp*2});
    const n=dirs[(d+2)%6];
    pos.push({x:cx+dirs[d][0]*sp*2+n[0]*sp,y:cy+dirs[d][1]*sp*2+n[1]*sp});
  }
  return pos;
}

function hexPath(cx, cy, r, fill) {
  const pts = Array.from({length:6},(_,i)=>{
    const a=(Math.PI/3)*i-Math.PI/6;
    return `${(cx+r*Math.cos(a)).toFixed(2)},${(cy+r*Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="${fill}"/>`;
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

// ─── LifeHash ─────────────────────────────────────────────────────────────────

const GRID = 16;

function buildLifeHash(hash, size) {
  const bytes = hash.match(/.{2}/g).map(h => parseInt(h, 16));
  const baseHue=bytes[0]*360/255, sat=55+bytes[1]*35/255;
  let cells = Array.from({length:GRID*GRID},(_,i)=>(bytes[Math.floor(i/8)%bytes.length]>>(i%8))&1);
  for (let g=0;g<5;g++) cells=lifeStep(cells);
  const cell=size/GRID, rects=[];
  for (let row=0;row<GRID;row++) for (let col=0;col<GRID;col++) {
    if (cells[row*GRID+col]) {
      const hue=(baseHue+(row*col/(GRID*GRID))*60)%360, l=35+((row+col)/(GRID*2))*25;
      rects.push(`<rect x="${col*cell}" y="${row*cell}" width="${cell}" height="${cell}" fill="hsl(${hue.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%)"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="hsl(${baseHue.toFixed(1)},${(sat*0.3).toFixed(1)}%,92%)"/>${rects.join('')}</svg>`;
}

function lifeStep(cells) {
  const next=new Array(GRID*GRID).fill(0);
  for (let row=0;row<GRID;row++) for (let col=0;col<GRID;col++) {
    let n=0;
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
      if (dr===0&&dc===0) continue;
      n+=cells[((row+dr+GRID)%GRID)*GRID+((col+dc+GRID)%GRID)];
    }
    const a=cells[row*GRID+col];
    next[row*GRID+col]=a?(n===2||n===3?1:0):(n===3?1:0);
  }
  return next;
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
