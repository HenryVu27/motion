import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reducedMotion } from '../../shared/page.js';

gsap.registerPlugin(ScrollTrigger);

// ---------- Data: sixty dots in three groups (30, 18, 12). Group 2 is the accent group. ----------
const N = 60;
const group = (i) => (i < 30 ? 0 : i < 48 ? 1 : 2);
const indexInGroup = (i) => i - [0, 30, 48][group(i)];

// Seeded random so the scatter is the same on every load.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// ---------- Layouts: each is just an array of target positions in viewBox units. ----------
const LAYOUTS = {
  scatter: Array.from({ length: N }, () => ({ x: 40 + rand() * 320, y: 40 + rand() * 300 })),
  grid: Array.from({ length: N }, (_, i) => ({ x: 65 + (i % 10) * 30, y: 125 + Math.floor(i / 10) * 30 })),
  groups: Array.from({ length: N }, (_, i) => {
    const [cx, cy] = [[105, 180], [275, 140], [285, 280]][group(i)];
    const k = indexInGroup(i), r = 8 * Math.sqrt(k + 0.5), a = k * 2.39996; // golden-angle packing
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }),
  bars: Array.from({ length: N }, (_, i) => {
    const k = indexInGroup(i);
    return { x: [120, 200, 280][group(i)] + ((k % 3) - 1) * 13, y: 340 - Math.floor(k / 3) * 13 };
  }),
  ring: Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
    return { x: 200 + 130 * Math.cos(a), y: 195 + 130 * Math.sin(a) };
  }),
};
const NAMES = { scatter: 'Scatter', grid: 'Grid', groups: 'Groups', bars: 'Columns, scrubbed', ring: 'Ring' };

// ---------- Rendering: one array of current positions, drawn on every tween update. ----------
const svg = document.getElementById('dots');
const layer = document.getElementById('dot-layer');
const ns = 'http://www.w3.org/2000/svg';
const dots = Array.from({ length: N }, (_, i) => {
  const c = document.createElementNS(ns, 'circle');
  c.setAttribute('r', 5);
  c.setAttribute('class', `dot g${group(i)}`);
  layer.append(c);
  return c;
});
const cur = LAYOUTS.scatter.map((p) => ({ ...p }));
const draw = () => cur.forEach((p, i) => dots[i].setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`));
draw();

const reduce = reducedMotion();
// Every move, discrete or scrubbed, retargets from wherever the dots are right now.
function moveTo(targets, vars = {}) {
  gsap.to(cur, {
    x: (i) => targets[i].x, y: (i) => targets[i].y,
    duration: reduce ? 0 : 0.9, ease: 'power2.inOut', overwrite: true, onUpdate: draw, ...vars,
    ...(reduce ? { stagger: 0 } : {}),
  });
}

// The scrubbed walk: progress p in 0..1. Dot i walks during its own short window, in order.
const W = 0.18;
const ease = gsap.parseEase('power2.inOut');
function walk(p) {
  let placed = 0;
  const targets = LAYOUTS.groups.map((from, i) => {
    const start = (i / (N - 1)) * (1 - W);
    const t = gsap.utils.clamp(0, 1, (p - start) / W);
    if (t >= 1) placed++;
    const to = LAYOUTS.bars[i], e = ease(t);
    return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
  });
  // A short catch-up tween smooths the gaps between scroll events without lagging the hand.
  moveTo(targets, { duration: reduce ? 0 : 0.25, ease: 'power1.out' });
  extra.textContent = `${placed} of ${N} counted`;
}

// ---------- Steps ----------
const steps = [...document.querySelectorAll('.step')];
const SCRUB = steps.findIndex((s) => s.classList.contains('is-scrub'));
const stateN = document.getElementById('state-n');
const stateName = document.getElementById('state-name');
const extra = document.getElementById('state-extra');
let active = -1;
let scrubTrigger;

function activate(i) {
  if (i === active) return;
  active = i;
  const layout = steps[i].dataset.layout;
  steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
  svg.classList.toggle('is-accent', i >= 2);
  svg.classList.toggle('show-groups', layout === 'groups');
  svg.classList.toggle('show-bars', layout === 'bars');
  stateN.textContent = `${i + 1} / ${steps.length}`;
  stateName.textContent = NAMES[layout];
  extra.textContent = '';
  if (i === SCRUB) walk(scrubTrigger.progress);
  else moveTo(LAYOUTS[layout], reduce ? {} : { stagger: { amount: 0.35, from: 'random' } });
}

// The trigger line: the middle of the reading area. On phones the graphic covers the top half.
const phone = matchMedia('(max-width: 760px)');
const line = () => (phone.matches ? 76 : 60);

// The current step is the last one whose top has crossed the line. Deriving it from the scroll
// position (rather than trusting a single enter event) survives fast flings and mid-page reloads.
const triggers = [];
function sync() {
  if (triggers.length < steps.length) return;
  const y = triggers[0].scroll();
  let idx = 0;
  triggers.forEach((t, i) => { if (y >= t.start) idx = i; });
  activate(idx);
}
steps.forEach((step, i) => {
  triggers.push(ScrollTrigger.create({
    trigger: step,
    start: () => `top ${line()}%`,
    end: () => `bottom ${line()}%`,
    // Not onToggle: a fling that jumps a whole step fires enter and leave but never toggles.
    onEnter: sync, onLeave: sync, onEnterBack: sync, onLeaveBack: sync,
    onUpdate: i === SCRUB ? (self) => active === SCRUB && walk(self.progress) : undefined,
  }));
});
scrubTrigger = triggers[SCRUB];
ScrollTrigger.addEventListener('refresh', sync);
sync();

// Learning aid: show where the line sits.
const lineEl = document.querySelector('.trigger-line');
const placeLine = () => lineEl.style.setProperty('--line', `${line()}%`);
placeLine();
phone.addEventListener('change', placeLine);
const toggle = document.getElementById('toggle-line');
toggle.addEventListener('click', () => {
  const on = toggle.getAttribute('aria-pressed') !== 'true';
  toggle.setAttribute('aria-pressed', on);
  document.documentElement.classList.toggle('show-line', on);
});

// Web fonts change paragraph heights; measure again once they are in.
document.fonts.ready.then(() => ScrollTrigger.refresh());
