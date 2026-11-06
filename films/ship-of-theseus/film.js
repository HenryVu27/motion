// The Ship of Theseus, as a 36-second code-drawn film. Six scenes, each a pure function of time.
// Facts follow lessons/ship-of-theseus/sources.md (Plutarch, Theseus 23.1; Plato, Phaedo 58a-c;
// Xenophon, Memorabilia 4.8.2; Hobbes, De Corpore II.11.7).
import {
  INK, rng, hash, paper, noise2, clamp, lerp, span, ease, pathOf, circlePts,
  inkLayer, inkLine, inkShape, hatch, stipple, halftone, wash, caption,
} from '../../film/kit.js';
import { defineFilm } from '../../film/engine.js';

// ---------- The galley ----------

const ROWS = 3, COLS = 8, N = ROWS * COLS, EDGE = 5;

export function hull({ cx, wl, W, D }) {
  return (u, v) => {
    const e = Math.abs(2 * u - 1);
    const deck = wl - 0.62 * D - 0.5 * D * e ** 3 - (u > 0.5 ? 0.22 * D * ((u - 0.5) * 2) ** 4 : 0);
    const depth = D * Math.pow(1 - e ** 2.4, 0.7);
    return [cx - W / 2 + W * u, deck + v * depth];
  };
}
function plankPoly(H, i) {
  const r = Math.floor(i / COLS), c = i % COLS, top = [], bot = [];
  for (let k = 0; k <= EDGE; k++) {
    const u = (c + k / EDGE) / COLS;
    top.push(H(u, r / ROWS));
    bot.unshift(H(u, (r + 1) / ROWS));
  }
  return [...top, ...bot];
}
function hullOutline(H) {
  const pts = [];
  for (let k = 0; k <= 40; k++) pts.push(H(k / 40, 0));
  for (let k = 40; k >= 0; k--) pts.push(H(k / 40, 1));
  return pts;
}
const shift = (P, dx, dy) => P.map(([x, y]) => [x + dx, y + dy]);
const lerpPoly = (A, B, t, lift = 0) => A.map(([x, y], j) => [lerp(x, B[j][0], t), lerp(y, B[j][1], t) - lift]);

