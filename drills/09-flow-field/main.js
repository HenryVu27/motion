import { createNoise3D } from 'simplex-noise';
import { fitCanvas, loop, token, reducedMotion, onThemeChange } from '../../shared/page.js';

const TAU = Math.PI * 2;
const stage = document.getElementById('stage');
const paint = document.getElementById('paint');
const overlay = document.getElementById('overlay');
const $ = (id) => document.getElementById(id);
const ui = { scale: $('scale'), count: $('count'), mode: $('mode'), curl: $('curl'), field: $('show-field') };

// Seeded PRNG (mulberry32): the same seed always rebuilds the same noise field.
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const state = {
  seed: 0, noise3D: null, rand: Math.random, z: 0,
  scale: Number(ui.scale.value), fade: false, curl: false, showField: false,
  particles: [], trace: [],
  pctx: null, octx: null, W: 0, H: 0, colors: {},
};

const SPEED = 1.1;      // px per 60 Hz frame
const E = 0.01;         // finite-difference step, in noise units

// Direction at (x, y): an angle read from noise, or the 90 degree rotated gradient (curl).
function velocity(x, y) {
  const X = x * state.scale, Y = y * state.scale, z = state.z, n = state.noise3D;
  if (!state.curl) {
    const a = n(X, Y, z) * TAU;
    return [Math.cos(a), Math.sin(a)];
  }
  const dx = (n(X + E, Y, z) - n(X - E, Y, z)) / (2 * E);
  const dy = (n(X, Y + E, z) - n(X, Y - E, z)) / (2 * E);
  // Mean gradient length of simplex noise is about 2.2, so this keeps the average speed near 1.
  return [dy * 0.45, -dx * 0.45];
}

function spawn(p) {
  p.x = state.rand() * state.W;
  p.y = state.rand() * state.H;
  p.px = p.x; p.py = p.y;
  p.life = 2 + state.rand() * 6; // seconds; staggered so respawns never arrive in waves
  return p;
}

function readColors() {
  state.colors = { bg: token('--bg'), ink: token('--mark-ink'), mark: token('--mark-strong'), accent: token('--mark-accent') };
}

function clearPaint() {
  state.pctx.fillStyle = state.colors.bg;
  state.pctx.fillRect(0, 0, state.W, state.H);
}

function setCount(n) {
  const ps = state.particles;
  while (ps.length < n) ps.push(spawn({}));
  ps.length = n;
}

// Move every particle one step and draw all segments as a single path.
function advance(dt) {
  const k = dt * 60;
  const { pctx, W, H } = state;
  pctx.beginPath();
  for (const p of state.particles) {
    const [vx, vy] = velocity(p.x, p.y);
    p.px = p.x; p.py = p.y;
    p.x += vx * SPEED * k; p.y += vy * SPEED * k;
    p.life -= dt;
    if (p.life < 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) { spawn(p); continue; }
    pctx.moveTo(p.px, p.py);
    pctx.lineTo(p.x, p.y);
  }
  pctx.stroke();
}

function strokeStyle() {
  const { pctx, colors } = state;
  pctx.strokeStyle = colors.ink;
  pctx.lineWidth = 0.8;
  pctx.globalAlpha = state.fade ? 0.55 : 0.07;
}

// The traced particle lives on the overlay, so it reads as one path in both modes.
const tracer = { x: 0, y: 0, px: 0, py: 0, life: 0 };
function advanceTracer(dt) {
  const k = dt * 60, t = tracer;
  const [vx, vy] = velocity(t.x, t.y);
  t.x += vx * SPEED * k; t.y += vy * SPEED * k;
  t.life -= dt;
  if (t.x < 0 || t.x > state.W || t.y < 0 || t.y > state.H || t.life < 0) {
    t.x = state.W * (0.2 + 0.6 * state.rand()); t.y = state.H * (0.2 + 0.6 * state.rand());
    t.life = 14; state.trace = [];
  }
  state.trace.push(t.x, t.y);
  if (state.trace.length > 2 * 240) state.trace.splice(0, 2);
}

