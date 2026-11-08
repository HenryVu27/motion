// Motion library: the principles from drills 13 to 15 as small pure functions of time, so any
// subject (a leaf, a ship, a figure, a flag) gets them without writing physics again. Everything
// takes time in seconds and returns numbers or point maps; nothing draws except the two
// inspection tools at the bottom and rippleLayer.
import { clamp, lerp, ease, inkShape, inkLine, INK } from './kit.js';

// ---------- Time ----------

// Hold each drawing for 1/fps seconds: 12 drawings a second is "on twos" at 24 fps.
export const onTwos = (T, fps = 12) => Math.floor(T * fps) / fps;
export const drawingIndex = (T, fps = 12) => Math.floor(T * fps);

// A loop of `period` seconds; returns time within the loop.
export const cycle = (T, period) => ((T % period) + period) % period;

// A power stroke: a repeating action with a quick drive and a slow recovery (oars, wings, steps,
// a hammer). Returns which half it is in and the eased progress through that half.
export function beat(T, { period = 1.8, drive = 0.36, offset = 0 } = {}) {
  const phase = cycle(T / period + offset, 1);
  return phase < drive
    ? { driving: true, p: ease.inOut(phase / drive), phase }
    : { driving: false, p: ease.inOut((phase - drive) / (1 - drive)), phase };
}

// 0 before a, rises to 1 at b (the shape of a cue, a fade or a load).
export const cue = (t, a, b, curve = ease.inOut) => curve(clamp((t - a) / (b - a)));

// ---------- Settling ----------

// A damped spring released at k = 0 from `from`, settling at `to`. Before release it holds `from`.
// freq is how fast it swings (rad/s), damping how fast it dies. Overshoot comes for free.
// phase shifts where in its swing it starts (-PI / 2 starts at rest and kicks: a whip).
export function spring(k, { from = 1, to = 0, freq = 10, damping = 3, phase = 0 } = {}) {
  if (k <= 0) return to + (from - to) * Math.cos(phase);
  return to + (from - to) * Math.exp(-damping * k) * Math.cos(freq * k + phase);
}

// Follow-through: a loose part answers its driver late. Pass any function of time.
export const lag = (fn, t, delay) => fn(t - delay);

// ---------- Spacing ----------

// Fall from rest covering `dist` in `dur`: positions spread 1, 3, 5, 7 per equal step.
export const fall = (k, dur, dist) => dist * clamp(k / dur) ** 2;
export const fallSpeed = (k, dur, dist) => (2 * dist * clamp(k / dur)) / dur;

// A thrown thing: start point, start velocity (units/s), gravity (units/s^2), time since throw.
export const ballistic = ([x, y], [vx, vy], g, k) => [x + vx * k, y + vy * k + 0.5 * g * k * k];

// Anticipation then action: dips back by `back` before going to 1, over p in [0, 1].
export function anticipate(p, back = 0.15, split = 0.3) {
  if (p < split) return -back * ease.inOut(p / split);
  return lerp(-back, 1, ease.out((p - split) / (1 - split)));
}

// ---------- Shape ----------

// Squash and stretch with the area kept: stretch s makes it r*s tall and r/sqrt(s) wide.
export const squash = (r, s) => ({ w: r / Math.sqrt(s), h: r * s });

// ---------- Limbs ----------

// Two-bone inverse kinematics: a limb from `root` with bones L1 and L2 reaching for `target`.
// Returns the joint (elbow or knee) and the end point; bend = 1 or -1 picks which way it folds.
export function ik2(root, target, L1, L2, bend = 1) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 1e-3), base = Math.atan2(dy, dx);
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)) * bend;
  const joint = [root[0] + Math.cos(base + a) * L1, root[1] + Math.sin(base + a) * L1];
  const b = Math.atan2(target[1] - joint[1], target[0] - joint[0]);
  return { joint, end: [joint[0] + Math.cos(b) * L2, joint[1] + Math.sin(b) * L2] };
}

// ---------- Flexible bodies ----------

// Bend a body that is held at `root` and free at `tip` (leaf, branch, tail, arm, flag pole).
// sag(u) gives the displacement at position u in [0, 1] from root to tip, along `dir`. The default
// profile is a cantilever: barely moves near the root, most at the tip. Returns a point map.
export const cantilever = (u) => (u * u * (3 - u)) / 2;
export function bend({ root, tip, sag, dir = [0, 1], profile = cantilever }) {
  const ax = tip[0] - root[0], ay = tip[1] - root[1], a2 = ax * ax + ay * ay;
  return ([x, y]) => {
    const u = clamp(((x - root[0]) * ax + (y - root[1]) * ay) / a2);
    const d = sag(u) * profile(u);
    return [x + dir[0] * d, y + dir[1] * d];
  };
}

