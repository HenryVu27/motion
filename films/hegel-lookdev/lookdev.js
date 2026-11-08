// Look development for the Hegel film: one moment, one figure yielding to another, in three
// looks. Same timing in all three (yieldAt), so only the drawing differs. Each loop is 6 seconds,
// drawn on twos.
import {
  INK, rng, clamp, lerp, ease, pathOf, smooth, circlePts, paper, surface, noise2,
  inkLayer, inkLine, formOutline, halftone, flowStrokes, stipple, wash, pigment, caption,
} from '../../film/kit.js';
import { cue, anticipate, spring, overlap, chainWave, ik2, onTwos } from '../../film/motion.js';
import { figure } from '../hegel-recognition/figures.js';

export const LOOP = 6;
const LIGHT = [-0.6, -0.8];

// The shared performance: still, a breath of resistance, then giving way, a settle, a hold.
export function yieldAt(t) {
  if (t < 2.2) return 0;
  let y = anticipate(clamp((t - 2.2) / 1.4), 0.08);
  if (t > 3.6) y = 1 - spring(t - 3.6, { from: -0.06, to: 0, freq: 10, damping: 5 });
  return y * (1 - cue(t, 5.4, 6));
}
const riseAt = (t) => 0.6 * yieldAt(t - 0.3);   // the other answers a beat later

const fillOver = (ctx, poly, color, seed = 5, grain = 0.35) =>
  inkLayer(ctx, (g) => { g.fillStyle = color; pathOf(g, poly); g.fill(); }, { grain, seed, blend: 'source-over' });
const rot = ([x, y], a, [cx, cy]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
const capsule = (a, b, r, n = 8) => {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), out = [];
  for (let i = 0; i <= n; i++) { const t = ang + Math.PI / 2 + (i / n) * Math.PI; out.push([a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r]); }
  for (let i = 0; i <= n; i++) { const t = ang - Math.PI / 2 + (i / n) * Math.PI; out.push([b[0] + Math.cos(t) * r * 0.85, b[1] + Math.sin(t) * r * 0.85]); }
  return out;
};

// ===================== (a) Characters in a world =====================

function landscape(ctx) {
  const W = ctx.canvas.width, cache = surface(`lookdev-world:${W}`, W, W);
  if (!cache.painted) {
    const g = cache.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(paper(W), 0, 0);
    g.setTransform(W / 1000, 0, 0, W / 1000, 0, 0);
    const sky = [[0, 0], [1000, 0], [1000, 640], [0, 640]];
    inkLayer(g, (l) => pigment(l, sky, { tone: (x, y) => clamp(0.5 - y / 1100), color: '#eab48a', seed: 3, blobs: 28, size: [180, 360], alpha: 0.05, grain: 300 }), { grain: 0.2, seed: 3 });
    inkLayer(g, (l) => pigment(l, sky, { tone: (x, y) => clamp(0.45 - y / 600), color: '#8aa5c4', seed: 4, blobs: 18, size: [180, 360], alpha: 0.045, grain: 150 }), { grain: 0.2, seed: 4 });
    // Ridges, farther ones paler: the world the two of them stand in.
    const n = noise2(17);
    [['#c3c8c9', 560, 60, 0.004], ['#b2bd9a', 610, 45, 0.006], ['#a7b884', 680, 30, 0.009]].forEach(([c, base, amp, f], i) => {
      const ridge = [[0, 1000]];
      for (let x = 0; x <= 1000; x += 10) ridge.push([x, base - amp * (n(x * f, i * 5) * 0.7 + n(x * f * 3, i * 9) * 0.3)]);
      ridge.push([1000, 1000]);
      inkLayer(g, (l) => { l.fillStyle = c; pathOf(l, ridge); l.fill(); }, { grain: 0.45, seed: 10 + i });
      if (i === 2) inkLine(g, ridge.slice(1, -1), { width: 1.4, color: '#3d5a2c', seed: 20, alpha: 0.7 });
    });
    const path = [[380, 1000], [470, 700], [530, 700], [700, 1000]];
    inkLayer(g, (l) => { l.fillStyle = '#e3d2ab'; pathOf(l, path); l.fill(); }, { grain: 0.5, seed: 13, blend: 'source-over' });
    stipple(g, path, { tone: (x, y) => (y - 700) / 600, count: 900, r: 0.8, color: INK.sepia, seed: 14, alpha: 0.5 });
    // A lone tree on the far left ridge.
    inkLine(g, smooth([[140, 650], [150, 560], [138, 500]], 6), { width: 5, color: INK.sepia, seed: 21 });
    for (const [x, y, r] of [[138, 470, 55], [100, 500, 40], [178, 495, 42]]) wash(g, circlePts(x, y, r, 12), { color: '#5d7a45', seed: x, layers: 10, alpha: 0.12, spread: 0.12 });
    cache.painted = true;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cache, 0, 0); ctx.restore();
}

