import { fitCanvas, loop, token, reducedMotion, onThemeChange } from '../../shared/page.js';

// Toy data. Invented numbers for invented groups: this drill is about the mechanism only.
const UNIT = 1000;
const GROUPS = [
  { name: 'Group A', value: 2_100_000 },
  { name: 'Group B', value: 1_500_000 },
  { name: 'Group C', value: 900_000 },
  { name: 'Group D', value: 600_000 },
];
const ACCENT_GROUP = 0; // the group the text is about gets the accent once the pile splits

const DURATION = 0.9; // seconds per dot
const SPREAD = 0.55; // left-to-right stagger across the whole figure
const JITTER = 0.2; // per-dot noise so the front is not a ruler line

const counts = GROUPS.map((g) => Math.round(g.value / UNIT));
const N = counts.reduce((a, b) => a + b, 0);
const group = new Uint8Array(N);
counts.reduce((start, c, gi) => (group.fill(gi, start, start + c), start + c), 0);

// Per-dot state in flat typed arrays: from, to, delay. No objects, no DOM.
const fx = new Float32Array(N), fy = new Float32Array(N);
const tx = new Float32Array(N), ty = new Float32Array(N);
const delay = new Float32Array(N);
// Each dot gets a fixed random rank, so its place inside a pile is stable across resizes.
const rank = new Float32Array(N).map(() => Math.random());

const stage = document.getElementById('stage');
const canvas = document.getElementById('canvas');
const buttons = [...document.querySelectorAll('[data-layout]')];
const fmt = new Intl.NumberFormat('en-US');
const millions = (v) => `${(v / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 })} million`;

let ctx, W, H, size, cell, base, layouts, colors;
let current = 'pile', start = -1, poured = false, labelFrom = 0, dirty = true;
let wasLit = false; // was the accent group lit in the layout we are leaving

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutCubic = (p) => 1 - (1 - p) ** 3;
const now = () => performance.now() / 1000;
const progress = (i, t) => easeOutCubic(clamp01((t - start - delay[i]) / DURATION));

// A mound: the n grid cells nearest the bottom centre under a half ellipse with half-width a and
// height b. Cells come back ordered centre-out, which is how a pile fills.
function mound(n, cx, a, b) {
  const cols = Math.ceil(a / cell) + 2, rows = Math.ceil(b / cell) + 2;
  const cand = [];
  for (let r = 0; r < rows; r++) for (let c = -cols; c < cols; c++) {
    const x = (c + 0.5) * cell, y = (r + 0.5) * cell;
    cand.push([(x / a) ** 2 + (y / b) ** 2, cx + c * cell, base - (r + 1) * cell]);
  }
  return cand.sort((p, q) => p[0] - q[0]).slice(0, n).map(([, x, y]) => [x, y]);
}
// Half-ellipse sized to hold n cells: 1.6 times wider than tall, or taller when width runs out.
function moundSize(n, maxHalfW) {
  const area = n * cell * cell;
  const b = cell * Math.sqrt(n / (0.8 * Math.PI));
  return 1.6 * b <= maxHalfW ? [1.6 * b, b] : [maxHalfW, (2 * area) / (Math.PI * maxHalfW)];
}
// Largest cell for which n cells fit a mound of half-width <= halfW and height <= h.
const moundFit = (n, halfW, h) => 0.97 * Math.sqrt((Math.PI * Math.min(1.6 * h, halfW) * h) / (2 * n));

// The bar layout: one column per group, k dots wide, filled bottom up.
function barCols(slotW) {
  let best = { cell: 0, k: 1 };
  for (let k = 4; k <= 80; k++) {
    const c = Math.min((slotW * 0.62) / k, (H - 92) / Math.ceil(counts[0] / k));
    if (c > best.cell) best = { cell: c, k };
  }
  return best;
}

// Compute every layout once per size. A layout is just a target position per dot.
function computeLayouts() {
  ({ ctx, width: W, height: H } = fitCanvas(canvas));
  base = H - 44;
  const avail = base - 40;
  const slotW = W / GROUPS.length;
  const bars = barCols(slotW);
  // One cell size for all layouts, set by whichever layout is tightest. The unit never resizes.
  cell = 0.94 * Math.min(moundFit(N, W * 0.46, avail), moundFit(counts[0], slotW * 0.44, avail), bars.cell);
  cell = Math.max(1.5, Math.floor(cell * 4) / 4);
  size = Math.max(1, cell * (cell > 3 ? 0.74 : 0.8));
  const k = Math.max(4, Math.floor((slotW * 0.62) / cell));

  const byGroup = GROUPS.map((_, gi) => [...Array(N).keys()].filter((i) => group[i] === gi).sort((i, j) => rank[i] - rank[j]));
  const all = [...Array(N).keys()].sort((i, j) => rank[i] - rank[j]);
  const pos = { pile: new Float32Array(2 * N), groups: new Float32Array(2 * N), bars: new Float32Array(2 * N) };
  const put = (arr, i, x, y) => { arr[2 * i] = x; arr[2 * i + 1] = y; };

  const pile = mound(N, W / 2, ...moundSize(N, W * 0.46));
  pile.forEach(([x, y], j) => put(pos.pile, all[j], x, y));
  const labels = { pile: [], groups: [], bars: [] };
  const top = Math.min(...pile.map(([, y]) => y));
  labels.pile.push({ x: W / 2, y: top - 28, text: `${fmt.format(N)} dots`, sub: `${millions(N * UNIT)} people` });

  byGroup.forEach((ids, gi) => {
    const cx = slotW * (gi + 0.5);
    mound(ids.length, cx, ...moundSize(ids.length, slotW * 0.44)).forEach(([x, y], j) => put(pos.groups, ids[j], x, y));
    ids.forEach((id, j) => put(pos.bars, id, cx - (k * cell) / 2 + (j % k) * cell, base - (Math.floor(j / k) + 1) * cell));
    const label = { x: cx, gi, text: GROUPS[gi].name, sub: `${fmt.format(ids.length)} dots` };
    labels.groups.push({ ...label, y: base + 20 });
    labels.bars.push({ ...label, y: base + 20 });
    labels.bars.push({ x: cx, gi, y: base - Math.ceil(ids.length / k) * cell - 10, text: millions(GROUPS[gi].value), small: true });
  });
  layouts = { pos, labels };
}

