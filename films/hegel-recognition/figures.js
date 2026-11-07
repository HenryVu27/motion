// The cast of the Hegel film, as geometry plus three ways of drawing it.
// One profile curve, mirrored: A (left, the lord) and B (right, the bondsman) are exact mirror
// images, so the space between them is a symmetric vessel (script.md, "Geometry rule").
import {
  INK, rng, clamp, lerp, pathOf, smooth, circlePts, paper,
  inkLayer, inkLine, formOutline, halftone, flowStrokes, stipple, wash, construction,
} from '../../film/kit.js';
import { spring, ballistic } from '../../film/motion.js';

export const LIGHT = [-0.6, -0.8];
export const SKIN_A = '#ead3ad', SKIN_B = '#e6cfac', OCHRE = '#d4a65e', GREY = '#7d889b';
const PIVOT = [300, 640];   // where A's head and neck turn

// ---------- The profile ----------

// A's front edge, forehead to chest, facing right. Where it pushes toward the middle (nose, lips,
// chin) the vessel between the two faces narrows; where it recedes (brow, neck) the vessel swells.
const FRONT = smooth([
  [352, 175], [374, 204], [390, 240], [399, 276], [404, 300], [399, 318], [391, 333], [401, 352],
  [421, 373], [441, 392], [434, 405], [414, 411], [420, 428], [425, 441], [413, 452], [418, 465],
  [423, 477], [412, 491], [406, 502], [418, 518], [428, 535], [422, 553], [402, 567], [390, 592],
  [386, 640], [389, 700], [396, 760], [402, 790], [404, 1010],
], 6);
// Back of the head and shoulders, from the bottom of the frame up and over to the forehead.
const BACK = smooth([
  [0, 1010], [0, 800], [70, 760], [175, 700], [212, 620], [208, 548], [186, 486], [150, 420],
  [132, 340], [140, 258], [176, 186], [238, 142], [300, 136], [352, 175],
], 6);
export const EYE = [376, 318];

const rotate = ([x, y], a, [px, py] = PIVOT) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
};
const mirror = ([x, y]) => [1000 - x, y];
// The cast stands a little smaller than the frame, feet on the bottom edge, room above the heads.
const SCALE = 0.86;
const place = ([x, y]) => [500 + (x - 500) * SCALE, 1000 - (1000 - y) * SCALE];

// Where a figure's outline and front edge are, given its side and its tilt (radians, + leans in).
export function figure(side, tilt = 0) {
  const pose = (p) => place(rotate(p, tilt));
  const flip = side === 'B' ? mirror : (p) => p;
  const front = FRONT.map(pose).map(flip);
  const outline = [...front, ...BACK.map(pose).map(flip).slice(1)];
  return { side, tilt, front, outline, eye: flip(pose(EYE)), skull: flip(pose([258, 300])), pivot: flip(PIVOT) };
}

// The vessel between two figures: A's front edge down, B's front edge back up, cut flat at the
// brow and at the shoulders.
export function vessel(a, b, top = place([0, 182])[1], bottom = place([0, 790])[1]) {
  const inRange = (p) => p[1] >= top && p[1] <= bottom;
  const left = a.front.filter(inRange), right = b.front.filter(inRange).reverse();
  return [...left, ...right];
}

// ---------- Three ways to draw a head ----------

// As a plan: blue construction lines (a cranium circle, the profile, guides that run on past it).
export function drawPlan(ctx, f, { progress = 1, alpha = 0.7, seed = 1 } = {}) {
  const cc = f.skull;
  inkLine(ctx, circlePts(cc[0], cc[1], 150, 72), { width: 0.8, color: INK.blue, alpha: alpha * 0.6, progress, taper: false, passes: 1, seed });
  inkLine(ctx, f.outline.slice(0, -6), { width: 1, color: INK.blue, alpha, progress, taper: false, passes: 1, wobble: 0.6, seed: seed + 1 });
  eye(ctx, f, { color: INK.blue, alpha, open: 1 });
}

// As a person: a skin wash, cross-contour strokes wrapping the skull, an ink outline that
// thins toward the light, an eye. `ink` (0 to 1) draws the outline on.
export function drawInked(ctx, f, { ink = 1, skin = SKIN_A, blink = 0, seed = 3, fray = 0 } = {}) {
  ctx.save(); pathOf(ctx, f.outline); ctx.clip(); ctx.drawImage(paper(ctx.canvas.width), 0, 0, 1000, 1000); ctx.restore();
  inkLayer(ctx, (g) => { g.fillStyle = skin; g.globalAlpha = ink; pathOf(g, f.outline); g.fill(); }, { grain: 0.4, seed: 5 });
  const cc = f.skull;
  // Strokes wrap around the skull (tangent to circles about its center), denser away from the light.
  flowStrokes(ctx, f.outline, {
    dir: (x, y) => Math.atan2(y - (cc[1] + 40), x - (cc[0] + (f.side === 'A' ? 260 : -260))) + Math.PI / 2,
    // Only on the skull, and only on its shadow side: a fingerprint of strokes everywhere reads as texture, not form.
    tone: (x, y) => ink * clamp(((x - cc[0]) * -LIGHT[0] + (y - cc[1]) * -LIGHT[1]) / 160) * clamp(1.15 - Math.hypot(x - cc[0], y - cc[1]) / 150),
    spacing: 9, length: 30, color: INK.sepia, width: 0.8, alpha: 0.42, seed: seed + 7,
  });
  if (ink > 0.02) formOutline(ctx, f.outline, { light: LIGHT, width: 2.6, seed: seed + 11, lost: 0.42 + fray * 0.5, alpha: ink });
  eye(ctx, f, { color: INK.ink, alpha: ink, open: 1 - blink });
}