// A small person with appeal: round head, hair, a dot eye, a nose, a cheek; a tunic; legs and arms
// that bend at knee and elbow (ik2). bow pitches the torso about the hip; kneel lowers the hip
// onto one knee; lift raises the chin. The head and any cloth trail the body (overlap).
function person(ctx, o) {
  const { x, ground, facing: f, t, bow, kneel, lift = 0, skin, tunic, hair, cloak = null, bag = false, seed } = o;
  const hip = [x, ground - 128 + kneel * 58];
  const pitch = f * (bow * 0.95 - lift * 0.12);
  const shoulder = rot([hip[0], hip[1] - 108], pitch, hip);
  const headPitch = f * (overlap((tt) => o.bowAt(tt), t, 1, { delay: 0.16 }) * 1.15 - lift * 0.35);
  const neck = rot([shoulder[0], shoulder[1] - 16], pitch, shoulder);
  const head = rot([neck[0] + f * 4, neck[1] - 34], headPitch, neck);

  // Legs: the front foot stays planted; the back knee goes down to the ground as he kneels.
  const frontFoot = [x + f * 34, ground], backFoot = [x - f * lerp(24, 74, kneel), ground];
  const pickKnee = (root, end, L1, L2) => { const a = ik2(root, end, L1, L2, 1), b = ik2(root, end, L1, L2, -1); return (a.joint[0] - root[0]) * f > (b.joint[0] - root[0]) * f ? a : b; };
  const backLeg = pickKnee(hip, backFoot, 66, 64), frontLeg = pickKnee(hip, frontFoot, 66, 64);
  // Arms: at his sides standing; reaching toward the front knee as he bows.
  const hands = lerp(0, 1, bow);
  const handTarget = [lerp(hip[0] + f * 14, frontLeg.joint[0] + f * 8, hands), lerp(hip[1] + 6, frontLeg.joint[1] - 6, hands)];
  const arm = (dx) => { const a = ik2(shoulder, [handTarget[0] + dx, handTarget[1]], 50, 50, -1), b = ik2(shoulder, [handTarget[0] + dx, handTarget[1]], 50, 50, 1); return (a.joint[0] - shoulder[0]) * f < (b.joint[0] - shoulder[0]) * f ? a : b; };

  const limb = (a, j, e, w, color, s) => { const P = [...capsule(a, j, w), ...capsule(j, e, w * 0.9)]; for (const poly of [capsule(a, j, w), capsule(j, e, w * 0.9)]) { fillOver(ctx, poly, color, s); formOutline(ctx, poly, { light: LIGHT, width: 1.8, seed: s, lost: 0.5 }); } return P; };

  // Cloak first, behind everything: it hangs from the shoulders and its hem trails in the wind.
  if (cloak) {
    const top = [shoulder[0] - f * 10, shoulder[1] + 4];
    const hem = Array.from({ length: 9 }, (_, i) => { const u = i / 8; return [top[0] - f * (20 + u * 70) + chainWave(t, u, { amp: 10, freq: 3.2, wavelength: 1.1 }), hip[1] + 92 + u * 16 + chainWave(t + 0.4, u, { amp: 5, freq: 3.2 })]; });
    const cl = smooth([top, [top[0] - f * 30, hip[1] - 20], ...hem.reverse(), [hip[0] + f * 6, hip[1] + 40], [shoulder[0] + f * 10, shoulder[1] + 10]], 4, true);
    fillOver(ctx, cl, cloak, 7, 0.45);
    formOutline(ctx, cl, { light: LIGHT, width: 1.8, seed: seed + 1, lost: 0.5 });
  }
  const back = arm(-f * 6);
  limb(shoulder, back.joint, back.end, 9, tunic, seed + 2);
  limb(hip, backLeg.joint, backLeg.end, 12, '#6b5a48', seed + 3);
  // Torso: a tunic that flares a little at the hem.
  const torso = smooth([rot([hip[0] - 34, hip[1] + 24], pitch, hip), rot([hip[0] - 26, hip[1] - 60], pitch, hip), rot([hip[0] - 22, hip[1] - 104], pitch, hip), rot([hip[0] + 22, hip[1] - 104], pitch, hip), rot([hip[0] + 26, hip[1] - 60], pitch, hip), rot([hip[0] + 34, hip[1] + 24], pitch, hip)], 4, true);
  fillOver(ctx, torso, tunic, 8);
  flowStrokes(ctx, torso, { dir: () => pitch - Math.PI / 2, tone: (px) => clamp(0.15 + (px - hip[0]) * -f * 0.006), spacing: 7, length: 18, color: INK.ink, width: 0.7, alpha: 0.4, seed: seed + 4 });
  formOutline(ctx, torso, { light: LIGHT, width: 2, seed: seed + 5, lost: 0.45 });
  limb(hip, frontLeg.joint, frontLeg.end, 12, '#6b5a48', seed + 6);
  // A satchel on a strap swings a little late (follow-through).
  if (bag) {
    const swing = (overlap((tt) => o.bowAt(tt), t, 1, { delay: 0.25 }) - o.bowAt(t)) * 1.2 * f + o.bowAt(t) * -0.9 * f;   // hangs plumb, swinging only on the lag
    const strapTop = rot([hip[0] - f * 18, hip[1] - 100], pitch, hip), bagAt = rot([hip[0] - f * 30, hip[1] + 10], pitch + swing, strapTop);
    inkLine(ctx, [strapTop, bagAt], { width: 2.4, color: INK.sepia, seed: seed + 7 });
    const bagPoly = [[bagAt[0] - 18, bagAt[1] - 6], [bagAt[0] + 18, bagAt[1] - 6], [bagAt[0] + 16, bagAt[1] + 24], [bagAt[0] - 16, bagAt[1] + 24]];
    fillOver(ctx, bagPoly, '#a67c4e', 9); formOutline(ctx, bagPoly, { light: LIGHT, width: 1.6, seed: seed + 8, lost: 0.5 });
  }
  // Head: skin, hair, a dot eye, a little nose, a cheek.
  const H = circlePts(head[0], head[1], 30, 36);
  fillOver(ctx, H, skin, 10);
  const hairPoly = smooth([[head[0] - f * 31, head[1] + 6], [head[0] - f * 28, head[1] - 22], [head[0], head[1] - 34], [head[0] + f * 24, head[1] - 22], [head[0] + f * 12, head[1] - 12], [head[0] - f * 8, head[1] - 10], [head[0] - f * 14, head[1] + 10]], 4, true).map((p) => rot(p, headPitch, head));
  fillOver(ctx, hairPoly, hair, 11, 0.45);
  formOutline(ctx, H, { light: LIGHT, width: 2, seed: seed + 9, lost: 0.5 });
  const eyeP = rot([head[0] + f * 14, head[1] - 2 + bow * 2], headPitch, head), noseP = rot([head[0] + f * 30, head[1] + 4], headPitch, head), cheek = rot([head[0] + f * 8, head[1] + 12], headPitch, head);
  ctx.save();
  ctx.fillStyle = INK.ink; ctx.beginPath(); ctx.ellipse(eyeP[0], eyeP[1], 3.2, 3.2 * (1 - bow * 0.6), 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(214,110,90,0.35)'; ctx.beginPath(); ctx.arc(cheek[0], cheek[1], 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  inkLine(ctx, [rot([head[0] + f * 27, head[1] - 4], headPitch, head), noseP, rot([head[0] + f * 26, head[1] + 9], headPitch, head)], { width: 1.6, seed: seed + 12 });
  const front = arm(f * 6);
  limb(shoulder, front.joint, front.end, 9, tunic, seed + 13);
}

export function drawWorld(ctx, T) {
  const t = onTwos(T % LOOP);
  landscape(ctx);
  // The camera eases in a little over the loop.
  const z = 1.45 + 0.06 * ease.inOut(t / LOOP);   // closer: the people are the subject, the world is the setting
  ctx.save();
  ctx.translate(500, 760); ctx.scale(z, z); ctx.translate(-500, -700);
  const y = yieldAt(t), r = riseAt(t);
  person(ctx, { x: 405, ground: 760, facing: 1, t, bow: 0, kneel: 0, lift: r, bowAt: () => 0, skin: '#efcfa8', tunic: '#e8d7b4', hair: '#3a2a20', cloak: INK.red, seed: 100 });
  person(ctx, { x: 610, ground: 770, facing: -1, t, bow: y * 0.75, kneel: y, bowAt: (tt) => yieldAt(tt) * 0.75, skin: '#e9c49c', tunic: '#5f7fa6', hair: '#6b4a2e', bag: true, seed: 200 });
  ctx.restore();
}

// ===================== (b) Creatures, no people: two cranes =====================

function cyanotype(ctx) {
  const W = ctx.canvas.width, cache = surface(`lookdev-cyan:${W}`, W, W);
  if (!cache.painted) {
    const g = cache.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(paper(W), 0, 0);
    g.setTransform(W / 1000, 0, 0, W / 1000, 0, 0);
    const all = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]];
    inkLayer(g, (l) => { l.fillStyle = INK.prussian; pathOf(l, all); l.fill(); }, { grain: 0.25, seed: 30 });
    inkLayer(g, (l) => pigment(l, all, { tone: (x, y) => 0.5 + y / 2000, color: '#12335e', seed: 31, blobs: 30, size: [160, 320], alpha: 0.05, grain: 1500 }), { grain: 0.2, seed: 31 });
    // Pale marks on the blue: the moon, the water line, reeds.
    const pale = 'rgba(236,241,246,0.85)';
    g.save(); g.fillStyle = 'rgba(236,241,246,0.18)'; g.beginPath(); g.arc(800, 190, 70, 0, Math.PI * 2); g.fill(); g.restore();
    inkLine(g, circlePts(800, 190, 70, 48), { width: 1.4, color: pale, seed: 32, taper: false, alpha: 0.8 });
    const R = rng(33);
    for (let i = 0; i < 26; i++) {
      const x = i < 13 ? R() * 180 : 820 + R() * 180, h = 120 + R() * 160;
      inkLine(g, smooth([[x, 780], [x + (R() - 0.5) * 20, 780 - h * 0.5], [x + (R() - 0.5) * 40, 780 - h]], 5), { width: 1.2, color: pale, seed: 40 + i, alpha: 0.7 });
    }
    cache.painted = true;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cache, 0, 0); ctx.restore();
}

