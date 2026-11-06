import { reducedMotion } from '../../shared/page.js';

// Six plates. The shapes are paths in a 100 x 100 box so the tile and the detail draw the same thing.
const poly = (n, r = 44, rot = -90) => 'M' + Array.from({ length: n }, (_, k) => {
  const a = ((rot + (k * 360) / n) * Math.PI) / 180;
  return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
}).join(' L') + ' Z';

const PLATES = [
  { id: 'circle', name: 'Circle', sub: 'no corners', d: 'M50,6 A44,44 0 1 1 49.99,6 Z',
    text: 'Of all closed curves with a given perimeter, the circle encloses the most area.' },
  { id: 'triangle', name: 'Triangle', sub: 'three sides', d: poly(3, 48, -90),
    text: 'Build a triangle from rods and pins and it cannot be pushed out of shape, which is why trusses are made of them.' },
  { id: 'square', name: 'Square', sub: 'four sides', d: poly(4, 46, -45),
    text: 'Squares tile the plane, four meeting at every corner.' },
  { id: 'pentagon', name: 'Pentagon', sub: 'five sides', d: poly(5, 46, -90),
    text: 'Regular pentagons cannot tile the plane: three of their 108 degree corners leave a gap, four overlap.' },
  { id: 'hexagon', name: 'Hexagon', sub: 'six sides', d: poly(6, 46, -90),
    text: 'Hexagons tile the plane, three meeting at every corner, as in a honeycomb.' },
  { id: 'rhombus', name: 'Rhombus', sub: 'four equal sides', d: 'M50,4 L80,50 L50,96 L20,50 Z',
    text: 'Four equal sides, and diagonals that cross at right angles.' },
];

// ---------- Build the grid ----------
const list = document.getElementById('plates');
list.innerHTML = PLATES.map((p) => `
  <li><button class="plate" type="button" data-id="${p.id}" aria-label="${p.name}, open detail">
    <svg class="shape" viewBox="0 0 100 100" aria-hidden="true"><path d="${p.d}"/></svg>
    <span class="plate-title">${p.name}</span><small>${p.sub}</small>
  </button></li>`).join('');

const tiles = Object.fromEntries([...list.querySelectorAll('.plate')].map((b) => [b.dataset.id,
  { button: b, shape: b.querySelector('.shape'), title: b.querySelector('.plate-title') }]));
const gridView = document.getElementById('grid-view');
const detailView = document.getElementById('detail-view');
const detail = { shape: detailView.querySelector('.shape'), title: document.getElementById('detail-title') };
let openId = null;

// ---------- The plain state change. It knows nothing about animation. ----------
function render(id) {
  openId = id;
  if (id) {
    const p = PLATES.find((x) => x.id === id);
    document.getElementById('detail-path').setAttribute('d', p.d);
    detail.title.textContent = p.name;
    document.getElementById('detail-text').textContent = p.text;
  }
  gridView.inert = !!id;
  detailView.inert = !id;
}

// ---------- The transition wrapper ----------
const name = (el, base) => {
  el.shape.style.viewTransitionName = base ? `${base}-shape` : '';
  el.title.style.viewTransitionName = base ? `${base}-title` : '';
};
let transitionsOn = true;
const canTransition = () => typeof document.startViewTransition === 'function' && transitionsOn && !reducedMotion();

function go(id) {
  const from = id ? tiles[id] : detail;
  const to = id ? detail : tiles[openId];
  const done = () => (id ? detail.title.focus({ preventScroll: true }) : to.button.focus({ preventScroll: true }));
  if (!canTransition()) { render(id); done(); return; }

  name(from, 'plate');                       // old snapshot: the element that is leaving owns the names
  const vt = document.startViewTransition(() => {
    name(from, '');                          // names must be unique in each snapshot
    render(id);
    name(to, 'plate');                       // new snapshot: the arriving element takes them over
  });
  vt.updateCallbackDone.then(done);
  vt.finished.finally(() => name(to, ''));   // clear, so the next transition starts clean
}

list.addEventListener('click', (e) => {
  const b = e.target.closest('.plate');
  if (b) go(b.dataset.id);
});
document.getElementById('back').addEventListener('click', () => go(null));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && openId) go(null); });

// ---------- Learning controls ----------
const support = document.getElementById('support');
const supported = typeof document.startViewTransition === 'function';
support.textContent = supported ? (reducedMotion() ? 'reduced motion: instant swap' : 'API supported') : 'not supported: instant swap';

const slow = document.getElementById('slow');
slow.addEventListener('click', () => {
  const on = slow.getAttribute('aria-pressed') !== 'true';
  slow.setAttribute('aria-pressed', on);
  document.documentElement.classList.toggle('is-slow', on);
});
const toggle = document.getElementById('vt-toggle');
toggle.addEventListener('click', () => {
  transitionsOn = !transitionsOn;
  toggle.setAttribute('aria-pressed', transitionsOn);
  toggle.textContent = transitionsOn ? 'View transition on' : 'View transition off';
});
if (!supported) {
  toggle.disabled = slow.disabled = true;
  toggle.setAttribute('aria-pressed', false);
  toggle.textContent = 'View transition unavailable';
}
