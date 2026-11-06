// Ship of Theseus. One number drives everything: s, the story position, runs from 0 to 9 as the
// reader scrolls through the nine steps (step b covers s in [b-1, b]). render(s) draws any moment
// of the story from scratch, so scrolling backwards, jumping and reduced motion all work for free.
import { loop, reducedMotion } from '../../shared/page.js';

const NS = 'http://www.w3.org/2000/svg';
const ROWS = 3, COLS = 8, N = ROWS * COLS;   // 24 planks
const EDGE = 4;                              // samples per plank edge, so planks follow the hull curve
const A = { cx: 300, wl: 380 };              // repaired ship, on the water
const B = { cx: 790, wl: 392 };              // rebuilt ship, on the shore
const GROUND = 430;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (s, a, b) => clamp((s - a) / (b - a));   // 0 before a, 1 after b

// ---------- Geometry ----------

// A point on the hull surface: u runs bow (0) to stern (1), v runs deck (0) to keel (1).
function hullPoint({ cx, wl }, u, v) {
  const e = Math.abs(2 * u - 1);
  const deck = wl - 58 - 46 * e ** 3 - (u > 0.5 ? 18 * ((u - 0.5) * 2) ** 4 : 0);
  const depth = 92 * Math.pow(1 - e ** 2.4, 0.7);
  return [cx - 190 + 380 * u, deck + v * depth];
}

// Plank polygon on a hull: top edge bow to stern, then bottom edge back.
function plankOnHull(ship, i) {
  const r = Math.floor(i / COLS), c = i % COLS;
  const u0 = c / COLS, u1 = (c + 1) / COLS, v0 = r / ROWS, v1 = (r + 1) / ROWS;
  const top = [], bottom = [];
  for (let k = 0; k <= EDGE; k++) {
    const u = lerp(u0, u1, k / EDGE);
    top.push(hullPoint(ship, u, v0));
    bottom.unshift(hullPoint(ship, u, v1));
  }
  return [...top, ...bottom];
}

// The same polygon laid flat as a plank in the keeper's pile.
function plankInPile(slot) {
  const col = slot % 3, row = Math.floor(slot / 3);
  const x0 = 612 + col * 128 + ((row * 37) % 11) - 5, y0 = GROUND - 2 - (row + 1) * 10, w = 112, h = 8;
  const top = [], bottom = [];
  for (let k = 0; k <= EDGE; k++) {
    top.push([x0 + (w * k) / EDGE, y0]);
    bottom.unshift([x0 + (w * k) / EDGE, y0 + h]);
  }
  return [...top, ...bottom];
}

const lerpPoly = (p, q, t, lift = 0) => p.map(([x, y], j) => [lerp(x, q[j][0], t), lerp(y, q[j][1], t) - lift]);
const shift = (p, dx, dy) => p.map(([x, y]) => [x + dx, y + dy]);
const pathOf = (p) => 'M' + p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';

// Planks rot in no particular order: a fixed shuffle so every reader sees the same repair sequence.
const order = (() => {
  const a = [...Array(N).keys()];
  let seed = 7;
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
})();
const slotOf = new Map(order.map((plank, k) => [plank, k]));   // replaced k-th lands in pile slot k

// ---------- Scene ----------

const svg = document.getElementById('ship-svg');
const el = (tag, attrs = {}, parent = svg) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent.append(n);
  return n;
};

// The shore is a ground line with a little hatching under it, not a filled box.
el('path', { class: 'land-edge', d: `M560,${GROUND + 12} Q585,${GROUND} 615,${GROUND} L1000,${GROUND}` });
for (let x = 600; x < 1000; x += 26) el('line', { class: 'land-hatch', x1: x, y1: GROUND + 10, x2: x - 12, y2: GROUND + 22 });
const sea = el('g', { class: 'sea' });
const waves = [0, 1, 2, 3].map((r) => el('line', { x1: 0, x2: 560, y1: A.wl + r * 16, y2: A.wl + r * 16, 'stroke-dasharray': `${40 + r * 12} ${18 + r * 6}` }, sea));

function rig(ship, parent) {
  const g = el('g', { class: 'rig' }, parent);
  const [mx, my] = hullPoint(ship, 0.5, 0);
  el('path', { class: 'sail', d: `M${mx - 105},${ship.wl - 232} L${mx + 105},${ship.wl - 232} L${mx + 92},${ship.wl - 112} L${mx - 92},${ship.wl - 112}Z` }, g);
  el('line', { x1: mx, y1: my, x2: mx, y2: ship.wl - 250 }, g);
  el('line', { x1: mx - 115, y1: ship.wl - 234, x2: mx + 115, y2: ship.wl - 234 }, g);
  const [sx, sy] = hullPoint(ship, 1, 0);
  el('path', { d: `M${sx},${sy} Q${sx + 26},${sy - 30} ${sx + 6},${sy - 58} Q${sx - 8},${sy - 66} ${sx - 6},${sy - 50}` }, g);
  const [bx, by] = hullPoint(ship, 0, 0);
  el('path', { d: `M${bx},${by} L${bx - 22},${by + 40}` }, g);
  return g;
}

