/**
 * Universal SVG color remapping utility.
 * Intercepts all hex/hsl/rgb color values in an SVG string,
 * converts to HSL, applies adjustments, converts back.
 *
 * @param {string} svg - Raw SVG string
 * @param {object} options
 * @param {number} [options.hueShift=0]        - Degrees to shift hue (0–360)
 * @param {number} [options.saturation=0]      - Saturation delta (-100 to +100)
 * @param {number} [options.lightness=0]       - Lightness delta (-100 to +100)
 * @param {string} [options.preset]            - Named preset (overrides sliders if set)
 * @returns {string} Remapped SVG string
 */
export function remapSvgColors(svg, options = {}) {
  const params = resolveParams(options);
  if (isNoop(params)) return svg;

  // Replace hex colors (#rrggbb and #rgb)
  svg = svg.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match) => {
    const [r, g, b] = hexToRgb(match);
    return applyAndFormat(r, g, b, params);
  });

  // Replace rgb(...) colors
  svg = svg.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, (_, r, g, b) => {
    return applyAndFormat(+r, +g, +b, params);
  });

  // Replace hsl(...) colors
  svg = svg.replace(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/g, (_, h, s, l) => {
    const [r, g, b] = hslToRgb(+h, +s / 100, +l / 100);
    return applyAndFormat(r, g, b, params);
  });

  return svg;
}

// ─── Presets ────────────────────────────────────────────────────────────────

const PRESETS = {
  default:     { hueShift: 0,   saturation: 0,    lightness: 0 },
  pastel:      { hueShift: 0,   saturation: -40,  lightness: 20 },
  neon:        { hueShift: 0,   saturation: 40,   lightness: 0 },
  muted:       { hueShift: 0,   saturation: -30,  lightness: 0 },
  darkmode:    { hueShift: 0,   saturation: 0,    lightness: -30 },
  monochrome:  { hueShift: 0,   saturation: -100, lightness: 0 },
  warm:        { hueShift: 0,   saturation: 0,    lightness: 0,  hueLock: [0, 60] },
  cool:        { hueShift: 0,   saturation: 0,    lightness: 0,  hueLock: [180, 270] },
  earth:       { hueShift: 0,   saturation: -20,  lightness: 0,  hueLock: [20, 40] },
};

function resolveParams(options) {
  const preset = options.preset ? PRESETS[options.preset.toLowerCase()] : null;
  if (preset) return preset;
  return {
    hueShift:   options.hueShift   ?? 0,
    saturation: options.saturation ?? 0,
    lightness:  options.lightness  ?? 0,
  };
}

function isNoop(params) {
  return params.hueShift === 0 && params.saturation === 0 &&
         params.lightness === 0 && !params.hueLock;
}

// ─── Core transform ─────────────────────────────────────────────────────────

function applyAndFormat(r, g, b, params) {
  let [h, s, l] = rgbToHsl(r, g, b);

  // Apply hue lock (warm/cool/earth presets)
  if (params.hueLock) {
    const [lo, hi] = params.hueLock;
    const mid = (lo + hi) / 2;
    h = mid;
    // Slightly tighten saturation so it looks natural
    s = Math.min(1, s + 0.05);
  } else {
    h = (h + params.hueShift) % 360;
    if (h < 0) h += 360;
  }

  s = clamp(s * 100 + params.saturation, 0, 100) / 100;
  l = clamp(l * 100 + params.lightness, 0, 100) / 100;

  const [nr, ng, nb] = hslToRgb(h, s, l);
  return rgbToHex(nr, ng, nb);
}

// ─── Color space conversions ─────────────────────────────────────────────────

function hexToRgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = h / 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r * 255, g * 255, b * 255];
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
