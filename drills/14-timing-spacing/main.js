// A dewdrop, drawn twice. Timing is how long things take; spacing is how far they move between
// drawings. Everything about the drop is a pure function of time (dropAt, leafAt, splashAt), so
// the onion skin and the spacing chart are just the same functions asked about earlier drawings.
import { paper, inkLayer, inkLine, inkShape, hatch, halftone, pathOf, circlePts, rng, clamp, lerp, ease, INK } from '../../film/kit.js';
import { loop } from '../../shared/page.js';

const SIZE = 720, FPS_DRAW = 12, CYCLE = 3.6;
const STEM = [170, 150];            // where the leaf is held; it bends about this point
const TIP = [540, 300];             // the leaf tip the drop hangs from
const POOL_Y = 760;                 // water surface the drop falls into
const RELEASE = 1.55, IMPACT = 2.2; // seconds into the cycle

export const PRINCIPLES = {
  twos: 'On twos',
  anticipation: 'Anticipation',
  squash: 'Squash and stretch',
  gravity: 'Gravity spacing',
  follow: 'Follow-through',
  secondary: 'Splash and ripples',
};

// ---------- State as functions of time ----------

// The leaf: it sags as the drop gathers weight, then springs back past rest and settles.
function leafAt(t, on) {
  if (!on.follow) return 0;
  if (t < RELEASE) return -0.035 * ease.inOut(clamp((t - 0.3) / (RELEASE - 0.3)));   // sag (radians)
  const k = t - RELEASE;
  return -0.035 * Math.exp(-3.2 * k) * Math.cos(11 * k);                              // damped spring
}
const tipAt = (t, on) => {
  const a = leafAt(t, on), dx = TIP[0] - STEM[0], dy = TIP[1] - STEM[1];
  return [STEM[0] + dx * Math.cos(-a) - dy * Math.sin(-a), STEM[1] + dx * Math.sin(-a) + dy * Math.cos(-a)];
};

// The drop: position, radius, stretch (height/width, area kept), teardrop pull toward the tip.
export function dropAt(t, on) {
  const [tx, ty] = tipAt(t, on);
  if (t < RELEASE) {
    const grow = ease.out(clamp(t / 1.1));
    const r = lerp(12, 33, grow) * (1 + 0.025 * Math.sin(t * 13));                     // a moving hold, never dead still
    const ant = on.anticipation ? ease.in(clamp((t - 1.05) / (RELEASE - 1.05))) : 0;   // gathers and necks down
    const stretch = on.squash ? 1 + 0.5 * ant : 1;
    const neck = on.anticipation ? 0.7 + 1.8 * ant : 0.7;
    return { x: tx, y: ty + r * stretch * 0.95 + 26 * ant, r, stretch, neck, visible: true };
  }
  // The fall starts exactly where the hanging drop let go, and no longer follows the leaf.
  const start = dropAt(RELEASE - 1e-4, on), fall = POOL_Y - 10 - start.y;
  if (t < IMPACT) {
    const k = t - RELEASE, dur = IMPACT - RELEASE;
    const p = on.gravity ? (k / dur) ** 2 : ease.inOut(k / dur);   // the spacing choice: gravity or a placing hand
    const v = on.gravity ? (2 * fall * k) / dur ** 2 / 1400 : 0.4;
    // After release it snaps round, overshoots into a squat and wobbles, while speed stretches it.
    const wobble = on.squash ? -0.28 * Math.exp(-9 * k) * Math.cos(30 * k) : 0;
    const stretch = on.squash ? 1 + 0.35 * clamp(v) + wobble : 1;
    return { x: start.x, y: start.y + p * fall, r: 33, stretch, neck: 0, visible: true };
  }
  const k = t - IMPACT;
  if (on.squash && k < 0.17) return { x: start.x, y: POOL_Y - 8, r: 33, stretch: lerp(0.45, 0.2, k / 0.17), neck: 0, visible: true };
  return { visible: false };
}

// Splash: a crown of droplets thrown on parabolas, and rings spreading and fading.
function splashAt(t) {
  const k = t - IMPACT;
  if (k < 0) return null;
  const R = rng(14);
  const drops = Array.from({ length: 9 }, (_, i) => {
    const a = -Math.PI / 2 + (i - 4) * 0.33 + (R() - 0.5) * 0.2, sp = 330 + R() * 260;
    const x = TIP[0] + Math.cos(a) * sp * k, y = POOL_Y - 4 + Math.sin(a) * sp * k + 0.5 * 1900 * k * k;
    return { x, y, r: 5 + R() * 6, alive: y < POOL_Y + 2 };
  });
  const rings = [0, 0.22, 0.5].map((d) => {
    const q = (k - d) / 1.2;
    return q > 0 && q < 1 ? { r: 30 + 230 * ease.out(q), alpha: 1 - q } : null;
  }).filter(Boolean);
  return { drops, rings };
}