const shipA = el('g', { class: 'ship' });
const rigA = rig(A, shipA);
const oars = el('g', { class: 'oars' }, shipA);
for (let i = 0; i < 15; i++) {
  const u = 0.16 + (i * 0.68) / 14;
  const [x, y] = hullPoint(A, u, 0.28);
  el('line', { class: 'oar', x1: x, y1: y, x2: x - 30, y2: A.wl + 26 }, oars);
}
const shipB = el('g', { class: 'ship' });
const rigB = rig(B, shipB);

// New planks live in ship A's group; old planks are free agents that travel hull A, pile, hull B.
const hullA = el('g', {}, shipA);
const newPlanks = [], oldPlanks = [];
for (let i = 0; i < N; i++) newPlanks.push(el('path', { class: 'plank new' }, hullA));
const travellers = el('g', {});
for (let i = 0; i < N; i++) oldPlanks.push(el('path', { class: 'plank old' }, travellers));

// Labels: sans, set in the figure, values in ink.
const label = (x, y, cls, anchor = 'start') => el('text', { x, y, class: cls, 'text-anchor': anchor });
const topLeft = label(976, 140, 'label-num', 'end');   // upper right stays clear of the mast until the rebuild
const oarNote = label(A.cx - 150, A.wl + 78, 'label');
const pileNote = label(790, 330, 'label', 'middle');
// Phones get bigger type (lesson.css), so the label block's line spacing scales with it.
const compact = () => innerWidth <= 700;
function shipLabels(ship) {
  const g = el('g', {});
  const name = label(0, 0, 'label-strong');
  const note = label(0, 0, 'label');
  const track = el('rect', { height: 6, width: 160, class: 'bar-bg' }, g);
  const bar = el('rect', { height: 6, width: 160, class: 'bar-fg' }, g);
  const pct = label(0, 0, 'label-num');
  g.append(name, note, pct);
  const place = () => {
    const k = compact() ? 2 : 1, x = ship.cx - 120, y = compact() ? 466 : 470;
    name.setAttribute('x', x); name.setAttribute('y', y);
    note.setAttribute('x', x); note.setAttribute('y', y + 22 * k);
    for (const r of [track, bar]) { r.setAttribute('x', x); r.setAttribute('y', y + 34 * k - 6 * (k - 1)); r.setAttribute('height', 6 * k); }
    pct.setAttribute('x', x + 170); pct.setAttribute('y', y + 41 * k);
  };
  place();
  addEventListener('resize', place);
  return { g, name, note, bar, pct };
}
const labA = shipLabels(A);
const labB = shipLabels(B);

// ---------- Render any moment ----------

let choice = null;
const homeA = Array.from({ length: N }, (_, i) => plankOnHull(A, i));
const homeB = Array.from({ length: N }, (_, i) => plankOnHull(B, i));
const pile = Array.from({ length: N }, (_, k) => plankInPile(k));