// Rot does not come in order: a fixed shuffle decides which plank fails next.
const ORDER = (() => { const a = [...Array(N).keys()], R = rng(7); for (let i = N - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
const SLOT = new Map(ORDER.map((p, k) => [p, k]));

// One plank: wash fill (old ochre or new pale wood), grain lines, rot stipple, ink outline.
function drawPlank(ctx, poly, { kind = 'old', rot = 0, seed = 1, outline = 1, fill = 1, lw = 1 }) {
  if (fill > 0) {
    // Inks multiply, so they can only darken: lay fresh paper under the plank first.
    ctx.save(); pathOf(ctx, poly); ctx.clip(); ctx.globalAlpha = fill; ctx.drawImage(paper(ctx.canvas.width), 0, 0, 1000, 1000); ctx.restore();
    inkLayer(ctx, (g) => { g.fillStyle = kind === 'old' ? INK.ochre : INK.wood; g.globalAlpha = fill; pathOf(g, poly); g.fill(); }, { grain: 0.5, seed: 5 + (seed % 3) });
    const top = poly.slice(0, EDGE + 1), bot = poly.slice(EDGE + 1).reverse();
    for (let g = 1; g <= 2; g++) {
      const t = g / 3 + (rng(seed + g)() - 0.5) * 0.12;
      inkLine(ctx, top.map((p, k) => [lerp(p[0], bot[k][0], t), lerp(p[1], bot[k][1], t)]), { width: 0.7, wobble: 1.4, seed: seed * 7 + g, alpha: 0.35 * fill, color: INK.sepia, passes: 1 });
    }
    if (rot > 0.02) stipple(ctx, poly, { tone: () => rot * 0.9, count: 420, r: 1.1, color: INK.rot, seed: seed + 40, alpha: 0.8 * fill });
  }
  if (outline > 0) inkShape(ctx, poly, { width: 1.3 * lw, wobble: 0.8 * lw, seed: seed + 100, progress: outline, alpha: 0.55 + 0.35 * Math.min(1, lw) });
}

// The whole ship. `plank(i)` returns that plank's state (or null to skip it); `oars` is the stroke
// phase; `rig` fades the mast and sail in.
// `oarAngle(i)` overrides the default oar swing; `sail` bends the canvas (lag: radians the sail trails
// the mast, belly: how far the lower edge billows).
export function drawGalley(ctx, spec, { plank = () => ({ kind: 'old' }), oars = null, oarAngle = null, rig = 1, seed = 1, shade = true, eye = true, interior = false, sail: cloth = { lag: 0, belly: 0 } }) {
  const H = hull(spec), { W, D, wl } = spec;
  const [mx, my] = H(0.5, 0);

  if (rig > 0) {
    ctx.save();
    ctx.globalAlpha = rig;
    // The sail hangs from the yard; lag swings it about the yard, belly bows its lower edge.
    const yardY = wl - D * 2.45, dropY = wl - D * 1.2, sw = Math.sin(cloth.lag) * D * 1.25;
    const sail = [[mx - W * 0.27, yardY], [mx + W * 0.27, yardY], [mx + W * 0.24 + sw, dropY], [mx + sw + cloth.belly * 0.4, dropY + cloth.belly], [mx - W * 0.24 + sw, dropY]];
    wash(ctx, sail, { color: '#efe0c2', seed: seed + 3, layers: 10, alpha: 0.18, spread: 0.04 });
    inkLayer(ctx, (g) => {
      g.fillStyle = INK.red;
      for (const [a, b] of [[0.18, 0.3], [0.52, 0.64]]) {
        g.beginPath();
        g.moveTo(lerp(sail[0][0], sail[4][0], a), lerp(sail[0][1], sail[4][1], a));
        g.lineTo(lerp(sail[1][0], sail[2][0], a), lerp(sail[1][1], sail[2][1], a));
        g.lineTo(lerp(sail[1][0], sail[2][0], b), lerp(sail[1][1], sail[2][1], b));
        g.lineTo(lerp(sail[0][0], sail[4][0], b), lerp(sail[0][1], sail[4][1], b));
        g.fill();
      }
    }, { grain: 0.55, offset: [2.5, -1.5], seed: 6 });
    hatch(ctx, sail, { angle: -1.1, spacing: 5, tone: (x) => (x - (mx + W * 0.05)) / (W * 0.25), levels: [0.3, 0.75], width: 0.7, alpha: 0.5, seed: seed + 8 });
    inkShape(ctx, sail, { width: 1.4, seed: seed + 9 });
    inkLine(ctx, [[mx, my], [mx, wl - D * 2.6]], { width: 3, seed: seed + 10 });
    inkLine(ctx, [[mx - W * 0.29, wl - D * 2.47], [mx + W * 0.29, wl - D * 2.47]], { width: 2.4, seed: seed + 11 });
    ctx.restore();
  }

  // Oars sweep around their oarlocks; blades dip below the waterline.
  if (oars !== null) {
    for (let i = 0; i < 15; i++) {
      const u = 0.16 + (i * 0.68) / 14;
      const [ox, oy] = H(u, 0.3);
      const o = oarAngle ? oarAngle(i) : { a: 2.0 + Math.sin(oars * Math.PI * 2 - i * 0.12) * 0.22, reach: 1 };
      const L = D * 1.05 * (o.reach ?? 1);
      inkLine(ctx, [[ox, oy], [ox + Math.cos(o.a) * L, oy + Math.sin(o.a) * L]], { width: 1.6, seed: seed + 20 + i, wobble: 0.6 });
    }
  }

  // The hull's dark inside, so a missing plank reads as a hole, not as paper.
  if (interior) {
    inkLayer(ctx, (g) => { g.fillStyle = INK.rot; pathOf(g, hullOutline(H)); g.fill(); }, { grain: 0.35, seed: 6 });
    hatch(ctx, hullOutline(H), { angle: 0.6, spacing: 3.5, tone: () => 1, levels: [0.5], color: INK.ink, width: 0.8, alpha: 0.5, seed: seed + 31 });
  }
  for (let i = 0; i < N; i++) {
    const s = plank(i);
    if (!s) continue;
    const poly = s.poly ?? shift(plankPoly(H, i), s.dx ?? 0, s.dy ?? 0);
    drawPlank(ctx, poly, { lw: clamp(D / 140, 0.5, 1.4), ...s, seed: hash(seed, i) % 9973 });
  }
  // Small ships get sparser, lighter hatching, or the shading closes up into a dark cage.
  if (shade) hatch(ctx, hullOutline(H), { angle: -0.7, spacing: 4.5 * Math.sqrt(Math.max(1, 165 / D)), tone: (x, y) => (y - (wl - D * 0.3)) / (D * 0.7), levels: [0.45, 0.8], width: 0.7, alpha: 0.42 * Math.min(1, D / 165) + 0.12, seed: seed + 30 });

  // The painted eye on the bow that Greek warships carried.
  if (eye) {
    const [ex, ey] = H(0.07, 0.35);
    const s = D / 100;
    inkShape(ctx, [[ex - 9 * s, ey], [ex, ey - 5 * s], [ex + 9 * s, ey], [ex, ey + 5 * s]], { width: 1.2, seed: seed + 40 });
    ctx.fillStyle = INK.ink;
    ctx.beginPath(); ctx.arc(ex + 1 * s, ey, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  }
  const [sx, sy] = H(1, 0), [bx, by] = H(0, 0);
  inkLine(ctx, [[sx, sy], [sx + D * 0.28, sy - D * 0.3], [sx + D * 0.08, sy - D * 0.6], [sx - D * 0.06, sy - D * 0.5]], { width: 2.2, seed: seed + 50 });
  inkLine(ctx, [[bx, by], [bx - D * 0.24, by + D * 0.45]], { width: 2.6, seed: seed + 51 });
  return H;
}

// ---------- Scenery ----------

function sea(ctx, y0, t, { seed = 2, deep = 0.36 } = {}) {
  const region = [[0, y0], [1000, y0], [1000, 1000], [0, 1000]];
  inkLayer(ctx, (g) => halftone(g, region, { tone: (x, y) => clamp(((y - y0) / 340) * deep + 0.05, 0, 0.55), cell: 10, angle: 0.4, color: INK.federal, phase: [t * 6, 0] }), { grain: 0.35, seed: 4 });
  for (let r = 0; r < 7; r++) {
    const y = y0 + 6 + r * r * 7;
    const pts = [];
    for (let x = -20; x <= 1020; x += 8) pts.push([x, y + Math.sin(x * 0.03 + t * (1.2 + r * 0.2) + r) * (1.5 + r * 0.5)]);
    inkLine(ctx, pts, { width: 1, color: INK.federal, seed: seed + r, wobble: 0.6, alpha: 0.7, passes: 1 });
  }
}

// Water in front of the hull: the top band of the sea drawn again over the ship, so it sits in it.
function waterFront(ctx, y0, t, { x1 = 1000, depth = 90 } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y0 + 4, x1, depth); ctx.clip();
  inkLayer(ctx, (g) => halftone(g, [[0, y0], [1000, y0], [1000, y0 + depth + 10], [0, y0 + depth + 10]], { tone: (x, y) => clamp(((y - y0) / 340) * 0.36 + 0.05, 0, 0.55) * 0.8, cell: 10, angle: 0.4, color: INK.federal, phase: [t * 6, 0] }), { grain: 0.35, seed: 4, alpha: 0.85 });
  for (let r = 0; r < 3; r++) {
    const y = y0 + 6 + r * r * 7, pts = [];
    for (let x = -20; x <= x1 + 20; x += 8) pts.push([x, y + Math.sin(x * 0.03 + t * (1.2 + r * 0.2) + r) * (1.5 + r * 0.5)]);
    inkLine(ctx, pts, { width: 1, color: INK.federal, seed: 2 + r, wobble: 0.6, alpha: 0.8, passes: 1 });
  }
  ctx.restore();
}

export function sun(ctx, x, y, r, { seed = 3 } = {}) {
  inkLayer(ctx, (g) => halftone(g, circlePts(x, y, r * 2.2), { tone: (px, py) => clamp(1 - Math.hypot(px - x, py - y) / (r * 2.2)) * 0.5, cell: 8, angle: 0.2, color: INK.orange }), { grain: 0.4, seed: 7 });
  inkLayer(ctx, (g) => { g.fillStyle = INK.yellow; pathOf(g, circlePts(x, y, r)); g.fill(); }, { grain: 0.5, seed: 8 });
  inkLayer(ctx, (g) => { g.strokeStyle = INK.red; g.lineWidth = 5; pathOf(g, circlePts(x, y, r)); g.stroke(); }, { grain: 0.45, offset: [4, 3], seed: 9 });
}

function shore(ctx, x0, y0, { seed = 12 } = {}) {
  const edge = [[x0 - 30, 1000], [x0 - 10, y0 + 60], [x0 + 20, y0 + 16], [x0 + 90, y0 + 2], [1000, y0 - 6]];
  const land = [...edge, [1000, 1000]];
  ctx.save(); pathOf(ctx, land); ctx.clip(); ctx.drawImage(paper(ctx.canvas.width), 0, 0, 1000, 1000); ctx.restore();
  inkLayer(ctx, (g) => { g.fillStyle = '#dcc49b'; pathOf(g, land); g.fill(); }, { grain: 0.6, seed: 10 });
  stipple(ctx, land, { tone: (x, y) => 0.06 + (y - y0) / 2600, count: 1800, r: 0.8, color: INK.sepia, seed, alpha: 0.5 });
  inkLine(ctx, edge, { width: 1.6, seed: seed + 1 });
}

function pileSlot(k, x0 = 610, ground = 646) {
  const col = k % 3, row = Math.floor(k / 3);
  const x = x0 + col * 122 + ((row * 37) % 13) - 6, y = ground - (row + 1) * 11, w = 108, h = 9;
  const top = [], bot = [];
  for (let e = 0; e <= EDGE; e++) { top.push([x + (w * e) / EDGE, y]); bot.unshift([x + (w * e) / EDGE, y + h]); }
  return [...top, ...bot];
}

// ---------- Layouts reused across scenes ----------

const WIDE_A = { cx: 280, wl: 628, W: 380, D: 92 };   // the repaired ship, at sea
const WIDE_B = { cx: 790, wl: 622, W: 360, D: 88 };   // the rebuilt ship, on the shore
const bob = (t, k = 1) => Math.sin(t * 1.4) * 3 * k;

// ---------- Scenes ----------

const scenes = [
  { name: 'dawn', dur: 5, draw(ctx, { t }) {
    const horizon = 560;
    // The sun is clipped at the horizon, so it rises out of the sea.
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 1000, horizon); ctx.clip();
    sun(ctx, 640, lerp(650, 330, ease.out(span(t, 0.6, 4.2))), 70);
    ctx.restore();
    sea(ctx, horizon, t, { deep: 0.6 });
    inkLine(ctx, [[30, horizon], [970, horizon]], { width: 2, seed: 61, progress: ease.out(span(t, 0, 1.3)) });
    const x = lerp(-120, 330, ease.out(span(t, 1.6, 5)));
    drawGalley(ctx, { cx: x, wl: horizon + 8, W: 150, D: 38 }, { oars: t * 0.8, seed: 70, shade: false, eye: false });
    waterFront(ctx, horizon, t, { depth: 30 });
  } },

  { name: 'the ship', dur: 6, draw(ctx, { t }) {
    const k = lerp(1, 1.06, ease.inOut(t / 6));
    ctx.translate(500, 520); ctx.scale(k, k); ctx.translate(-500, -520);
    sun(ctx, 820, 170, 52);
    sea(ctx, 640, t);
    drawGalley(ctx, { cx: 500, wl: 650 + bob(t), W: 700, D: 165 }, { oars: t * 0.7, seed: 80, interior: true });
    waterFront(ctx, 640, t);
  } },

  { name: 'rot', dur: 8, draw(ctx, { t }) {
    // Close on the hull: replacement k starts at start(k), sooner and sooner.
    const start = (k) => 0.7 + 6.3 * Math.pow(k / N, 0.62);
    const spec = { cx: 500, wl: 590, W: 1500, D: 380 };
    sea(ctx, 700, t, { deep: 0.7 });
    drawGalley(ctx, spec, {
      seed: 90, rig: 0, oars: null, eye: false, interior: true,
      plank: (i) => {
        const k = SLOT.get(i), s = start(k), dur = Math.max(0.35, 0.9 - k * 0.03);
        const out = span(t, s, s + dur * 0.5), inn = span(t, s + dur * 0.35, s + dur);
        if (out < 1) return { kind: 'old', rot: span(t, s - 1.6, s), dy: ease.in(out) * 520, fill: 1 - out * 0.3, outline: 1 };
        return { kind: 'new', outline: ease.out(span(inn, 0, 0.6)), fill: span(inn, 0.4, 1) };
      },
    });
    waterFront(ctx, 700, t, { depth: 80 });
  } },

  { name: 'all new', dur: 5, draw(ctx, { t }) {
    sun(ctx, 520, 200, 56);
    sea(ctx, 640, t);
    shore(ctx, 560, 650);
    for (let k = 0; k < N; k++) drawPlank(ctx, pileSlot(k), { kind: 'old', rot: 0.6, seed: 300 + k });
    drawGalley(ctx, { ...WIDE_A, wl: WIDE_A.wl + bob(t) }, { plank: () => ({ kind: 'new' }), oars: t * 0.6, seed: 100 });
    waterFront(ctx, 640, t, { x1: 540, depth: 50 });
  } },

  { name: 'rebuild', dur: 6, draw(ctx, { t }) {
    sun(ctx, 520, 200, 56);
    sea(ctx, 640, t);
    shore(ctx, 560, 650);
    drawGalley(ctx, { ...WIDE_A, wl: WIDE_A.wl + bob(t) }, { plank: () => ({ kind: 'new' }), oars: null, seed: 100 });
    waterFront(ctx, 640, t, { x1: 540, depth: 50 });
    const HB = hull(WIDE_B);
    const travel = (k) => span(t, 0.6 + k * 0.15, 1.6 + k * 0.15);
    drawGalley(ctx, WIDE_B, {
      seed: 110, rig: span(t, 4.8, 5.6), oars: null,
      plank: (i) => {
        const k = SLOT.get(i), p = travel(k);
        return { kind: 'old', rot: 0.6, poly: lerpPoly(pileSlot(k), plankPoly(HB, i), ease.inOut(p), Math.sin(Math.PI * p) * 120) };
      },
    });
  } },

  { name: 'which', dur: 6, draw(ctx, { t }) {
    sun(ctx, 520, 270, 46);
    sea(ctx, 640, t);
    shore(ctx, 560, 650);
    drawGalley(ctx, { ...WIDE_A, wl: WIDE_A.wl + bob(t) }, { plank: () => ({ kind: 'new' }), oars: null, seed: 100 });
    waterFront(ctx, 640, t, { x1: 540, depth: 50 });
    drawGalley(ctx, WIDE_B, { plank: () => ({ kind: 'old', rot: 0.6 }), seed: 110 });
    // The question writes itself on, left to right.
    const reveal = ease.inOut(span(t, 0.3, 2.2));
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 1000 * reveal, 1000); ctx.clip();
    caption(ctx, 'Which one is the Ship of Theseus?', 500, 140, { size: 56 });
    ctx.restore();
    caption(ctx, 'Plutarch, Theseus 23.1  ·  Hobbes, De Corpore II.11.7', 500, 200, { size: 22, italic: false, alpha: span(t, 2.6, 3.4), color: INK.sepia });
  } },
];

export default defineFilm({
  title: 'The Ship of Theseus',
  size: 1080,
  fps: 30,
  scenes,
  crossfade: 0.6,
  captions: [
    { at: 0.4, until: 2.3, text: 'Athens, 399 BCE.' },
    { at: 2.4, until: 5.2, text: 'Socrates is condemned, but no one may be executed until the sacred ship returns from Delos.' },
    { at: 5.5, until: 8.5, text: 'The Athenians said it was the very ship Theseus sailed home from Crete.' },
    { at: 8.7, until: 10.9, text: 'To keep it sailing, they repaired it.' },
    { at: 11.3, until: 14.9, text: 'Each rotten plank was taken out, and new timber put in.' },
    { at: 15.1, until: 18.7, text: 'From time to time, for years.' },
    { at: 19.3, until: 21.5, text: 'Until not one original plank was left.' },
    { at: 21.7, until: 23.9, text: 'Is it still the same ship?' },
    { at: 24.3, until: 26.9, text: 'Hobbes, 1655: suppose someone had kept every old plank,' },
    { at: 27.1, until: 29.8, text: 'and rebuilt them, in the same order, into a ship.' },
  ],
});