// A crane: oval body, a neck of ten segments, a head with a long beak and a red crown, stilt legs.
// bow curls the neck forward and down segment by segment, the head arriving last (overlap).
function crane(ctx, o) {
  const { x, water, facing: f, t, bowAt, lift = 0, wing = 0, seed } = o;
  const body = [x, water - 150];
  const N = 10, seg = 15;
  const pts = [[body[0] + f * 48, body[1] - 16]];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const standA = -Math.PI / 2 + f * (0.25 * Math.sin(u * Math.PI * 1.2) - lift * 0.15 * u);   // an S-curve, upright
    const bowA = -Math.PI / 2 + f * (0.55 + u * 1.45);                                              // forward and down, one smooth arc
    const k = overlap(bowAt, t, u, { delay: 0.22 });
    const a = lerp(standA, bowA, k);
    const p = pts[pts.length - 1];
    pts.push([p[0] + Math.cos(a) * seg, p[1] + Math.sin(a) * seg]);
  }
  const head = pts[N], hd = Math.atan2(head[1] - pts[N - 1][1], head[0] - pts[N - 1][0]) + f * 1.2;
  const cream = '#f3efe6', pale = 'rgba(236,241,246,0.9)';
  // Legs: thin, with the backward-bending ankle; they stand in the water.
  for (const dx of [-14, 12]) inkLine(ctx, [[body[0] + dx, body[1] + 30], [body[0] + dx - f * 8, water - 60], [body[0] + dx, water + 4]], { width: 2.2, color: pale, seed: seed + dx });
  // Body and wing; the wing lifts a little when he rises.
  const bodyPoly = smooth([[body[0] - f * 80, body[1] + 8], [body[0] - f * 40, body[1] - 34], [body[0] + f * 40, body[1] - 34], [body[0] + f * 70, body[1] - 4], [body[0] + f * 40, body[1] + 36], [body[0] - f * 40, body[1] + 38]], 5, true);
  fillOver(ctx, bodyPoly, cream, 50);
  const wingPoly = smooth([[body[0] + f * 30, body[1] - 20], [body[0] - f * 60, body[1] - 30 - wing * 60], [body[0] - f * 108, body[1] + 4 - wing * 30], [body[0] - f * 40, body[1] + 20]], 5, true);
  fillOver(ctx, wingPoly, '#e9e3d6', 51);
  inkLayer(ctx, (g) => { g.fillStyle = '#1b1b22'; pathOf(g, [[body[0] - f * 70, body[1] - 6], [body[0] - f * 112, body[1] + 6 - wing * 30], [body[0] - f * 80, body[1] + 24]]); g.fill(); }, { grain: 0.3, seed: 52, blend: 'source-over' });
  formOutline(ctx, bodyPoly, { light: LIGHT, width: 2, color: INK.ink, seed: seed + 1, lost: 0.55 });
  flowStrokes(ctx, wingPoly, { dir: () => (f > 0 ? Math.PI : 0) + 0.25 * f, tone: () => 0.3, spacing: 7, length: 30, color: '#8a8fa0', width: 0.8, alpha: 0.6, seed: seed + 2 });
  // Neck: a black front over a white back, as on a red-crowned crane.
  const neckPoly = [...pts.map(([px, py], i) => [px - f * (8 - i * 0.3), py]), ...pts.map(([px, py], i) => [px + f * (8 - i * 0.3), py]).reverse()];
  fillOver(ctx, neckPoly, '#1b1b22', 53);
  // Head, crown, eye, beak.
  const beakTip = [head[0] + Math.cos(hd) * 46, head[1] + Math.sin(hd) * 46];
  inkLayer(ctx, (g) => { g.fillStyle = '#c9b48a'; pathOf(g, [[head[0] + Math.cos(hd - f * 1.4) * 6, head[1] + Math.sin(hd - f * 1.4) * 6], beakTip, [head[0] + Math.cos(hd + f * 1.4) * 6, head[1] + Math.sin(hd + f * 1.4) * 6]]); g.fill(); }, { grain: 0.3, seed: 54, blend: 'source-over' });
  fillOver(ctx, circlePts(head[0], head[1], 11, 18), '#1b1b22', 55);
  inkLayer(ctx, (g) => { g.fillStyle = INK.red; pathOf(g, circlePts(head[0] - Math.cos(hd) * 2, head[1] - 8, 6, 12)); g.fill(); }, { grain: 0.4, seed: 56, blend: 'source-over' });
  ctx.save(); ctx.fillStyle = cream; ctx.beginPath(); ctx.arc(head[0] + Math.cos(hd) * 4, head[1] + Math.sin(hd) * 4 - 2, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function drawCranes(ctx, T) {
  const t = onTwos(T % LOOP);
  cyanotype(ctx);
  const y = yieldAt(t), r = riseAt(t), water = 780;
  const pair = () => {
    crane(ctx, { x: 360, water, facing: 1, t, bowAt: () => 0, lift: r, wing: r * 0.8, seed: 300 });
    crane(ctx, { x: 640, water, facing: -1, t, bowAt: (tt) => yieldAt(tt), seed: 400 });
  };
  pair();
  // Their reflections, flipped in the water and broken by ripples.
  ctx.save();
  ctx.beginPath(); ctx.rect(0, water, 1000, 300); ctx.clip();
  ctx.globalAlpha = 0.22;
  ctx.translate(0, water * 2); ctx.scale(1, -1);
  pair();
  ctx.restore();
  const pale = 'rgba(236,241,246,0.8)';
  for (let r0 = 0; r0 < 5; r0++) {
    const yy = water + 10 + r0 * r0 * 9, pts = [];
    for (let x = 0; x <= 1000; x += 10) pts.push([x, yy + Math.sin(x * 0.02 + t * 1.5 + r0) * 2]);
    inkLine(ctx, pts, { width: 1, color: pale, seed: 60 + r0, alpha: 0.5, taper: false, passes: 1 });
  }
}

// ===================== (c) The first idea, done bold =====================

export function drawBold(ctx, T) {
  const t = onTwos(T % LOOP);
  const W = ctx.canvas.width;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(paper(W), 0, 0); ctx.restore();
  const all = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]];
  inkLayer(ctx, (g) => { g.fillStyle = '#1e2238'; pathOf(g, all); g.fill(); }, { grain: 0.25, seed: 70 });
  // The camera pushes in and turns a little.
  const z = 1 + 0.08 * ease.inOut(t / LOOP);
  ctx.save();
  ctx.translate(500, 560); ctx.rotate(0.02 * Math.sin(t * 0.6)); ctx.scale(z, z); ctx.translate(-500, -560);
  const y = yieldAt(t), r = riseAt(t);
  const A = figure('A', -0.08 * r), B = figure('B', 0, (u) => 0.5 * overlap(yieldAt, t, u, { delay: 0.18 }));
  // A light behind the one who stands.
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(330, 380, 10, 330, 380, 360);
  glow.addColorStop(0, `rgba(255,214,90,${0.35 + 0.3 * r})`); glow.addColorStop(1, 'rgba(255,214,90,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1000, 1000); ctx.restore();
  for (const [f, color, s] of [[A, INK.yellow, 71], [B, INK.red, 72]]) {
    inkLayer(ctx, (g) => { g.fillStyle = color; pathOf(g, f.outline); g.fill(); }, { grain: 0.45, seed: s, blend: 'source-over' });
    inkLayer(ctx, (g) => halftone(g, f.outline, { tone: (x, yy) => clamp(((x - f.skull[0]) * 0.6 + (yy - f.skull[1]) * 0.8) / 300 + 0.15), cell: 8, angle: 0.3, color: '#1e2238' }), { grain: 0.3, seed: s + 1 });
    formOutline(ctx, f.outline, { light: LIGHT, width: 2.4, color: '#f3ead8', seed: s + 2, lost: 0.45 });
  }
  ctx.restore();
}