function render(s, time = 0) {
  const still = reducedMotion();

  // Beat 1: the ship sails home while the days since the verdict tick by.
  const voyage = easeOut(span(s, 0, 0.85));
  const bob = still ? 0 : Math.sin(time * 1.6) * 2;
  const dx = lerp(-560, 0, voyage);
  shipA.setAttribute('transform', `translate(${dx},${bob})`);
  waves.forEach((w, r) => w.setAttribute('stroke-dashoffset', still ? 0 : (-time * (8 + r * 3)).toFixed(1)));
  const day = 1 + Math.round(29 * span(s, 0.05, 0.9));
  topLeft.textContent = s < 1.15 ? `Day ${day} after the verdict` : '';

  // Beat 2: thirty oars, fifteen of them on this side.
  const oarsLit = s > 1.1 && s < 2.1;
  oars.classList.toggle('lit', oarsLit);
  oarNote.textContent = oarsLit ? '30 oars, 15 per side' : '';

  // Beat 3: replace plank by plank. Replacement k runs while pr goes from k to k+1.
  const pr = span(s, 2.05, 2.95) * N;
  let replaced = 0;
  // Beat 6: the keeper rebuilds; plank k starts a little after plank k-1.
  const pb = span(s, 5.05, 5.85);
  for (let i = 0; i < N; i++) {
    const k = slotOf.get(i);
    const out = clamp(pr - k);
    const back = clamp(pb * 1.6 - (k / N) * 0.6);
    if (out >= 1) replaced++;

    const fresh = easeOut(out);
    newPlanks[i].setAttribute('d', pathOf(shift(homeA[i], 0, -46 * (1 - fresh))));
    newPlanks[i].style.opacity = fresh;

    let poly;
    if (back > 0) poly = lerpPoly(pile[k], homeB[i], easeInOut(back), Math.sin(Math.PI * back) * 90);
    else if (out > 0) poly = lerpPoly(shift(homeA[i], dx, bob), pile[k], easeInOut(out), Math.sin(Math.PI * out) * 70);
    else poly = shift(homeA[i], dx, bob);
    oldPlanks[i].setAttribute('d', pathOf(poly));
  }
  if (s >= 2 && s < 4.2) topLeft.textContent = `Planks replaced: ${replaced} of ${N}`;

  // Beats 2 to 9: ship labels and the share of original timber.
  const showA = s > 1.9;
  labA.g.style.opacity = labA.name.style.opacity = labA.note.style.opacity = labA.pct.style.opacity = showA ? 1 : 0;
  const keptA = (N - replaced) / N;
  labA.bar.setAttribute('width', 160 * keptA);
  labA.pct.textContent = `${Math.round(keptA * 100)}%`;
  labA.name.textContent = s > 5.5 ? 'Repaired' : 'The ship';
  labA.note.textContent = s > 7.1 ? 'same form, unbroken history' : 'original timber';

  // Beat 5: point at the pile.
  pileNote.textContent = s > 4.05 && s < 5.1 ? 'The old planks, in order' : '';

  // Beat 6: the second ship takes shape, then gets its mast and sail.
  const rigged = span(pb, 0.85, 1);
  rigB.style.opacity = rigged;
  const showB = rigged > 0.5;
  for (const n of [labB.g, labB.name, labB.note, labB.pct]) n.style.opacity = showB ? 1 : 0;
  labB.name.textContent = 'Rebuilt';
  labB.note.textContent = s > 7.1 ? 'same matter, same order' : 'original timber';
  labB.pct.textContent = '100%';

  // Beat 7: the reader's choice lights one ship (or both, or neither).
  const judging = s > 6.05 && choice;
  shipA.classList.toggle('dim', !!judging && (choice === 'rebuilt' || choice === 'neither'));
  travellers.classList.toggle('dim', !!judging && (choice === 'repaired' || choice === 'neither'));
  shipB.classList.toggle('dim', !!judging && (choice === 'repaired' || choice === 'neither'));
}

// ---------- Scroll to story position ----------

const steps = [...document.querySelectorAll('.step')];
let target = 0, current = 0;

function readScroll() {
  const anchor = innerHeight * (innerWidth >= 1100 ? 0.55 : 0.75);
  target = steps.reduce((sum, step) => {
    const r = step.getBoundingClientRect();
    return sum + clamp((anchor - r.top) / r.height);
  }, 0);
  steps.forEach((step, i) => step.classList.toggle('is-active', target >= i && target < i + 1));
}
addEventListener('scroll', readScroll, { passive: true });
addEventListener('resize', readScroll);
readScroll();

// Ease the drawn position toward the scroll position: smooth on a wheel, exact when reduced motion is on.
loop((dt, t) => {
  current = reducedMotion() ? target : current + (target - current) * Math.min(1, dt * 7);
  render(current, t);
}, svg);
render(target);

// ---------- The choice ----------

const VERDICTS = {
  repaired: 'You are tracking form and history: the ship that kept sailing, mended without a break. The cost: the rebuilt ship is made of every original plank, in the original order, and you have to call it a copy.',
  rebuilt: 'You are tracking matter: a ship is its wood. Hobbes’s own definition says this. The cost: once every plank was swapped, the relic the Athenians honored was not Theseus’s ship at all.',
  both: 'Hobbes calls this outcome absurd: “two ships numerically the same.” Two things cannot be one thing, so something in the question has to give.',
  neither: 'This is Hobbes’s third opinion taken seriously: if a thing is the sum of all its features, nothing stays the same, so “a man standing would not be the same he was sitting.”',
};
const verdict = document.getElementById('verdict');
for (const btn of document.querySelectorAll('[data-choice]')) {
  btn.addEventListener('click', () => {
    choice = btn.dataset.choice;
    document.querySelectorAll('[data-choice]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    verdict.textContent = VERDICTS[choice];
    render(current);
  });
}
