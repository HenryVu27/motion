// Lord and Bondsman: Hegel, Phenomenology of Spirit (1807), paragraphs 178 to 196.
// Script and sources: script.md, sources.md (revision 2, approved 2026-11-07).
// Built beat by beat; this file currently holds beats 1 and 2 (0:00 to 0:19).
import { INK, clamp, ease, caption, inkLine } from '../../film/kit.js';
import { cue, anticipate, spring, lag } from '../../film/motion.js';
import { defineFilm } from '../../film/engine.js';
import { figure, vessel, drawPlan, drawInked, drawThing, drawVessel, branch, fruit, dust, hand, FRUIT, SKIN_B } from './figures.js';

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
    hand(ctx, { shoulder: [330, 800], rest: [420, 980], target: FRUIT, reach: d.reach, grip: d.grip, lagAngle: 0.35 * (desire(t - 0.12).reach - d.reach) });
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

export default defineFilm({
  title: 'Lord and Bondsman',
  size: 1080,
  fps: 24,
  drawings: 12,
  scenes: [beat1, beat2],
  crossfade: 0.4,
  captions: [
    { at: 8, until: 12, text: 'A self is a self only when recognised by another.' },
  ],
});
