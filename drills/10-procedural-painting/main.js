import { gsap } from 'gsap';
import { createNoise2D } from 'simplex-noise';
import { fitCanvas, loop, token, reducedMotion, onThemeChange } from '../../shared/page.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('canvas');
const hazeInput = document.getElementById('haze');
const DX = 2;      // brush column width in CSS px
const JITTER = 14; // how ragged the brush front is, in columns

// ---------- Seeded randomness ----------
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- Color: mix tokens in OKLab so distance steps look even ----------
const hexToRgb = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toLin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => Math.round(clamp(c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055, 0, 1) * 255);
function oklab(rgb) {
  const [r, g, b] = rgb.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function rgbFromOklab([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0040720468 * l - 0.7034186147 * m + 1.707614701 * s].map(toSrgb);
}
// Colors are kept as OKLab triples; css() turns one into a fillStyle.
const lab = (name) => oklab(hexToRgb(token(name)));
const mixLab = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const css = (c, alpha = 1) => `rgb(${rgbFromOklab(c).join(' ')} / ${alpha})`;

// ---------- The landscape model: everything comes from one seed ----------
function build(seed) {
  const rand = mulberry32(seed);
  const noise2D = createNoise2D(mulberry32(seed ^ 0x5bd1e995));
  const count = 5 + Math.floor(rand() * 2);
  const sun = { x: 0.14 + 0.72 * rand(), y: 0.14 + 0.12 * rand() };
  const layers = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1); // 0 = farthest, 1 = nearest
    return {
      i, t,
      freq: lerp(3.4, 1.4, t) * (0.85 + 0.3 * rand()),
      base: lerp(0.5, 0.94, t) + (rand() - 0.5) * 0.03,
      amp: lerp(0.24, 0.15, t),
      offset: rand() * 100,
      progress: 0,
    };
  });
  return { seed, noise2D, sun, layers };
}

// Height of a ridge at u in [0, 1]: three octaves, ridged far away, smooth up close.
function ridge(model, layer, u) {
  let h = 0, norm = 0;
  for (let o = 0, f = layer.freq, a = 1; o < 3; o++, f *= 2, a *= 0.5) {
    const n = model.noise2D(u * f + layer.offset, layer.i * 31.7);
    h += a * lerp((1 - Math.abs(n)) ** 2, n * 0.5 + 0.5, 0.3 + 0.7 * layer.t);
    norm += a;
  }
  return h / norm;
}

// ---------- Painting ----------
let model, tl, ctx, W = 0, H = 0, cols = 0, palette;

function readPalette() {
  const bg = lab('--bg'), ink = lab('--ink'), gold = lab('--gold');
  const lightTheme = bg[0] > 0.5;
  palette = {
    bg, ink,
    near: mixLab(lab('--mark-ink'), gold, 0.25),
    // Sunlit faces lean warm and toward the brighter end of the theme.
    sunlight: lightTheme ? mixLab(gold, bg, 0.55) : mixLab(gold, ink, 0.3),
    sun: mixLab(lab('--mark-accent'), bg, 0.3),
    glow: lab('--mark-accent-wash'),
  };
}

// Per-layer colors and geometry depend on size, theme and haze, so they are rebuilt together.
function prepareLayers() {
  const haze = Number(hazeInput.value);
  cols = Math.ceil(W / DX);
  for (const L of model.layers) {
    const fade = haze * (1 - L.t) * 0.85; // how far this layer leans toward the sky
    L.color = mixLab(palette.near, palette.bg, fade);
    // Air also eats contrast, so distant faces catch less of the sunlight color.
    L.litCss = css(mixLab(L.color, palette.sunlight, 0.55 * (1 - fade)));
    L.lightCss = css(mixLab(L.color, palette.bg, 0.22));
    L.darkCss = css(mixLab(L.color, palette.ink, 0.18));
    L.sunSide = model.sun.x < 0.5 ? 1 : -1;
    const top = H * (L.base - L.amp), bottom = H * L.base + H * L.amp * 0.4;
    L.grad = ctx.createLinearGradient(0, top, 0, bottom);
    L.grad.addColorStop(0, css(L.color));
    L.grad.addColorStop(1, css(mixLab(L.color, palette.bg, 0.4 * haze))); // valley mist
    // Ridge height at every column boundary, so each stroke's top edge follows the ridge line.
    L.ys = new Float32Array(cols + 1);
    for (let k = 0; k <= cols; k++) L.ys[k] = H * (L.base - L.amp * ridge(model, L, (k * DX) / W));
    // Each column waits a little extra before it is painted, so the brush front is ragged.
    L.wait = new Float32Array(cols);
    for (let c = 0; c < cols; c++) L.wait[c] = strokeRng(L, c)() * JITTER;
    L.done = new Uint8Array(cols);
    L.lo = 0;
  }
}

