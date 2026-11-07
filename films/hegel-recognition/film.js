// Lord and Bondsman: Hegel, Phenomenology of Spirit (1807), paragraphs 178 to 196.
// Script and sources: script.md, sources.md (revision 2, approved 2026-11-07).
// Built beat by beat; this file currently holds beats 1 to 4 (0:00 to 0:38).
import { INK, clamp, ease, caption, inkLine, inkLayer, pathOf, wash, setBoil, smooth } from '../../film/kit.js';
import { cue, anticipate, spring, lag, overlap, drawingIndex } from '../../film/motion.js';
import { defineFilm } from '../../film/engine.js';
import { figure, vessel, drawPlan, drawInked, drawThing, drawVessel, crack, branch, fruit, dust, hand, FRUIT, SKIN_B } from './figures.js';

// ---------- Beat 1: Desire (0:00 to 0:07). Paragraph 175: the object and the desire come back. ----------

// Two reach-and-eat cycles, three seconds apart.
function desire(t) {
  const out = { reach: 0, grip: 0, fruit: 1, eatenAt: null };
  for (const c0 of [0.8, 3.8]) {
    if (t < c0) break;
    const k = t - c0;
    out.reach = k < 1.1 ? anticipate(k / 1.1, 0.12) : 1 - cue(k, 1.6, 2.3);   // pull back, reach, withdraw
    out.grip = cue(k, 1.0, 1.25);
    out.eatenAt = c0 + 1.3;
    // The fruit is gone the moment the hand closes, then buds again on a spring and overshoots.
    out.fruit = k < 1.3 ? (c0 === 0.8 ? 1 : out.fruit) : spring(k - 1.8, { from: 0, to: 1, freq: 14, damping: 5 }) * (k > 1.8 ? 1 : 0);
    if (k >= 1.3) out.grip = 1 - cue(k, 1.4, 1.8);
  }
  return out;
}

const beat1 = {
  name: 'desire', dur: 7, paperTone: INK.kraft,
  draw(ctx, { t }) {
    const d = desire(t);
    branch(ctx);
    fruit(ctx, FRUIT, d.fruit);
    if (d.eatenAt !== null) dust(ctx, FRUIT, t - d.eatenAt, Math.round(d.eatenAt * 10));
    drawInked(ctx, figure('A'), { seed: 3 });
    // The hand turns a beat after the forearm: follow-through on the wrist.
    hand(ctx, { target: FRUIT, reach: d.reach, grip: d.grip, lagAngle: 0.35 * (desire(t - 0.12).reach - d.reach) });
    const title = Math.min(cue(t, 0.9, 1.4), 1 - cue(t, 4.6, 5.1));
    caption(ctx, 'Lord and Bondsman', 700, 120, { size: 60, italic: false, alpha: title });
    caption(ctx, 'Hegel, Phenomenology of Spirit, 1807', 700, 168, { size: 24, alpha: title * 0.8, color: INK.sepia });
  },
};

// ---------- Beat 2: Another (0:07 to 0:19). Paragraphs 178, 182, 184 to 186. ----------

// The ideal first (paragraph 184, the pure notion of recognition): perfect mirroring, drawn only
// as a plan. Then how it first appears (185 to 186): each inks itself and sees the other as a thing.
const sway = (t) => 0.03 * Math.sin(((t - 1.5) / 2.4) * Math.PI * 2) * cue(t, 1.4, 2);
const blinkAt = (t, times) => times.reduce((b, s) => Math.max(b, 1 - Math.abs(t - s) / 0.09), 0);