// The version I made first: a fixed circle sliding tip to pool on one ease-in-out curve.
export function rigidDropAt(t) {
  if (t < 1.2) return { x: TIP[0], y: TIP[1] + 30, r: 30, stretch: 1, neck: 0, visible: t > 0.15 };
  if (t < 2.2) return { x: TIP[0], y: TIP[1] + 30 + ease.inOut((t - 1.2) / 1) * (POOL_Y - TIP[1] - 30), r: 30, stretch: 1, neck: 0, visible: true };
  return { visible: false };
}

// ---------- Drawing ----------

function dropPath(d) {
  // Teardrop: x = sin(th) * sin(th/2)^m, y = -cos(th). m = 0 is a circle; larger m pulls a point upward.
  const pts = [], w = d.r / Math.sqrt(d.stretch), h = d.r * d.stretch;
  for (let i = 0; i <= 48; i++) {
    const th = (i / 48) * Math.PI * 2;
    const m = d.neck;
    pts.push([d.x + w * Math.sin(th) * Math.pow(Math.abs(Math.sin(th / 2)), m), d.y - h * Math.cos(th) * (Math.cos(th) > 0 ? 1 + 0.35 * m : 1)]);
  }
  return pts;
}

function drawDrop(ctx, d, seed) {
  if (!d.visible) return;
  const P = dropPath(d);
  inkLayer(ctx, (g) => { g.fillStyle = '#bcd7ea'; pathOf(g, P); g.fill(); }, { grain: 0.35, seed: 5 });
  // The shadowed side and a hard highlight make it read as water, not a ball.
  inkLayer(ctx, (g) => { g.fillStyle = INK.blue; g.globalAlpha = 0.45; g.beginPath(); g.ellipse(d.x + d.r * 0.25 / Math.sqrt(d.stretch), d.y + d.r * 0.35 * d.stretch, d.r * 0.5 / Math.sqrt(d.stretch), d.r * 0.35 * d.stretch, 0.4, 0, Math.PI * 2); g.fill(); }, { grain: 0.5, seed: 6 });
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(d.x - d.r * 0.32 / Math.sqrt(d.stretch), d.y - d.r * 0.3 * d.stretch, d.r * 0.16, d.r * 0.24 * d.stretch, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  inkShape(ctx, P, { width: 1.6, seed, wobble: 0.5 });
}

function drawLeaf(ctx, angle) {
  ctx.save();
  ctx.translate(...STEM); ctx.rotate(-angle); ctx.translate(-STEM[0], -STEM[1]);
  const [tx, ty] = TIP;
  const top = [], bot = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, x = lerp(STEM[0] - 120, tx, u), y = lerp(STEM[1] - 30, ty, u ** 1.4);
    const w = 70 * Math.sin(Math.PI * Math.pow(u, 0.8)) * (1 - u * 0.15);
    top.push([x + w * 0.35, y - w]);
    bot.unshift([x - w * 0.35, y + w * 0.8]);
  }
  const leaf = [...top, ...bot];
  inkLayer(ctx, (g) => { g.fillStyle = '#7da35a'; pathOf(g, leaf); g.fill(); }, { grain: 0.45, seed: 7 });
  hatch(ctx, leaf, { angle: 0.9, spacing: 5, tone: (x, y) => (y - (STEM[1] + (x - STEM[0]) * 0.32)) / 50, levels: [0.1, 0.6], color: '#2f4a22', width: 0.8, alpha: 0.55, seed: 21 });
  const rib = Array.from({ length: 21 }, (_, i) => { const u = i / 20; return [lerp(STEM[0] - 140, tx, u), lerp(STEM[1] - 34, ty, u ** 1.4)]; });
  inkLine(ctx, rib, { width: 1.8, seed: 22, color: '#2f4a22' });
  inkShape(ctx, leaf, { width: 1.5, seed: 23 });
  ctx.restore();
}

function drawPool(ctx, splash, t) {
  const pool = circlePts(500, POOL_Y + 70, 1, 64).map(([x, y]) => [500 + (x - 500) * 460, POOL_Y + 70 + (y - POOL_Y - 70) * 90]);
  inkLayer(ctx, (g) => halftone(g, pool, { tone: (x, y) => clamp(0.15 + (y - POOL_Y) / 260), cell: 9, angle: 0.4, color: INK.federal }), { grain: 0.35, seed: 4 });
  inkShape(ctx, pool, { width: 1.2, color: INK.federal, seed: 30, alpha: 0.7 });
  if (!splash) return;
  for (const ring of splash.rings) {
    const pts = circlePts(TIP[0], POOL_Y, 1, 64).map(([x, y]) => [TIP[0] + (x - TIP[0]) * ring.r, POOL_Y + (y - POOL_Y) * ring.r * 0.22]);
    inkLine(ctx, pts, { width: 1.4, color: INK.federal, seed: 31, alpha: 0.85 * ring.alpha, taper: false });
  }
  for (const d of splash.drops) if (d.alive) drawDrop(ctx, { x: d.x, y: d.y, r: d.r, stretch: 1.2, neck: 0, visible: true }, 40);
}