// As a thing: flat grey-blue halftone, no line, no eye. Seen, not seeing.
export function drawThing(ctx, f, { amount = 1 } = {}) {
  if (amount <= 0) return;
  ctx.save(); pathOf(ctx, f.outline); ctx.clip(); ctx.globalAlpha = amount; ctx.drawImage(paper(ctx.canvas.width), 0, 0, 1000, 1000); ctx.restore();
  inkLayer(ctx, (g) => halftone(g, f.outline, { tone: () => 0.42 * amount, cell: 9, angle: 0.4, color: GREY }), { grain: 0.3, seed: 4 });
}

export function eye(ctx, f, { color = INK.ink, alpha = 1, open = 1 }) {
  const [x, y] = f.eye, dir = f.side === 'A' ? 1 : -1, h = 6 * clamp(open, 0.08, 1);
  inkLine(ctx, [[x - 13 * dir, y], [x, y - h], [x + 13 * dir, y + 1]], { width: 1.6, color, alpha, taper: true, seed: 31 });
  if (open > 0.3) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 3 * dir, y, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  inkLine(ctx, [[x - 12 * dir, y + 1], [x + 12 * dir, y + 2]], { width: 0.9, color, alpha: alpha * 0.8, taper: true, seed: 32 });
}

// The space between them, inked as a thing in its own right: ochre wash and a found edge.
export function drawVessel(ctx, poly, { amount = 1, seed = 41 } = {}) {
  if (amount <= 0) return;
  ctx.save(); ctx.globalAlpha = amount;
  wash(ctx, poly, { color: OCHRE, seed, layers: 12, alpha: 0.11, spread: 0.02 });
  ctx.restore();
  formOutline(ctx, poly, { light: LIGHT, width: 2.2, color: INK.sepia, seed: seed + 1, lost: 0.5, alpha: amount });
}

// ---------- Beat 1 props: a branch, a fruit, a reaching hand ----------

export const FRUIT = [668, 410];

export function branch(ctx, { dy = 0 } = {}) {
  const pts = [[1010, 120 + dy], [900, 210 + dy], [790, 300 + dy], [705, 360 + dy], [FRUIT[0] + 4, FRUIT[1] - 34 + dy]];
  inkLine(ctx, smooth(pts, 6), { width: 3.2, color: INK.sepia, seed: 51 });
  for (const [u, s] of [[0.25, 1], [0.55, -1]]) {
    const i = Math.floor(u * (pts.length - 1)), [x, y] = pts[i];
    const leaf = smooth([[x, y], [x + 30 * s, y - 40], [x + 70 * s, y - 28], [x + 34 * s, y + 4]], 5, true);
    inkLayer(ctx, (g) => { g.fillStyle = '#7da35a'; pathOf(g, leaf); g.fill(); }, { grain: 0.45, seed: 7 });
    inkLine(ctx, [...leaf, leaf[0]], { width: 1.2, color: '#2f4a22', seed: 52 + i, taper: false });
  }
}

// A fruit: risograph red over a yellow printed slightly off register. grow is its scale (0 to ~1).
export function fruit(ctx, [x, y], grow = 1) {
  if (grow <= 0.01) return;
  const r = 26 * grow;
  inkLayer(ctx, (g) => { g.fillStyle = INK.yellow; pathOf(g, circlePts(x, y, r)); g.fill(); }, { grain: 0.5, seed: 8, offset: [-4, 3] });
  inkLayer(ctx, (g) => { g.fillStyle = INK.red; pathOf(g, circlePts(x, y, r)); g.fill(); }, { grain: 0.5, seed: 9 });
  inkLine(ctx, [[x + 2, y - r], [x + 5, y - r - 12 * grow]], { width: 2, color: INK.sepia, seed: 53 });
}