const beat2 = {
  name: 'another', dur: 12,
  draw(ctx, { t }) {
    // 0 to 1: the branch withdraws and A turns from ink into a plan.
    if (t < 1.2) branch(ctx, { dy: -420 * ease.in(cue(t, 0, 1, (x) => x)) });
    const lean = 0.02 * ease.out(cue(t, 11, 11.6));   // the last second: both lean in, inked
    const ta = t < 6 ? sway(t) : lean, tb = t < 6 ? lag(sway, t, 0.25) : lean;
    const A = figure('A', ta), B = figure('B', tb), V = vessel(A, B);

    const planned = Math.min(cue(t, 0.2, 1.2), 1 - cue(t, 6, 6.5));
    const aInk = t < 1 ? 1 - cue(t, 0.2, 0.9) : t < 6 ? 0 : t < 8 ? cue(t, 6, 6.35) : t < 10 ? 1 - cue(t, 8, 8.3) : cue(t, 11, 11.3);
    const bInk = t < 8 ? 0 : t < 10 ? cue(t, 8, 8.35) : cue(t, 11, 11.3);
    const aThing = t < 6 ? 0 : t < 8 ? 0 : t < 11 ? cue(t, 8, 8.3) : 1 - cue(t, 11, 11.3);
    const bThing = t < 6 ? 0 : t < 8 ? cue(t, 6, 6.3) : t < 10 ? 1 - cue(t, 8, 8.3) : t < 11 ? cue(t, 10, 10.25) : 1 - cue(t, 11, 11.3);
    const aThingAll = t >= 10 && t < 11 ? cue(t, 10, 10.25) : 0;

    // The vase: a plan while they mirror, inked on its own for one captionless second.
    if (planned > 0) inkLine(ctx, [...V, V[0]], { width: 0.9, color: INK.blue, alpha: 0.55 * planned, progress: cue(t, 0.8, 1.8), taper: false, passes: 1, seed: 71 });
    drawVessel(ctx, V, { amount: t < 10 ? 0 : t < 11 ? cue(t, 10, 10.25) : 1 - 0.4 * cue(t, 11, 11.4) });

    if (planned > 0) {
      drawPlan(ctx, A, { alpha: 0.7 * planned, seed: 81 });
      drawPlan(ctx, B, { alpha: 0.7 * planned, progress: cue(t, 0.2, 1.5), seed: 91 });
    }
    // The plan's eyes blink in turn, B a quarter second after A.
    if (planned > 0.5 && t < 6) {
      const ba = blinkAt(t, [3.0, 4.6]), bb = blinkAt(t, [3.25, 4.85]);
      if (ba > 0) inkLine(ctx, [[A.eye[0] - 13, A.eye[1]], [A.eye[0] + 13, A.eye[1] + 1]], { width: 2.2, color: INK.blue, seed: 33, alpha: ba });
      if (bb > 0) inkLine(ctx, [[B.eye[0] - 13, B.eye[1] + 1], [B.eye[0] + 13, B.eye[1]]], { width: 2.2, color: INK.blue, seed: 34, alpha: bb });
    }
    drawThing(ctx, A, { amount: Math.max(aThing, aThingAll) });
    drawThing(ctx, B, { amount: bThing });
    if (aInk > 0.01) drawInked(ctx, A, { ink: aInk, seed: 3 });
    if (bInk > 0.01) drawInked(ctx, B, { ink: bInk, skin: SKIN_B, seed: 13 });
  },
};

// ---------- Beat 3: The struggle (0:19 to 0:27). Paragraph 187: each seeks the other's death and stakes its own life. ----------

const LUNGES = [0.6, 4.0], CONTACT = 1.0, REACH = 0.3;   // head-only tilt needs a little more swing to meet
// Lean back, lunge until the brows meet, recoil on a damped spring; then again.
function lungeTilt(t) {
  const L = t < LUNGES[1] ? LUNGES[0] : LUNGES[1], k = t - L;
  if (k < 0) return 0;
  if (k < CONTACT) return REACH * anticipate(k / CONTACT, 0.25);
  return spring(k - CONTACT, { from: REACH, to: 0, freq: 9, damping: 3.5 });
}
const contacts = LUNGES.map((l) => l + CONTACT);
const near = (t, at, w) => Math.exp(-(((t - at) / w) ** 2));

const beat3 = {
  name: 'struggle', dur: 8,
  draw(ctx, { t }) {
    setBoil(drawingIndex(t));   // every drawing redrawn: the lines shake while they fight
    try {
      const hit = contacts.map((c) => (t >= c && t < c + 0.5 ? t - c : null)).find((k) => k !== null);
      if (hit != null) ctx.translate(Math.sin(hit * 60) * 7 * Math.exp(-8 * hit), Math.cos(hit * 47) * 4 * Math.exp(-8 * hit));   // the jolt
      const tilt = lungeTilt(t), A = figure('A', tilt), B = figure('B', tilt), V = vessel(A, B);
      drawVessel(ctx, V, { amount: 0.6 });
      crack(ctx, V, { progress: 0.5 * cue(t, contacts[0], contacts[0] + 0.4) + 0.5 * cue(t, contacts[1], contacts[1] + 0.5), bleed: cue(t, contacts[1], contacts[1] + 2.5) });
      // Staking its own life: each lunger's line thins as it strikes.
      const risk = 1 - 0.5 * Math.max(...contacts.map((c) => near(t, c, 0.3)));
      drawInked(ctx, A, { line: risk, seed: 3 });
      drawInked(ctx, B, { line: risk, skin: SKIN_B, seed: 13 });
      // Riso red printed off register over both outlines: the fight in a second ink.
      for (const f of [A, B]) inkLayer(ctx, (g) => { g.strokeStyle = INK.red; g.lineWidth = 2.4; g.globalAlpha = 0.55; pathOf(g, f.outline); g.stroke(); }, { grain: 0.45, offset: [5, 3], seed: 9 });
      // At contact, a burst of short strokes where the brows meet.
      for (const c of contacts) {
        const k = t - c;
        if (k < 0 || k > 0.35) continue;
        const brow = [500, A.front.find((p) => p[1] > 380)?.[1] ?? 400];
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI / 2 + (i - 4) * 0.38, r0 = 22 + k * 120, r1 = r0 + 26 * (1 - k / 0.35);
          inkLine(ctx, [[brow[0] + Math.cos(a) * r0, brow[1] + Math.sin(a) * r0], [brow[0] + Math.cos(a) * r1, brow[1] + Math.sin(a) * r1]], { width: 2.4, seed: 40 + i, color: i % 2 ? INK.red : INK.ink });
        }
      }
    } finally {
      setBoil(0);
    }
  },
};

