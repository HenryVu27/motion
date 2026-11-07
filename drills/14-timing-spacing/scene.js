// The dewdrop scene: its motion as pure functions of time, and the flat way of drawing it.
// Drill 14 animates it; drill 15 reuses the same motion and changes only the drawing.
import { paper, inkLayer, inkLine, inkShape, hatch, halftone, pathOf, circlePts, rng, clamp, lerp, ease, INK } from '../../film/kit.js';

export const SIZE = 720, FPS_DRAW = 12, CYCLE = 3.6;
export const STEM = [170, 150];            // where the leaf is held; it bends about this point
export const TIP = [540, 300];             // the leaf tip the drop hangs from
export const POOL_Y = 760;                 // water surface the drop falls into
export const RELEASE = 1.55, IMPACT = 2.2;
// The pond is centred just below where the drop lands, so ripples spread inside the water.
export const POND = { cx: 500, cy: POOL_Y + 30, rx: 460, ry: 85 }; // seconds into the cycle

export const PRINCIPLES = {
  twos: 'On twos',
  anticipation: 'Anticipation',
  squash: 'Squash and stretch',
  gravity: 'Gravity spacing',
  follow: 'Follow-through',
  secondary: 'Splash and ripples',
};

// ---------- State as functions of time ----------

// The leaf is a cantilever, not a stiff board. leafAt returns a bend: a map from rest-pose points
// to where they are now. Deflection grows along the leaf (shape u^2 (3 - u) / 2, zero at the stem,
// one at the tip), so the tip that carries the drop sags most. On release the stem lets go first
// and the tip follows late, overshoots and whips: overlapping action.
const ROOT = [STEM[0] - 140, STEM[1] - 34];
const AXIS = [TIP[0] - ROOT[0], TIP[1] - ROOT[1]], AXIS2 = AXIS[0] ** 2 + AXIS[1] ** 2;
const SAG = 34;                                                     // units the tip drops under the full drop
const deflection = (u) => (u * u * (3 - u)) / 2;
export function leafAt(t, on) {
  if (!on.follow) return (p) => p;
  const sag = (u) => {
    if (t < RELEASE) return SAG * ease.inOut(clamp((t - 0.3) / (RELEASE - 0.3)));
    const k = t - RELEASE - 0.1 * u;                                // the release travels stem to tip
    if (k < 0) return SAG;
    return SAG * Math.exp(-3 * k) * Math.cos(10 * k) - 10 * u * u * Math.exp(-5 * k) * Math.sin(24 * k);
  };
  return ([x, y]) => {
    const u = clamp(((x - ROOT[0]) * AXIS[0] + (y - ROOT[1]) * AXIS[1]) / AXIS2);
    return [x, y + sag(u) * deflection(u)];
  };
}
export const tipAt = (t, on) => leafAt(t, on)(TIP);

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
export function splashAt(t) {
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

export function dropPath(d) {
  // Teardrop: x = sin(th) * sin(th/2)^m, y = -cos(th). m = 0 is a circle; larger m pulls a point upward.
  const pts = [], w = d.r / Math.sqrt(d.stretch), h = d.r * d.stretch;
  for (let i = 0; i <= 48; i++) {
    const th = (i / 48) * Math.PI * 2;
    const m = d.neck;
    pts.push([d.x + w * Math.sin(th) * Math.pow(Math.abs(Math.sin(th / 2)), m), d.y - h * Math.cos(th) * (Math.cos(th) > 0 ? 1 + 0.35 * m : 1)]);
  }
  return pts;
}

export function drawDrop(ctx, d, seed) {
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

// Leaf geometry in its rest pose: the outline and the midrib. Drawing code rotates it about STEM.
export function leafShape() {
  const [tx, ty] = TIP;
  const top = [], bot = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, x = lerp(STEM[0] - 120, tx, u), y = lerp(STEM[1] - 30, ty, u ** 1.4);
    const w = 70 * Math.sin(Math.PI * Math.pow(u, 0.8)) * (1 - u * 0.15);
    top.push([x + w * 0.35, y - w]);
    bot.unshift([x - w * 0.35, y + w * 0.8]);
  }
  const rib = Array.from({ length: 21 }, (_, i) => { const u = i / 20; return [lerp(STEM[0] - 140, tx, u), lerp(STEM[1] - 34, ty, u ** 1.4)]; });
  return { leaf: [...top, ...bot], rib };
}

export function drawLeaf(ctx, bend = (p) => p) {
  const shape = leafShape(), leaf = shape.leaf.map(bend), rib = shape.rib.map(bend);
  inkLayer(ctx, (g) => { g.fillStyle = '#7da35a'; pathOf(g, leaf); g.fill(); }, { grain: 0.45, seed: 7 });
  hatch(ctx, leaf, { angle: 0.9, spacing: 5, tone: (x, y) => (y - (STEM[1] + (x - STEM[0]) * 0.32)) / 50, levels: [0.1, 0.6], color: '#2f4a22', width: 0.8, alpha: 0.55, seed: 21 });
  inkLine(ctx, rib, { width: 1.8, seed: 22, color: '#2f4a22' });
  inkShape(ctx, leaf, { width: 1.5, seed: 23 });
}

export function drawPool(ctx, splash, t) {
  const pool = circlePts(POND.cx, POND.cy, 1, 64).map(([x, y]) => [POND.cx + (x - POND.cx) * POND.rx, POND.cy + (y - POND.cy) * POND.ry]);
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
export function onionSkin(ctx, t, stateFn, step) {
  for (let k = 6; k >= 1; k--) {
    const d = stateFn(t - k * step);
    if (!d.visible) continue;
    inkShape(ctx, dropPath(d), { width: 1.1, color: INK.red, seed: 50 + k, alpha: 0.12 + 0.07 * (6 - k), wobble: 0.3 });
  }
}
export function spacingChart(ctx, stateFn, from, to, step, now) {
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

export function draw(canvas, T, on, tools, rigid = false) {
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
  drawLeaf(ctx, rigid ? undefined : leafAt(t, on));
  drawPool(ctx, !rigid && on.secondary ? splashAt(t) : null, t);
  if (tools.onion) onionSkin(ctx, t, state, rigid ? 2 / 30 : step);
  drawDrop(ctx, state(t), 11);
}