// Overlapping action along a chain: each point follows the motion of the one before it, late.
// `drive(t)` is the root's motion; the point at u in [0, 1] sees it `delay * u` seconds later, and
// with `grow` the far end swings wider (a pennant, a tail, a rope, hair).
export const overlap = (drive, t, u, { delay = 0.12, grow = 1 } = {}) => drive(t - delay * u) * (1 + (grow - 1) * u);

// A travelling wave along a chain from root (u = 0) to tip (u = 1): a flag or a whip.
export const chainWave = (t, u, { amp = 12, freq = 5, wavelength = 1.4, grow = true } = {}) =>
  Math.sin(t * freq - (u * Math.PI * 2) / wavelength) * amp * (grow ? u : 1);

// ---------- Surfaces ----------

// A sea or a pond: a sum of sines, the same function for drawing the surface and moving what floats.
export const waves = (comps = [[7, 0.011, 1.25, 0], [3.5, 0.026, -0.85, 1.7]]) =>
  (x, t) => comps.reduce((y, [amp, k, w, ph]) => y + amp * Math.sin(x * k - t * w + ph), 0);

// How a floating body of half-length L at x rides a wave function: heave (up and down) and pitch.
export function ride(wave, x, L, t) {
  const heave = (wave(x - L * 0.75, t) + wave(x, t) + wave(x + L * 0.75, t)) / 3;
  const pitch = Math.atan2(wave(x + L, t) - wave(x - L, t), 2 * L);
  return { heave, pitch };
}

// Expanding rings after an impact at k = 0: each ring's radius and strength over its life.
export function rings(k, { delays = [0, 0.22, 0.5], life = 1.2, from = 30, to = 260 } = {}) {
  return delays.map((d) => {
    const q = (k - d) / life;
    return q > 0 && q < 1 ? { r: from + (to - from) * ease.out(q), strength: 1 - q } : null;
  }).filter(Boolean);
}

// Make a painted layer disperse: redraw it in thin elliptical bands around `center`, each magnified
// by a wave's displacement there, so the surface's own texture moves outward with each ring.
export function rippleLayer(ctx, layer, { center, clip, squashY = 0.22, k, ringOpts, amp = 9, width = 40, band = 5 } = {}) {
  const W = ctx.canvas.width, s = W / 1000, ix = center[0] * s, iy = center[1] * s;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  if (k > 0) {
    if (clip) { ctx.beginPath(); clip.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s))); ctx.clip(); }
    for (const ring of rings(k, ringOpts)) {
      const R = ring.r, a = amp * ring.strength ** 1.5;
      for (let r = Math.max(6, R - width); r < R + 14; r += band) {
        const disp = a * Math.sin(((r - R) / 13) * Math.PI) * clamp((r - R + width) / 20) * clamp((R + 14 - r) / 8);
        const f = 1 + disp / r;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ix, iy, (r + band) * s, (r + band) * squashY * s, 0, 0, Math.PI * 2);
        ctx.ellipse(ix, iy, r * s, r * squashY * s, 0, 0, Math.PI * 2);
        ctx.clip('evenodd');
        ctx.translate(ix, iy); ctx.scale(f, f); ctx.translate(-ix, -iy);
        ctx.drawImage(layer, 0, 0);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

// ---------- Inspection: the animator's light table, for any state function ----------

// Ghosts of the last `count` drawings. shapeAt(t) returns a closed point list (or null).
export function onionSkin(ctx, shapeAt, t, { count = 6, step = 1 / 12, color = INK.red } = {}) {
  for (let k = count; k >= 1; k--) {
    const P = shapeAt(t - k * step);
    if (P) inkShape(ctx, P, { width: 1.1, color, seed: 50 + k, alpha: 0.12 + 0.07 * (count - k), wobble: 0.3 });
  }
}

// A ruler of where something sits on each drawing between t0 and t1. valueAt(t) returns y.
export function spacingChart(ctx, valueAt, t0, t1, now, { x = 880, step = 1 / 12, label = 'spacing' } = {}) {
  const ys = [];
  for (let s = t0; s <= t1 + 1e-6; s += step) ys.push([s, valueAt(s)]);
  const lo = Math.min(...ys.map((v) => v[1])), hi = Math.max(...ys.map((v) => v[1]));
  inkLine(ctx, [[x, lo], [x, hi]], { width: 1, seed: 60, color: INK.sepia, alpha: 0.6, taper: false });
  ctx.save();
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillStyle = INK.sepia;
  ctx.textAlign = 'center';
  ctx.fillText(label, x, lo - 22);
  ctx.restore();
  for (const [s, y] of ys) {
    const past = s <= now;
    inkLine(ctx, [[x - 18, y], [x + 18, y]], { width: past ? 2.4 : 1.2, seed: 61 + Math.round(s * 100), color: past ? INK.red : INK.sepia, alpha: past ? 0.95 : 0.4, taper: false });
  }
}
