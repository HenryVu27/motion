// One ship, drawn twice. The left canvas is how the first film moved: continuous 30 fps, frozen
// lines, a sine bob, symmetric oars. The right canvas adds, one switch each, what hand-drawn
// animation does. Every principle can be turned off on its own to feel what it contributes.
import { paper, setBoil, noise2, clamp, lerp, ease, inkLine, inkLayer, halftone, INK } from '../../film/kit.js';
import { drawGalley, sun } from '../../films/ship-of-theseus/film.js';
import { loop } from '../../shared/page.js';
import { waves, ride, lag, beat, chainWave } from '../../film/motion.js';

const SIZE = 720, DRAWINGS_PER_SECOND = 12;
const SHIP = { cx: 500, wl: 640, W: 620, D: 150 };
const PRINCIPLES = {
  twos: 'On twos',
  boil: 'Line boil',
  ride: 'Rides the waves',
  follow: 'Follow-through',
  timing: 'Oar timing',
  camera: 'Camera breath',
};

// ---------- Waves: one function drives the sea lines and the ship, so they agree ----------

const wave = waves();
const pitchAt = (t) => ride(wave, SHIP.cx, 200, t).pitch;

function sea(ctx, t, live) {
  const y0 = 600;
  inkLayer(ctx, (g) => halftone(g, [[0, y0], [1000, y0], [1000, 1000], [0, 1000]], { tone: (x, y) => clamp(((y - y0) / 340) * 0.36 + 0.05, 0, 0.55), cell: 10, angle: 0.4, color: INK.federal, phase: [t * 6, 0] }), { grain: 0.35, seed: 4 });
  for (let r = 0; r < 7; r++) {
    const y = y0 + 6 + r * r * 7, amp = 1 / (1 + r * 0.6), pts = [];
    for (let x = -20; x <= 1020; x += 8) pts.push([x, y + (live ? wave(x + r * 40, t) * amp : Math.sin(x * 0.03 + t * (1.2 + r * 0.2) + r) * (1.5 + r * 0.5))]);
    inkLine(ctx, pts, { width: 1, color: INK.federal, seed: 2 + r, wobble: 0.6, alpha: 0.7, passes: 1 });
  }
}

// ---------- Oars: a real stroke is a fast pull and a slow, lifted recovery ----------

function oarStroke(i, t) {
  const n = noise2(91), CATCH = 2.6, FINISH = 1.92;
  const s = beat(t, { period: 1 / 0.55, drive: 0.36, offset: -i * 0.018 + n(i * 0.7, 0) * 0.04 });
  return s.driving
    ? { a: lerp(CATCH, FINISH, s.p), reach: 1.1, phase: s.phase }
    : { a: lerp(FINISH, CATCH, s.p), reach: 1 - 0.14 * Math.sin(Math.PI * s.p), phase: s.phase };
}