// Retarget every dot from where it is right now. This is what makes interruption smooth.
function go(name, { pour = false } = {}) {
  const t = now();
  const p = layouts.pos[name];
  const instant = reducedMotion();
  for (let i = 0; i < N; i++) {
    if (pour) { fx[i] = p[2 * i]; fy[i] = -cell - Math.random() * H * 0.4; }
    else if (start >= 0) { const q = progress(i, t); fx[i] += (tx[i] - fx[i]) * q; fy[i] += (ty[i] - fy[i]) * q; }
    tx[i] = p[2 * i];
    ty[i] = p[2 * i + 1];
    // Stagger by destination: a pour fills from the ground up, a regroup sweeps left to right.
    delay[i] = instant ? -DURATION : pour
      ? 0.8 * ((base - ty[i]) / H) + JITTER * Math.random()
      : SPREAD * (tx[i] / W) + JITTER * Math.random();
  }
  current = name;
  start = t;
  labelFrom = t + (instant ? -1 : 0.6 * (SPREAD + JITTER) + 0.55 * DURATION);
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === name)));
}

function readColors() {
  colors = Object.fromEntries(['--ink', '--muted', '--rule', '--mark-ink', '--mark-accent', '--sans'].map((k) => [k, token(k)]));
}

function draw(t) {
  ctx.clearRect(0, 0, W, H);
  // Ground line: every layout sits on the same baseline.
  ctx.fillStyle = colors['--rule'];
  ctx.fillRect(0, Math.round(base) + 0.5 * cell, W, 1);

  // Two batched paths: neutral dots and accent dots. A dot switches colour halfway through its own move.
  const split = current !== 'pile';
  const neutral = new Path2D(), accent = new Path2D();
  for (let i = 0; i < N; i++) {
    const p = start < 0 ? 0 : progress(i, t);
    const x = fx[i] + (tx[i] - fx[i]) * p, y = fy[i] + (ty[i] - fy[i]) * p;
    const lit = group[i] === ACCENT_GROUP && (split ? wasLit || p > 0.5 : wasLit && p < 0.5);
    (lit ? accent : neutral).rect(x, y, size, size);
  }
  ctx.fillStyle = colors['--mark-ink'];
  ctx.fill(neutral);
  ctx.fillStyle = colors['--mark-accent'];
  ctx.fill(accent);

  // Labels for the current layout fade in once most dots have landed.
  ctx.globalAlpha = clamp01((t - labelFrom) / 0.3);
  ctx.textAlign = 'center';
  for (const l of layouts.labels[current]) {
    ctx.fillStyle = l.gi === ACCENT_GROUP ? colors['--mark-accent'] : colors['--ink'];
    ctx.font = `${l.small ? 400 : 600} ${l.small ? 12 : 13}px ${colors['--sans']}`;
    if (l.small) ctx.fillStyle = colors['--muted'];
    ctx.fillText(l.text, l.x, l.y);
    if (l.sub) {
      ctx.fillStyle = colors['--muted'];
      ctx.font = `12px ${colors['--sans']}`;
      ctx.fillText(l.sub, l.x, l.y + 16);
    }
  }
  ctx.globalAlpha = 1;
}

buttons.forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.layout === current) return;
  wasLit = current !== 'pile';
  go(b.dataset.layout);
}));

readColors();
computeLayouts();
// Hold everything above the stage until it is first seen, then pour the pile in.
for (let i = 0; i < N; i++) { fx[i] = tx[i] = layouts.pos.pile[2 * i]; fy[i] = ty[i] = -10; }
new IntersectionObserver(([e]) => {
  if (e.isIntersecting && !poured) { poured = true; go('pile', { pour: true }); }
}).observe(stage);

// Draw while anything is moving or fading; sit idle otherwise.
loop(() => {
  const t = now();
  if (!dirty && t > Math.max(start + SPREAD + JITTER + 0.8 + DURATION, labelFrom + 0.3)) return;
  dirty = false;
  draw(t);
}, stage);

new ResizeObserver(() => {
  computeLayouts();
  if (!poured) return;
  // On resize, land everything in place at once; animating a resize only adds noise.
  const p = layouts.pos[current];
  for (let i = 0; i < N; i++) { fx[i] = tx[i] = p[2 * i]; fy[i] = ty[i] = p[2 * i + 1]; }
  labelFrom = -1;
  dirty = true;
}).observe(stage);

const repaint = () => { readColors(); dirty = true; };
onThemeChange(repaint);
new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