// Eaten: the fruit breaks into stipple dust that falls and fades.
export function dust(ctx, [x, y], k, seed = 1) {
  if (k <= 0 || k > 0.9) return;
  const R = rng(seed);
  ctx.save();
  ctx.fillStyle = INK.red;
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2, sp = 40 + R() * 120;
    const [px, py] = ballistic([x + Math.cos(a) * R() * 20, y + Math.sin(a) * R() * 20], [Math.cos(a) * sp, Math.sin(a) * sp - 60], 700, k);
    ctx.globalAlpha = (1 - k / 0.9) * 0.9;
    ctx.beginPath(); ctx.arc(px, py, 1.2 + R() * 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// An arm that hinges at the shoulder and the elbow (two-bone inverse kinematics), ending in an
// open hand whose fingers curl shut with grip. reach (0 to 1) carries the wrist from rest to the
// target; the hand turns a beat after the forearm (follow-through via `lagAngle`).
export function hand(ctx, { shoulder = [330, 800], rest = [430, 900], target, reach = 0, grip = 0, lagAngle = 0, skin = SKIN_A, sleeve = '#a8784c', seed = 61 }) {
  const S = place(shoulder), R = place(rest), T = [target[0] - 34, target[1] + 22];
  const W = [lerp(R[0], T[0], reach), lerp(R[1], T[1], reach)];
  const L1 = 255, L2 = 245;   // long enough to reach with the elbow still bent
  const dx = W[0] - S[0], dy = W[1] - S[1], d = Math.min(Math.hypot(dx, dy), L1 + L2 - 1);
  const base = Math.atan2(dy, dx), bendA = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const E = [S[0] + Math.cos(base + bendA) * L1, S[1] + Math.sin(base + bendA) * L1];   // elbow drops below the line
  const Wr = [E[0] + Math.cos(Math.atan2(W[1] - E[1], W[0] - E[0])) * L2, E[1] + Math.sin(Math.atan2(W[1] - E[1], W[0] - E[0])) * L2];
  // A tapered sleeve along shoulder, elbow, wrist.
  const bone = smooth([S, E, Wr], 8), n = bone.length;
  const side = (k) => bone.map(([x, y], i) => {
    const [ax, ay] = bone[Math.max(0, i - 1)], [bx, by] = bone[Math.min(n - 1, i + 1)];
    const l = Math.hypot(bx - ax, by - ay) || 1, w = lerp(30, 19, i / (n - 1));
    return [x - ((by - ay) / l) * w * k, y + ((bx - ax) / l) * w * k];
  });
  const arm = [...side(1), ...side(-1).reverse()];
  // Inks multiply, so lay fresh paper under the arm or the body's outline shows through it.
  ctx.save(); pathOf(ctx, arm); ctx.clip(); ctx.drawImage(paper(ctx.canvas.width, 7, INK.kraft), 0, 0, 1000, 1000); ctx.restore();
  inkLayer(ctx, (g) => { g.fillStyle = sleeve; pathOf(g, arm); g.fill(); }, { grain: 0.5, seed: 6 });
  formOutline(ctx, arm, { light: LIGHT, width: 2.2, seed, lost: 0.5 });
  // The hand, in the forearm's frame, turned a little late.
  const fa = Math.atan2(Wr[1] - E[1], Wr[0] - E[0]) + lagAngle;
  ctx.save();
  ctx.translate(Wr[0], Wr[1]); ctx.rotate(fa);
  const palm = smooth([[-6, -22], [30, -24], [48, -8], [46, 14], [20, 24], [-6, 20]], 5, true);
  ctx.save(); pathOf(ctx, palm); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(paper(ctx.canvas.width, 7, INK.kraft), 0, 0); ctx.restore();
  inkLayer(ctx, (g) => { g.fillStyle = skin; pathOf(g, palm); g.fill(); }, { grain: 0.4, seed: 5 });
  formOutline(ctx, palm, { light: LIGHT, width: 1.8, seed: seed + 2, lost: 0.55 });
  for (let f = 0; f < 4; f++) {
    // Each finger has two joints; grip folds both, the outer joint a little more.
    const y0 = -18 + f * 11, L = 30 - Math.abs(f - 1.5) * 4, a1 = grip * 1.5, a2 = a1 + grip * 0.9;
    const k1 = [48 + Math.cos(a1) * L * 0.55, y0 + Math.sin(a1) * L * 0.55];
    inkLine(ctx, [[46, y0], k1, [k1[0] + Math.cos(a2) * L * 0.45, k1[1] + Math.sin(a2) * L * 0.45]], { width: 5.5, color: skin, seed: seed + 3 + f, taper: false, passes: 1 });
    inkLine(ctx, [[46, y0], k1, [k1[0] + Math.cos(a2) * L * 0.45, k1[1] + Math.sin(a2) * L * 0.45]], { width: 1.5, seed: seed + 8 + f });
  }
  const ta = -1.1 + grip * 0.9;
  inkLine(ctx, [[14, -20], [14 + Math.cos(ta) * 18, -20 + Math.sin(ta) * 18], [14 + Math.cos(ta + 0.5) * 32, -20 + Math.sin(ta + 0.5) * 32]], { width: 1.6, seed: seed + 13 });
  ctx.restore();
}