function drawOverlay() {
  const { octx, W, H, colors } = state;
  octx.clearRect(0, 0, W, H);
  if (state.showField) {
    // The field itself: a grid of short ticks, one per 24 px cell.
    const cell = 24;
    octx.strokeStyle = colors.mark;
    octx.lineWidth = 1;
    octx.beginPath();
    for (let y = cell / 2; y < H; y += cell) {
      for (let x = cell / 2; x < W; x += cell) {
        const [vx, vy] = velocity(x, y);
        const len = Math.hypot(vx, vy) || 1, s = 9 * Math.min(len, 1.4) / len;
        octx.moveTo(x - vx * s, y - vy * s);
        octx.lineTo(x + vx * s, y + vy * s);
      }
    }
    octx.stroke();
  }
  const tr = state.trace;
  if (tr.length >= 4) {
    octx.strokeStyle = colors.accent;
    octx.lineWidth = 2;
    octx.lineJoin = octx.lineCap = 'round';
    octx.beginPath();
    octx.moveTo(tr[0], tr[1]);
    for (let i = 2; i < tr.length; i += 2) octx.lineTo(tr[i], tr[i + 1]);
    octx.stroke();
    octx.fillStyle = colors.accent;
    octx.beginPath();
    octx.arc(tr[tr.length - 2], tr[tr.length - 1], 3.5, 0, TAU);
    octx.fill();
  }
}

function step(dt) {
  if (!dt) return;
  const { pctx, W, H } = state;
  if (state.fade) {
    // Fade by overdraw: a translucent background rect, alpha corrected for frame time.
    state.z += dt * 0.04; // a slowly drifting field reads as weather
    pctx.globalAlpha = 1 - (1 - 0.06) ** (dt * 60);
    pctx.fillStyle = state.colors.bg;
    pctx.fillRect(0, 0, W, H);
  }
  strokeStyle();
  advance(dt);
  pctx.globalAlpha = 1;
  advanceTracer(dt);
  drawOverlay();
}

// Reduced motion: run the simulation off screen and show the finished drawing once.
function staticFrame() {
  strokeStyle();
  for (let i = 0; i < 240; i++) { advance(1 / 60); advanceTracer(1 / 60); }
  state.pctx.globalAlpha = 1;
  drawOverlay();
}

function restart({ newSeed = false } = {}) {
  if (newSeed || !state.noise3D) {
    state.seed = Math.floor(Math.random() * 1e6);
    $('seed-note').textContent = `seed ${state.seed}`;
  }
  // Rebuild from the seed so field, spawn points and tracer replay identically.
  state.rand = mulberry32(state.seed);
  state.noise3D = createNoise3D(mulberry32(state.seed ^ 0x9e3779b9));
  state.z = 0;
  ({ ctx: state.pctx, width: state.W, height: state.H } = fitCanvas(paint));
  ({ ctx: state.octx } = fitCanvas(overlay));
  readColors();
  clearPaint();
  state.particles = [];
  setCount(Number(ui.count.value));
  state.trace = [];
  tracer.life = -1;
  if (reducedMotion()) staticFrame();
}

const toggle = (btn, key, after) => btn.addEventListener('click', () => {
  state[key] = !state[key];
  btn.setAttribute('aria-pressed', String(state[key]));
  after?.();
});

$('reseed').addEventListener('click', () => restart({ newSeed: true }));
toggle(ui.mode, 'fade', () => restart());
toggle(ui.curl, 'curl', () => restart());
toggle(ui.field, 'showField', () => (reducedMotion() ? drawOverlay() : null));
ui.scale.addEventListener('input', () => {
  state.scale = Number(ui.scale.value);
  $('scale-out').value = ui.scale.value;
});
ui.scale.addEventListener('change', () => restart());
ui.count.addEventListener('input', () => {
  $('count-out').value = ui.count.value;
  if (reducedMotion()) restart(); else setCount(Number(ui.count.value));
});

let resizeTimer = 0;
new ResizeObserver(() => {
  if (Math.abs(stage.clientWidth - state.W) < 1) return; // first callback, or height-only change
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => restart(), 150); // a resized canvas loses its pixels anyway
}).observe(stage);
onThemeChange(() => restart());

restart({ newSeed: true });
if (!reducedMotion()) loop(step, stage);
