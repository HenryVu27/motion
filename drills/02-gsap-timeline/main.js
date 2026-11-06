import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { reducedMotion } from '../../shared/page.js';

gsap.registerPlugin(DrawSVGPlugin);

// One timeline holds the whole sequence. It starts paused: something else decides when it runs.
const tl = gsap.timeline({ paused: true, defaults: { duration: 0.5, ease: 'power2.out' } });

tl.from('.premise', { scale: 0, opacity: 0, transformOrigin: '50% 50%', stagger: 0.15 })
  .from('.premise-label', { opacity: 0, y: 6, stagger: 0.15 }, '<0.1')
  .addLabel('links', '-=0.1')
  .from('#l-p1, #l-p2', { drawSVG: '0%', duration: 0.7, ease: 'power1.inOut', stagger: 0.1 }, 'links')
  .from('.lemma', { scale: 0, opacity: 0, transformOrigin: '50% 50%', ease: 'back.out(2)' }, '-=0.2')
  .from('.lemma-label', { opacity: 0, y: 6 }, '<')
  .from('#l-lemma', { drawSVG: '0%', duration: 0.6, ease: 'power1.inOut' })
  .from('#l-p3', { drawSVG: '0%', duration: 0.9, ease: 'power1.inOut' }, '<')
  .addLabel('land')
  .from('.conclusion', { scale: 0, opacity: 0, transformOrigin: '50% 50%', ease: 'back.out(2)' }, 'land-=0.15')
  .from('.conclusion-label', { opacity: 0, y: 6 }, '<')
  .to('.conclusion .glow', { opacity: 1, duration: 0.3 }, '<0.2');

// The ruler reads the timeline back: each child tween knows its start time and duration.
// These names and position strings run in the same order as the chain above.
const ROWS = [
  ['premises', '(start)'], ['their labels', '"<0.1"'], ['links 1, 2', '"links"'], ['lemma', '"-=0.2"'],
  ['its label', '"<"'], ['lemma link', '(after)'], ['link 3', '"<"'], ['conclusion', '"land-=0.15"'],
  ['its label', '"<"'], ['glow', '"<0.2"'],
];

const total = tl.duration();
const pct = (t) => `${(t / total) * 100}%`;
const ruler = document.getElementById('ruler');
const rows = tl.getChildren(false, true, false).map((tween, i) => {
  const row = document.createElement('div');
  row.className = 'row';
  const [name, pos] = ROWS[i] ?? ['tween', ''];
  row.innerHTML = `<span>${name}</span><code>${pos}</code><div class="track"></div>`;
  const track = row.lastElementChild;
  // A staggered tween is one child whose duration includes the stagger; draw one bar per target.
  const n = tween.targets().length;
  const stagger = typeof tween.vars.stagger === 'number' ? tween.vars.stagger : 0;
  const each = tween.duration() - stagger * (n - 1);
  for (let k = 0; k < (stagger ? n : 1); k++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.left = pct(tween.startTime() + k * stagger);
    bar.style.width = pct(stagger ? each : tween.duration());
    // Stacked thin bars make the stagger visible: same length, shifted start.
    if (stagger) Object.assign(bar.style, { height: `${8 / n}px`, top: `${7 + k * (8 / n + 1)}px` });
    track.append(bar);
  }
  ruler.append(row);
  return { row, start: tween.startTime(), end: tween.startTime() + tween.duration() };
});

// Header row: the labels, drawn as ticks where they sit on the clock.
const head = document.createElement('div');
head.className = 'row head';
head.innerHTML = '<span>labels</span><span></span><div class="track"></div>';
for (const [name, time] of Object.entries(tl.labels)) {
  const tick = document.createElement('div');
  tick.className = 'tick';
  tick.style.left = pct(time);
  if (time / total > 0.8) tick.classList.add('is-late');
  tick.textContent = name;
  head.lastElementChild.append(tick);
}
ruler.prepend(head);

// Everything visible is derived from the timeline on every update, so the UI cannot drift.
const scrub = document.getElementById('scrub');
const clock = document.getElementById('clock');
const playhead = document.getElementById('playhead');
function sync() {
  const t = tl.time();
  scrub.value = Math.round(tl.progress() * 1000);
  clock.textContent = `${t.toFixed(2)} s of ${total.toFixed(2)} s`;
  playhead.style.setProperty('--p', tl.progress());
  for (const r of rows) r.row.classList.toggle('is-live', t > r.start && t < r.end);
}
tl.eventCallback('onUpdate', sync);

const reduce = reducedMotion();
document.getElementById('play').addEventListener('click', () => {
  if (reduce) return tl.progress(1).pause();
  tl.progress() === 1 ? tl.restart() : tl.play();
});
document.getElementById('reverse').addEventListener('click', () => {
  if (reduce) return tl.progress(0).pause();
  tl.progress() === 0 ? tl.progress(1).reverse() : tl.reverse();
});
const slow = document.getElementById('slow');
slow.addEventListener('click', () => {
  const on = slow.getAttribute('aria-pressed') !== 'true';
  slow.setAttribute('aria-pressed', on);
  tl.timeScale(on ? 0.25 : 1);
});
scrub.addEventListener('input', () => tl.pause().progress(scrub.value / 1000));

// Reduced motion: show the finished diagram. Otherwise play once when the figure comes into view.
if (reduce) {
  tl.progress(1);
} else {
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { tl.play(); io.disconnect(); }
  }, { threshold: 0.5 });
  io.observe(document.getElementById('stage'));
}
sync();