// ---------- Beat 4: The brink, and one yields (0:27 to 0:38). Paragraphs 188 to 190. ----------

// The bow: a heavy, slow give that overshoots a little and settles; the crown lags the neck.
const BOW = 0.5;   // radians: about 29 degrees
const bowDrive = (t) => (t < 5 ? 0 : BOW - spring(t - 5, { from: BOW, to: 0, freq: 4, damping: 2.2 }));
export const bowAt = (t) => (u) => overlap(bowDrive, t, u, { delay: 0.18 });

const beat4 = {
  name: 'brink', dur: 11,
  draw(ctx, { t }) {
    const A = figure('A'), B = figure('B', 0, bowAt(t));
    const drain = cue(t, 0.3, 4);                       // B drains toward bare paper
    const back = cue(t, 5.2, 6.5);                      // and both lines come back as he bows
    // 0 to 5: if one of them dies, the middle between them collapses into a smear (paragraph 188).
    const collapse = cue(t, 0.5, 3.5);
    const V0 = vessel(figure('A'), figure('B'));
    const bottom = Math.max(...V0.map((p) => p[1]));
    const smear = V0.map(([x, y]) => [x, bottom + (y - bottom) * (1 - 0.92 * collapse)]);
    if (t < 5) {
      drawVessel(ctx, smear, { amount: 0.6 * (1 - cue(t, 3, 4.6)) });
      crack(ctx, smear, { progress: 1, bleed: 1 - cue(t, 2, 4.6) });
    } else {
      // The middle reforms, lopsided: not a vessel any more.
      drawVessel(ctx, vessel(A, B, 450), { amount: 0.45 * cue(t, 6, 7.5) });   // cut below the bowed face, so no slanted lid
    }
    const washIn = Math.min(cue(t, 0.3, 1.6), 1 - cue(t, 2.6, 4.6));
    if (washIn > 0) { ctx.save(); ctx.globalAlpha = washIn; wash(ctx, B.outline, { color: '#9aa6b8', seed: 5, layers: 10, alpha: 0.1, spread: 0.03 }); ctx.restore(); }
    // A's front edge, with nothing facing it, frays away too; both come back with the bow.
    const aFade = t < 5 ? cue(t, 1.2, 4.2) : 1 - back;
    drawInked(ctx, A, { ink: 1 - 0.75 * aFade, fray: aFade, seed: 3 });
    const bInk = t < 5 ? 1 - drain : back;
    if (bInk > 0.01) drawInked(ctx, B, { ink: bInk, skin: SKIN_B, seed: 13 });
    // 8 to 11: his chain, his attachment to life, draws itself from him to the ground (paragraph 190).
    const tether = cue(t, 8, 9.4);
    if (tether > 0) {
      const from = B.front.find((p) => p[1] > 760) ?? [600, 800];
      inkLine(ctx, smooth([from, [from[0] + 30, from[1] + 70], [from[0] + 20, 900], [from[0] + 60, 1010]], 8), { width: 3.4, color: INK.ink, progress: tether, seed: 77 });
    }
  },
};

export default defineFilm({
  title: 'Lord and Bondsman',
  size: 1080,
  fps: 24,
  drawings: 12,
  scenes: [beat1, beat2, beat3, beat4],
  crossfade: 0.4,
  captions: [
    { at: 8, until: 12, text: 'A self is a self only when recognised by another.' },
  ],
});