// The animator's instruments: past drawings as ghosts, and a ruler of where each drawing landed.
function onionSkin(ctx, t, stateFn, step) {
  for (let k = 6; k >= 1; k--) {
    const d = stateFn(t - k * step);
    if (!d.visible) continue;
    inkShape(ctx, dropPath(d), { width: 1.1, color: INK.red, seed: 50 + k, alpha: 0.12 + 0.07 * (6 - k), wobble: 0.3 });
  }
}
function spacingChart(ctx, stateFn, from, to, step, now) {
  const x = 880;
  inkLine(ctx, [[x, TIP[1]], [x, POOL_Y]], { width: 1, seed: 60, color: INK.sepia, alpha: 0.6, taper: false });
  ctx.save();
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillStyle = INK.sepia;
  ctx.textAlign = 'center';
  ctx.fillText('spacing', x, TIP[1] - 22);
  ctx.restore();
  for (let s = from; s <= to + 1e-6; s += step) {
    const d = stateFn(s);
    if (!d.visible) continue;
    const past = s <= now;
    inkLine(ctx, [[x - 18, d.y], [x + 18, d.y]], { width: past ? 2.4 : 1.2, seed: 61 + Math.round(s * 100), color: past ? INK.red : INK.sepia, alpha: past ? 0.95 : 0.4, taper: false });
  }
}

function draw(canvas, T, on, tools, rigid = false) {
  const ctx = canvas.getContext('2d');
  const k = canvas.width / 1000;
  const raw = T % CYCLE;
  const t = on.twos ? Math.floor(raw * FPS_DRAW) / FPS_DRAW : raw;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(paper(canvas.width), 0, 0);
  ctx.setTransform(k, 0, 0, k, 0, 0);

  const state = rigid ? rigidDropAt : (s) => dropAt(s, on);
  const step = rigid ? 1 / 30 : on.twos ? 1 / FPS_DRAW : 1 / 30;
  if (tools.chart) spacingChart(ctx, state, rigid ? 1.2 : RELEASE, rigid ? 2.2 : IMPACT, rigid ? 1 / 12 : 1 / FPS_DRAW, t);
  drawLeaf(ctx, rigid ? 0 : leafAt(t, on));
  drawPool(ctx, !rigid && on.secondary ? splashAt(t) : null, t);
  if (tools.onion) onionSkin(ctx, t, state, rigid ? 2 / 30 : step);
  drawDrop(ctx, state(t), 11);
}

// ---------- Page ----------

const rigid = document.getElementById('rigid'), alive = document.getElementById('alive');
for (const c of [rigid, alive]) { c.width = SIZE; c.height = SIZE; }
const on = Object.fromEntries(Object.keys(PRINCIPLES).map((key) => [key, true]));
const tools = { onion: false, chart: true };
const NONE = Object.fromEntries(Object.keys(PRINCIPLES).map((key) => [key, false]));
let dirty = true;

function toggles(el, labels, state) {
  for (const [key, label] of Object.entries(labels)) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
    b.setAttribute('aria-pressed', String(state[key]));
    b.addEventListener('click', () => { state[key] = !state[key]; b.setAttribute('aria-pressed', String(state[key])); dirty = true; });
    el.append(b);
  }
}
toggles(document.getElementById('principles'), PRINCIPLES, on);
toggles(document.getElementById('tools'), { onion: 'Onion skin', chart: 'Spacing chart' }, tools);

const speed = document.getElementById('speed');
let clock = 0, last = -1;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
loop((dt) => {
  clock += still ? 0 : dt * Number(speed.value);
  const T = still ? 1.9 : clock;
  draw(rigid, T, NONE, tools, true);
  const drawing = Math.floor(T * FPS_DRAW);
  if (dirty || !on.twos || drawing !== last) { draw(alive, T, on, tools); last = drawing; dirty = false; }
}, alive);
speed.addEventListener('input', () => (document.getElementById('speed-out').value = `${speed.value}x`));

window.renderPair = (T) => { draw(rigid, T, NONE, tools, true); draw(alive, T, on, tools); };
window.setTools = (o) => Object.assign(tools, o);