// A small splash where each blade bites the water: secondary action.
function splashes(ctx, H, t) {
  for (let i = 0; i < 15; i++) {
    const { a, phase } = oarStroke(i, t);
    if (phase > 0.12) continue;
    const u = 0.16 + (i * 0.68) / 14, [ox, oy] = H(u, 0.3), L = SHIP.D * 1.05;
    const bx = ox + Math.cos(a) * L, by = oy + Math.sin(a) * L, k = phase / 0.12;
    ctx.fillStyle = INK.federal;
    for (let d = 0; d < 5; d++) {
      const ang = -Math.PI / 2 + (d - 2) * 0.45;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.arc(bx + Math.cos(ang) * 14 * ease.out(k), by + Math.sin(ang) * 14 * ease.out(k) - 4, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// A pennant on the stern post. Overlapping action: each segment follows the one before it, late.
function pennant(ctx, H, t, live) {
  const [sx, sy] = H(1, 0), base = [sx + SHIP.D * 0.06, sy - SHIP.D * 0.6];
  const pts = [];
  for (let j = 0; j <= 10; j++) {
    const u = j / 10, flap = live ? chainWave(t, u, { amp: 14, freq: 5.2, wavelength: (2 * Math.PI) / 7 }) : 0;
    pts.push([base[0] + u * 70, base[1] - 6 * u + flap]);
  }
  inkLine(ctx, pts, { width: 4.5, color: INK.red, seed: 140, wobble: 0.8, taper: true });
}

// ---------- One frame ----------

function draw(canvas, T, on) {
  const ctx = canvas.getContext('2d');
  const k = canvas.width / 1000;
  const t = on.twos ? Math.floor(T * DRAWINGS_PER_SECOND) / DRAWINGS_PER_SECOND : T;
  const drawing = Math.floor(T * DRAWINGS_PER_SECOND);
  setBoil(on.boil ? drawing : 0);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Paper boils too: on each drawing the sheet lands a pixel or two differently.
  const jig = on.boil ? [[0, 0], [2, -1], [-1, 2], [1, 1]][drawing % 4] : [0, 0];
  ctx.drawImage(paper(canvas.width), jig[0] - 2, jig[1] - 2, canvas.width + 4, canvas.height + 4);
  ctx.setTransform(k, 0, 0, k, 0, 0);

  if (on.camera) {
    const n = noise2(77);
    ctx.translate(500, 500);
    ctx.rotate(n(t * 0.09, 5) * 0.012);
    const z = 1 + n(t * 0.07, 9) * 0.02;
    ctx.scale(z, z);
    ctx.translate(-500 + n(t * 0.12, 0) * 10, -500 + n(0, t * 0.1) * 6);
  }

  sun(ctx, 790, 190, 52);
  sea(ctx, t, on.ride);

  // The ship: a sine bob, or carried by the very waves drawn under it (heave and pitch).
  ctx.save();
  if (on.ride) {
    const { heave, pitch } = ride(wave, SHIP.cx, 200, t);
    ctx.translate(SHIP.cx, SHIP.wl + heave);
    ctx.rotate(pitch);
    ctx.translate(-SHIP.cx, -SHIP.wl);
  } else {
    ctx.translate(0, Math.sin(t * 1.4) * 3);
  }
  // Follow-through: the sail trails the hull's pitch by a third of a second and breathes.
  const sail = on.follow
    ? { lag: (lag(pitchAt, t, 0.35) - pitchAt(t)) * 2.4 + Math.sin(t * 1.9) * 0.02, belly: 10 + Math.sin(t * 1.6 + 0.5) * 6 }
    : { lag: 0, belly: 0 };
  const H = drawGalley(ctx, SHIP, {
    seed: 80, oars: t * 0.7, sail,
    oarAngle: on.timing ? (i) => oarStroke(i, t) : null,
  });
  pennant(ctx, H, t, on.follow);
  if (on.timing) splashes(ctx, H, t);
  ctx.restore();
}

// ---------- Page ----------

const rigid = document.getElementById('rigid'), alive = document.getElementById('alive');
for (const c of [rigid, alive]) { c.width = SIZE; c.height = SIZE; }
// Boil starts off: measured, dew holds still regions perfectly still between drawings.
const on = Object.fromEntries(Object.keys(PRINCIPLES).map((key) => [key, key !== 'boil']));
const RIGID = Object.fromEntries(Object.keys(PRINCIPLES).map((key) => [key, false]));

const panel = document.getElementById('principles');
for (const [key, label] of Object.entries(PRINCIPLES)) {
  const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
  b.setAttribute('aria-pressed', String(on[key]));
  b.addEventListener('click', () => { on[key] = !on[key]; b.setAttribute('aria-pressed', String(on[key])); last = -1; });
  panel.append(b);
}

let last = -1;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
loop((dt, now) => {
  const T = still ? 2 : now;
  draw(rigid, T, RIGID);
  // On twos the right canvas only redraws when a new drawing is due, as a hand-drawn film would.
  const drawing = Math.floor(T * DRAWINGS_PER_SECOND);
  if (!on.twos || drawing !== last) { draw(alive, T, on); last = drawing; }
}, alive);

window.renderPair = (T) => { draw(rigid, T, RIGID); draw(alive, T, on); };
