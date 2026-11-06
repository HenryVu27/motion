// The effect itself is pure CSS (see index.html). This file only builds the rows, wires the
// range buttons, and supplies a fallback for browsers without scroll-driven animations.
import { reducedMotion } from '../../shared/page.js';

const rows = document.getElementById('rows');
rows.innerHTML = Array.from({ length: 14 }, (_, i) =>
  `<li class="row"><span>Row ${String(i + 1).padStart(2, '0')}</span><span class="track"><span class="fill"></span></span><span class="pct"></span></li>`,
).join('');

// The range buttons only change an attribute; CSS maps it to animation-range.
const scroller = document.getElementById('scroller');
const buttons = [...document.querySelectorAll('#ranges button')];
for (const b of buttons) {
  b.addEventListener('click', () => {
    scroller.dataset.range = b.dataset.range;
    for (const o of buttons) o.setAttribute('aria-pressed', o === b);
  });
}

const supported = CSS.supports('animation-timeline: view()');
document.getElementById('support').textContent = supported ? 'native' : 'fallback';

if (!supported) {
  // Progressive enhancement: the page already reads fine. Add back an approximation of the motion.
  document.documentElement.classList.add('no-sda');
  // Rows toggle both ways, like the scrubbed original; prose reveals once and stays.
  const reveal = (root, once) => new IntersectionObserver((entries, io) => {
    for (const e of entries) {
      e.target.classList.toggle('is-in', e.isIntersecting || (once && e.target.classList.contains('is-in')));
      if (once && e.isIntersecting) io.unobserve(e.target);
    }
  }, { root, threshold: 0.6 });
  const inBox = reveal(scroller, false);
  rows.querySelectorAll('.row').forEach((r) => inBox.observe(r));
  // Ranges have no meaning without timelines.
  for (const b of buttons) b.disabled = true;
  const onPage = reveal(null, true);
  document.querySelectorAll('.reveal').forEach((el) => (reducedMotion() ? el.classList.add('is-in') : onPage.observe(el)));

  // The two progress bars: one rAF-throttled, passive scroll listener each.
  const bind = (source, readout, bar) => {
    let queued = false;
    const draw = () => {
      queued = false;
      const { top, max } = readout();
      bar.style.transform = `scaleX(${max > 0 ? top / max : 0})`;
    };
    source.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(draw); } }, { passive: true });
    draw();
  };
  const root = document.scrollingElement;
  bind(window, () => ({ top: root.scrollTop, max: root.scrollHeight - innerHeight }), document.querySelector('.reading-bar'));
  bind(scroller, () => ({ top: scroller.scrollTop, max: scroller.scrollHeight - scroller.clientHeight }), scroller.querySelector('.scroller-bar span'));
}
