// Drawing kit for code-drawn films. Every function is deterministic given its seed, so frame N
// always looks the same: that is what lets a film be scrubbed, re-rendered and exported.
// Coordinates are in film units (the engine scales a 1000-unit square to the output size).
import { createNoise2D } from 'simplex-noise';

// ---------- Randomness ----------

export function rng(seed = 1) {
  let a = (seed >>> 0) || 1;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(r.range(lo, hi + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.gauss = () => (r() + r() + r() + r() - 2) / 2;
  return r;
}
export const hash = (...ns) => ns.reduce((h, n) => Math.imul(h ^ Math.round(n * 1000), 2654435761) >>> 0, 2166136261);
// Boil: hand-drawn animation redraws every line on every drawing, so nothing is ever perfectly
// still. Setting a boil index re-rolls every seeded wobble, grain and jitter for this drawing.
let BOIL = 0;
export const setBoil = (n) => { BOIL = n | 0; };
const boiled = (seed, k = 101) => seed + BOIL * k;

const noiseCache = new Map();
export const noise2 = (seed) => {
  if (!noiseCache.has(seed)) noiseCache.set(seed, createNoise2D(rng(seed)));
  return noiseCache.get(seed);
};

// ---------- Palette: paper stocks and spot inks (risograph names where they exist) ----------

export const INK = {
  paper: '#f2ead9', kraft: '#c9a77c', ink: '#26211c', sepia: '#5b4330',
  yellow: '#ffd23f', red: '#f15060', orange: '#ff6c2f', pink: '#ff48b0',
  blue: '#0078bf', federal: '#3d5588', teal: '#00838a', green: '#00a95c',
  prussian: '#1f4e8c', ochre: '#c98b4a', wood: '#e6c38d', rot: '#4a3426',
};

// ---------- Math helpers ----------

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: (t) => t * t * t,
  back: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
};

export function pathOf(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}
const bbox = (pts) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
};

// Resample a polyline to points every `step` units, so wobble and write-on are even.
export function resample(pts, step = 4) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    let d = step - carry;
    while (d <= len) { out.push([ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len]); d += step; }
    carry = len - (d - step);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ---------- Offscreen surfaces ----------

const surfaces = new Map();
export function surface(key, w, h) {
  let c = surfaces.get(key);
  if (!c || c.width !== w || c.height !== h) {
    c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    surfaces.set(key, c);
  }
  return c;
}

// Paper: base tone, slow mottling, fine tooth and a few fibers. Built once per seed and size.
export function paper(size, seed = 7, base = INK.paper) {
  const key = `paper:${size}:${seed}:${base}`;
  if (surfaces.has(key)) return surfaces.get(key);
  const c = surface(key, size, size);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size), d = img.data;
  const n = noise2(seed), r = rng(seed);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const mottle = n(x / 320, y / 320) * 3 + n(x / 70, y / 70) * 1.6;
    const tooth = (r() - 0.5) * 11;
    const v = mottle + tooth;
    d[i] += v; d[i + 1] += v; d[i + 2] += v * 0.9;
  }
  g.putImageData(img, 0, 0);
  g.lineWidth = 0.6;
  for (let k = 0; k < size / 6; k++) {
    const x = r() * size, y = r() * size, a = r() * Math.PI, l = 4 + r() * 14;
    g.strokeStyle = `rgba(90,70,40,${0.04 + r() * 0.06})`;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 3, y + Math.sin(a) * l * 0.5 + r() * 3, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}

// Speckle mask: where ink fails to take on the paper. Used to give flat inks a printed grain.
function speckle(size, seed) {
  const key = `speckle:${size}:${seed}`;
  if (surfaces.has(key)) return surfaces.get(key);
  const c = surface(key, size, size), g = c.getContext('2d');
  const img = g.createImageData(size, size), d = img.data, n = noise2(seed + 11), r = rng(seed + 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const v = 0.55 * r() + 0.45 * (n(x / 3.5, y / 3.5) * 0.5 + 0.5);
    d[i + 3] = v > 0.78 ? 255 * Math.min(1, (v - 0.78) * 6) : 0;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Draw `fn` into its own ink layer, eat grain out of it, then print it onto ctx with multiply,
// optionally shifted (misregistration). This is the single most important "print" trick.
export function inkLayer(ctx, fn, { grain = 0.6, offset = [0, 0], blend = 'multiply', alpha = 1, seed = 5 } = {}) {
  const { width, height } = ctx.canvas;
  const layer = surface(`layer:${width}:${height}`, width, height);
  const g = layer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, width, height);
  g.setTransform(ctx.getTransform());
  fn(g);
  if (grain > 0) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = grain;
    g.drawImage(speckle(width, seed + (BOIL % 4) * 1000), 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  const m = ctx.getTransform();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = blend;
  ctx.globalAlpha = alpha;
  ctx.drawImage(layer, offset[0] * m.a, offset[1] * m.d);
  ctx.restore();
}

// ---------- Line work ----------

// A pen line: resampled, nudged by noise along its normal, tapered at both ends, drawn in two
// slightly different passes. `progress` draws it on from the start (0 to 1).
export function inkLine(ctx, pts, { width = 2.2, wobble = 1.2, color = INK.ink, seed = 1, progress = 1, taper = true, passes = 2, alpha = 0.92 } = {}) {
  const P = resample(pts, 3);
  const n = noise2(boiled(seed));
  const end = Math.max(2, Math.floor(P.length * clamp(progress)));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  for (let pass = 0; pass < passes; pass++) {
    ctx.globalAlpha = alpha * (pass ? 0.45 : 1);
    for (let i = 1; i < end; i++) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i];
      const nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny) || 1;
      const off = (k) => n(k * 0.035 + pass * 9.1, seed * 0.1) * wobble;
      const u = i / P.length;
      const w = width * (taper ? Math.min(1, u * 8, (1 - u) * 8 + 0.2) : 1) * (0.85 + 0.3 * (n(i * 0.08, pass + 3) * 0.5 + 0.5));
      ctx.lineWidth = Math.max(0.3, w * (pass ? 0.6 : 1));
      ctx.beginPath();
      ctx.moveTo(ax + (nx / nl) * off(i - 1), ay + (ny / nl) * off(i - 1));
      ctx.lineTo(bx + (nx / nl) * off(i), by + (ny / nl) * off(i));
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Closed shape outline with ink.
export const inkShape = (ctx, pts, opts) => inkLine(ctx, [...pts, pts[0]], { taper: false, ...opts });

export function circlePts(cx, cy, r, n = 64) {
  return Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]);
}