function paintSky() {
  const { sun, glow, bg } = palette;
  ctx.globalAlpha = 1;
  ctx.fillStyle = css(bg);
  ctx.fillRect(0, 0, W, H);
  const sx = model.sun.x * W, sy = model.sun.y * H, r = H * 0.05;
  const g = ctx.createRadialGradient(sx, sy, r, sx, sy, H * 0.55);
  g.addColorStop(0, css(glow, 0.9));
  g.addColorStop(1, css(glow, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = css(sun);
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
}

// Randomness for one stroke is a hash of seed, layer and column, never a shared stream, so the
// painting comes out the same whatever order or frame rate the columns are painted at.
const strokeRng = (L, c) => mulberry32(Math.imul(model.seed, 2654435761) ^ Math.imul(L.i + 1, 40503) ^ Math.imul(c + 1, 2246822519));

// One vertical brush stroke: a trapezoid whose top edge follows the ridge, then light and bristles.
function paintColumn(L, c) {
  const r = strokeRng(L, c + 7919), x = c * DX, y0 = L.ys[c], y1 = L.ys[c + 1], y = Math.min(y0, y1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = L.grad;
  ctx.beginPath();
  ctx.moveTo(x, y0); ctx.lineTo(x + DX, y1); ctx.lineTo(x + DX, H); ctx.lineTo(x, H);
  ctx.fill();

  // Faces turned toward the sun catch light; slope is the ridge's dy/dx in canvas pixels.
  const lit = clamp(-((y1 - y0) / DX) * L.sunSide * 1.4, 0, 1);
  if (lit > 0.04) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = L.litCss;
    ctx.fillRect(x, Math.max(y0, y1), DX, H * L.amp * 0.35 * lit * (0.8 + 0.4 * r()));
  }
  // Bristle texture: two short horizontal dabs near the crest, lighter or darker than the layer.
  for (let k = 0; k < 2; k++) {
    ctx.globalAlpha = 0.12 + 0.12 * r();
    ctx.fillStyle = r() < 0.5 ? L.lightCss : L.darkCss;
    ctx.beginPath();
    ctx.ellipse(x + r() * DX, y + 2 + r() ** 2 * H * L.amp * 0.8, 1 + 2.5 * r(), 0.5 + 0.8 * r(), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Paint every column that each layer's brush front has reached. The brush sweeps away from the sun.
// A column also waits for the layer behind it, which makes back-to-front a rule, not a timing hope.
function paintTo() {
  model.layers.forEach((L, li) => {
    const behind = model.layers[li - 1];
    const front = L.progress * (cols + JITTER);
    for (let n = L.lo; n < cols && n <= front; n++) {
      const c = L.sunSide > 0 ? n : cols - 1 - n;
      if (L.done[c] || n + L.wait[c] > front || (behind && !behind.done[c])) continue;
      paintColumn(L, c);
      L.done[c] = 1;
    }
    while (L.lo < cols && L.done[L.sunSide > 0 ? L.lo : cols - 1 - L.lo]) L.lo++;
  });
  ctx.globalAlpha = 1;
}

// Throw away the pixels and repaint up to the current progress: used after resize, theme or haze.
function repaintNow() {
  prepareLayers();
  paintSky();
  paintTo();
}

function start(seed) {
  model = build(seed);
  document.getElementById('seed-note').textContent = `seed ${seed}`;
  tl?.kill();
  // Paused on purpose: the frame loop below advances it, so it stops when the figure is off screen.
  tl = gsap.timeline({ paused: true })
    .to(model.layers, { progress: 1, duration: 2.2, ease: 'power1.inOut', stagger: 0.55 });
  if (reducedMotion()) tl.progress(1);
  repaintNow();
}

function resize() {
  ({ ctx, width: W, height: H } = fitCanvas(canvas));
  readPalette();
  repaintNow();
}

document.getElementById('new').addEventListener('click', () => start(Math.floor(Math.random() * 1e6)));
document.getElementById('repaint').addEventListener('click', () => start(model.seed));
hazeInput.addEventListener('input', () => {
  document.getElementById('haze-out').value = Number(hazeInput.value).toFixed(2);
  repaintNow();
});
onThemeChange(() => { readPalette(); repaintNow(); });
let lastW = 0;
new ResizeObserver(() => {
  if (Math.abs(stage.clientWidth - lastW) < 1) return;
  lastW = stage.clientWidth;
  resize();
}).observe(stage);

({ ctx, width: W, height: H } = fitCanvas(canvas));
lastW = W;
readPalette();
start(Math.floor(Math.random() * 1e6));

loop((dt) => {
  if (!tl || tl.progress() >= 1) return;
  tl.time(tl.time() + dt);
  paintTo();
}, stage);
