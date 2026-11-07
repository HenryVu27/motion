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
// bowAt(u), if given, pitches the head forward about the neck (radians), keeping its size: a bow,
// not a shrink. u runs from the base of the neck (0) to the crown (1); the angle is phased in over
// the neck, and bowAt can lag with u so the crown follows the neck late.
const NECK = [292, 470], NECK_Y = 700, CROWN_Y = 136;   // the nod pivots near the top of the neck, behind the ear
export function figure(side, tilt = 0, bowAt = null) {
  const bowed = ([x, y]) => {
    if (!bowAt || y >= NECK_Y) return [x, y];
    const u = (NECK_Y - y) / (NECK_Y - CROWN_Y);
    return rotate([x, y], bowAt(u) * clamp(u * 3.5), NECK);
  };
  // Tilt turns the head and neck; the bend fades out through the shoulders, so the torso stays put.
  const pose = (p) => { const q = bowed(p); return place(rotate(q, tilt * clamp((780 - q[1]) / 180))); };
  const flip = side === 'B' ? mirror : (p) => p;
  const front = FRONT.map(pose).map(flip);
  const outline = [...front, ...BACK.map(pose).map(flip).slice(1)];
  return { side, tilt, front, outline, eye: flip(pose(EYE)), skull: flip(pose([258, 300])), pivot: flip(PIVOT), bow: bowAt ? bowAt(1) * 200 : 0 };
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
// line (0 to 1) thins only the outline, leaving the person there: a line staked, not a body fading.
export function drawInked(ctx, f, { ink = 1, line = 1, skin = SKIN_A, blink = 0, seed = 3, fray = 0 } = {}) {
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
  if (ink > 0.02) formOutline(ctx, f.outline, { light: LIGHT, width: 2.6 * (0.35 + 0.65 * line), seed: seed + 11, lost: 0.42 + fray * 0.5 + (1 - line) * 0.3, alpha: ink });
  eye(ctx, f, { color: INK.ink, alpha: ink, open: 1 - blink });
}

// As a thing: flat grey-blue halftone, no line, no eye. Seen, not seeing.
export function drawThing(ctx, f, { amount = 1 } = {}) {
  if (amount <= 0) return;
  ctx.save(); pathOf(ctx, f.outline); ctx.clip(); ctx.globalAlpha = amount; ctx.drawImage(paper(ctx.canvas.width), 0, 0, 1000, 1000); ctx.restore();
  inkLayer(ctx, (g) => halftone(g, f.outline, { tone: () => 0.42 * amount, cell: 9, angle: 0.4, color: GREY }), { grain: 0.3, seed: 4 });
}

export function eye(ctx, f, { color = INK.ink, alpha = 1, open = 1 }) {
  // A bowed head looks down: the lid drops and the pupil sinks.
  const down = clamp((f.bow ?? 0) / 90);
  open *= 1 - 0.55 * down;
  const [x, y0] = f.eye, y = y0 + 2 * down, dir = f.side === 'A' ? 1 : -1, h = 6 * clamp(open, 0.08, 1);
  inkLine(ctx, [[x - 13 * dir, y], [x, y - h], [x + 13 * dir, y + 1]], { width: 1.6, color, alpha, taper: true, seed: 31 });
  if (open > 0.3) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 3 * dir, y + 2 * down, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
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

// The fracture the struggle leaves in the vase: a red zigzag down its middle, drawn on with
// `progress`, with red wash bleeding along it as `bleed` rises.
export function crack(ctx, poly, { progress = 1, bleed = 0, seed = 7 } = {}) {
  if (progress <= 0) return;
  const R = rng(seed), ys = poly.map((p) => p[1]), top = Math.min(...ys), bottom = Math.max(...ys);
  const midAt = (y) => { const row = poly.filter((p) => Math.abs(p[1] - y) < 6); return row.length ? row.reduce((s, p) => s + p[0], 0) / row.length : 500; };
  const pts = [];
  for (let y = top + 4; y <= bottom - 4; y += 22) pts.push([midAt(y) + (R() - 0.5) * 34, y]);
  const n = Math.max(2, Math.ceil(pts.length * progress));
  if (bleed > 0) {
    ctx.save(); pathOf(ctx, poly); ctx.clip();
    for (const [x, y] of pts.slice(0, n)) wash(ctx, circlePts(x, y, 26 * bleed + 4, 10), { color: INK.red, seed: seed + Math.round(y), layers: 4, alpha: 0.08 * bleed, spread: 0.2 });
    ctx.restore();
  }
  inkLayer(ctx, (g) => { g.strokeStyle = INK.red; g.lineWidth = 3; g.lineJoin = 'miter'; pathOf(g, pts.slice(0, n), false); g.stroke(); }, { grain: 0.35, offset: [2, 1], seed: 9 });
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

// An arm that hinges at the shoulder and the elbow (two-bone inverse kinematics), ending in a
// mitten hand: a palm, a finger block that bends at the knuckles, and an opposed thumb. reach
// (0 to 1) carries the wrist from rest to the target; grip (0 to 1) folds fingers and thumb shut;
// the hand turns a beat after the forearm (follow-through via `lagAngle`).
export function hand(ctx, { shoulder = [250, 770], rest = [400, 980], target, reach = 0, grip = 0, lagAngle = 0, skin = SKIN_A, sleeve = '#a8784c', seed = 61 }) {
  const S = place(shoulder), R = place(rest), T = [target[0] - 46, target[1] + 26];
  const W = [lerp(R[0], T[0], reach), lerp(R[1], T[1], reach)];
  const L1 = 270, L2 = 255;
  const dx = W[0] - S[0], dy = W[1] - S[1], d = Math.min(Math.hypot(dx, dy), L1 + L2 - 1);
  const base = Math.atan2(dy, dx), bendA = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const E = [S[0] + Math.cos(base + bendA) * L1, S[1] + Math.sin(base + bendA) * L1];   // the elbow drops below the line
  const fa0 = Math.atan2(W[1] - E[1], W[0] - E[0]);
  const Wr = [E[0] + Math.cos(fa0) * L2, E[1] + Math.sin(fa0) * L2];

  // The sleeve: wide and rounded at the shoulder (a cap, not a cut), tapering to the wrist.
  const bone = smooth([S, E, Wr], 8), n = bone.length;
  const width = (i) => lerp(38, 18, (i / (n - 1)) ** 0.8);
  const normal = (i) => {
    const [ax, ay] = bone[Math.max(0, i - 1)], [bx, by] = bone[Math.min(n - 1, i + 1)], l = Math.hypot(bx - ax, by - ay) || 1;
    return [-(by - ay) / l, (bx - ax) / l];
  };
  const side = (k) => bone.map(([x, y], i) => { const [nx, ny] = normal(i); return [x + nx * width(i) * k, y + ny * width(i) * k]; });
  const ua = Math.atan2(bone[1][1] - S[1], bone[1][0] - S[0]);
  // Out along one side, back along the other, then round the back of the shoulder to close.
  const cap = Array.from({ length: 11 }, (_, j) => { const a = ua - Math.PI / 2 - ((j + 1) / 12) * Math.PI; return [S[0] + Math.cos(a) * 38, S[1] + Math.sin(a) * 38]; });
  const arm = [...side(1), ...side(-1).reverse(), ...cap];
  const sheet = paper(ctx.canvas.width, 7, INK.kraft);
  const layDown = (poly) => { ctx.save(); pathOf(ctx, poly); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(sheet, 0, 0); ctx.restore(); };
  layDown(arm);   // inks multiply, so fresh paper goes under the arm or the body's line shows through
  inkLayer(ctx, (g) => { g.fillStyle = sleeve; pathOf(g, arm); g.fill(); }, { grain: 0.5, seed: 6 });
  formOutline(ctx, arm, { light: LIGHT, width: 2.2, seed, lost: 0.45 });
  const [cx, cy] = normal(n - 4), [wx, wy] = bone[n - 4];
  inkLine(ctx, [[wx + cx * 18, wy + cy * 18], [wx - cx * 18, wy - cy * 18]], { width: 1.4, seed: seed + 1, alpha: 0.8 });   // the cuff

  // The hand, in the forearm's frame (x along the forearm), turned a little late.
  ctx.save();
  ctx.translate(Wr[0], Wr[1]); ctx.rotate(fa0 + lagAngle);
  const part = (poly, s) => {
    layDown(poly);
    inkLayer(ctx, (g) => { g.fillStyle = skin; pathOf(g, poly); g.fill(); }, { grain: 0.4, seed: 5 });
    formOutline(ctx, poly, { light: LIGHT, width: 1.8, seed: seed + s, lost: 0.6 });
  };
  const xf = (pts, [ox, oy], a) => pts.map(([x, y]) => [ox + x * Math.cos(a) - y * Math.sin(a), oy + x * Math.sin(a) + y * Math.cos(a)]);
  // Thumb first, so the palm overlaps its root.
  const thumbA = -1.0 + grip * 1.0;
  part(xf(smooth([[0, -6], [16, -8], [28, -4], [30, 3], [16, 7], [0, 6]], 4, true), [16, -15], thumbA), 2);
  part(smooth([[-2, -17], [22, -21], [42, -17], [46, 0], [42, 18], [20, 20], [-2, 16]], 5, true), 3);
  // The finger block bends at the knuckles; creases show it is four fingers.
  const curl = grip * 1.55, K = [42, 0];
  const fingers = xf(smooth([[0, -19], [22, -20], [38, -14], [43, 0], [38, 14], [22, 19], [0, 18]], 5, true), K, curl);
  part(fingers, 4);
  for (const y of [-9.5, 0, 9.5]) inkLine(ctx, xf([[16, y], [36, y * 0.85]], K, curl), { width: 1, seed: seed + 9 + y, alpha: 0.7, taper: true });
  ctx.restore();
}