// ---------- Tone: hatching, stippling, halftone ----------

// Pencil hatching inside a clip polygon. `tone(x, y)` in [0, 1] decides where lines go: the first
// direction appears above `levels[0]`, cross-hatching above `levels[1]`, and so on.
export function hatch(ctx, clip, { angle = -0.8, spacing = 6, tone = () => 0.6, levels = [0.2, 0.55, 0.8], color = INK.ink, width = 0.9, seed = 3, alpha = 0.7, progress = 1 } = {}) {
  const b = bbox(clip);
  const n = noise2(boiled(seed, 31));
  ctx.save();
  pathOf(ctx, clip);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const R = Math.hypot(b.w, b.h) / 2 + spacing, cx = b.x0 + b.w / 2, cy = b.y0 + b.h / 2;
  levels.forEach((level, li) => {
    const a = angle + li * 1.05;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let k = -R, row = 0; k <= R; k += spacing, row++) {
      if ((row / (2 * R / spacing)) > progress) break;
      ctx.beginPath();
      let pen = false;
      for (let s = -R; s <= R; s += 3) {
        const jitter = n(row * 0.7 + li * 13, s * 0.02) * 1.2;
        const x = cx + ca * s - sa * (k + jitter), y = cy + sa * s + ca * (k + jitter);
        const on = tone(x, y) > level + n(x * 0.05, y * 0.05 + li) * 0.06;
        if (on && !pen) { ctx.moveTo(x, y); pen = true; } else if (on) ctx.lineTo(x, y); else pen = false;
      }
      ctx.globalAlpha = alpha * (0.7 + 0.3 * (n(row, li * 5) * 0.5 + 0.5));
      ctx.lineWidth = width;
      ctx.stroke();
    }
  });
  ctx.restore();
}

// Stippling: dots accepted with probability tone(x, y).
export function stipple(ctx, clip, { tone = () => 0.5, count = 1500, r = 0.9, color = INK.ink, seed = 4, alpha = 0.85 } = {}) {
  const b = bbox(clip), R = rng(boiled(seed, 17));
  ctx.save();
  pathOf(ctx, clip);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const x = b.x0 + R() * b.w, y = b.y0 + R() * b.h;
    const keep = R() < tone(x, y);
    const rr = r * (0.6 + R() * 0.8);
    if (keep) { ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, Math.PI * 2); }
  }
  ctx.fill();
  ctx.restore();
}

// Halftone: a rotated grid of dots whose area follows tone(x, y).
export function halftone(ctx, clip, { tone = () => 0.5, cell = 7, angle = 0.26, color = INK.blue, phase = [0, 0] } = {}) {
  const b = bbox(clip);
  ctx.save();
  pathOf(ctx, clip);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.beginPath();
  const ca = Math.cos(angle), sa = Math.sin(angle), cx = b.x0 + b.w / 2, cy = b.y0 + b.h / 2;
  const R = Math.hypot(b.w, b.h) / 2 + cell;
  for (let i = -R; i <= R; i += cell) for (let j = -R; j <= R; j += cell) {
    const jx = BOIL ? (((i * 7 + j * 13 + BOIL * 29) % 11) / 11 - 0.5) * cell * 0.12 : 0;
    const x = cx + ca * (i + phase[0]) - sa * (j + phase[1]) + jx, y = cy + sa * (i + phase[0]) + ca * (j + phase[1]) - jx;
    const v = clamp(tone(x, y));
    if (v < 0.03) continue;
    const r = Math.sqrt(v) * cell * 0.62;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

// ---------- Watercolor wash ----------

// Tyler Hobbs's method: deform a polygon by recursive midpoint displacement, then stack many
// faint, further-deformed copies. Built once per seed into a sprite, then drawn each frame.
function deform(pts, depth, variance, R) {
  let P = pts;
  for (let d = 0; d < depth; d++) {
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      out.push(a, [mx + R.gauss() * len * variance, my + R.gauss() * len * variance]);
    }
    P = out;
  }
  return P;
}
export function wash(ctx, poly, { color = INK.ochre, seed = 9, layers = 18, alpha = 0.07, spread = 0.18 } = {}) {
  const R = rng(boiled(seed, 7));
  const base = deform(poly, 2, spread, R);
  ctx.save();
  ctx.fillStyle = color;
  for (let l = 0; l < layers; l++) {
    ctx.globalAlpha = alpha;
    pathOf(ctx, deform(base, 3, spread * 0.6, R));
    ctx.fill();
  }
  ctx.restore();
}

// ---------- Text ----------

export function caption(ctx, text, x, y, { size = 34, color = INK.ink, alpha = 1, align = 'center', italic = true, maxWidth = 860, lineHeight = 1.3 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${italic ? 'italic ' : ''}${size}px "EB Garamond", Georgia, serif`;
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + (i - (lines.length - 1)) * size * lineHeight));
  ctx.restore();
}
