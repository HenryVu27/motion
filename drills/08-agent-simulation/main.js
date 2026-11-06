import { fitCanvas, loop, token, reducedMotion, onThemeChange } from '../../shared/page.js';
import { createModel } from './model.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('canvas');
const runBtn = document.getElementById('run');
const threshold = document.getElementById('threshold');
const speed = document.getElementById('speed');
const status = document.getElementById('status');
const readout = document.getElementById('readout');
const ruleBtns = [...document.querySelectorAll('[data-rule]')];

const SIZE = 40;
let model, history, running = false, acc = 0, rule = 'random', settled = false, stuck = 0, seed = 20140101;
let ctx, W, H, L, colors;

const movesPerSecond = () => Math.round(10 * Math.pow(200, speed.value / 100)); // 10 to 2000, log
const demand = () => threshold.value / 100;
const pct = (v) => `${Math.round(v * 100)}%`;

function readColors() {
  colors = Object.fromEntries(['--ink', '--muted', '--rule', '--mark', '--mark-strong', '--mark-ink', '--mark-accent', '--bg']
    .map((k) => [k, token(k)]));
}

function reset(newSeed = true) {
  if (newSeed) seed = (seed * 1103515245 + 12345) >>> 0;
  model = createModel({ cols: SIZE, rows: SIZE, vacancy: 0.25, seed });
  history = [model.segregation()];
  acc = 0;
  settled = false;
  setRunning(false);
  draw();
}

function setRunning(on) {
  running = on;
  runBtn.setAttribute('aria-pressed', String(on));
  runBtn.textContent = on ? 'Pause' : 'Run';
}

// Grid on the left and chart on the right when wide; grid on top and chart below when narrow.
function layout() {
  ({ ctx, width: W, height: H } = fitCanvas(canvas));
  const wide = W > H * 1.2;
  const pad = 14;
  const side = wide ? Math.min(H - 2 * pad, W * 0.6) : Math.min(W, H * 0.62) - 2 * pad;
  const cell = Math.floor((side / SIZE) * 4) / 4;
  const gridPx = cell * SIZE;
  const grid = wide ? { x: pad, y: (H - gridPx) / 2, cell } : { x: (W - gridPx) / 2, y: pad, cell };
  const chart = wide
    ? { x: grid.x + gridPx + 40, y: pad + 84, w: W - (grid.x + gridPx + 40) - 50, h: H - pad - 84 - 34 }
    : { x: 4, y: grid.y + gridPx + 84, w: W - 42, h: H - (grid.y + gridPx + 84) - 30 };
  L = { grid, chart, top: wide ? pad + 4 : grid.y + gridPx + 18 };
  draw();
}

function draw() {
  if (!ctx || !model) return;
  const { grid: g, chart: c } = L;
  ctx.clearRect(0, 0, W, H);
  const t = demand();

  // Agents, batched by fill so each frame is a handful of fills, not 1,200.
  const s = g.cell, r = s * 0.36;
  const unhappy = new Set(model.unhappy(t));
  for (const [kind, fill, accent] of [[1, colors['--mark-ink'], false], [2, colors['--mark-strong'], false], [1, colors['--mark-accent'], true], [2, colors['--mark-accent'], true]]) {
    ctx.beginPath();
    for (let i = 0; i < model.grid.length; i++) {
      if (model.grid[i] !== kind || unhappy.has(i) !== accent) continue;
      const cx = g.x + (i % SIZE) * s + s / 2, cy = g.y + Math.floor(i / SIZE) * s + s / 2;
      if (kind === 1) ctx.rect(cx - r, cy - r, 2 * r, 2 * r);
      else { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2); }
    }
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // Readout: the measured share, big, with the demand beside it.
  const now = history[history.length - 1];
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colors['--muted'];
  ctx.font = `13px ${token('--sans')}`;
  ctx.fillText('Average share of like neighbours', c.x, L.top + 12);
  ctx.fillStyle = colors['--ink'];
  ctx.font = `600 34px ${token('--sans')}`;
  ctx.fillText(pct(now), c.x, L.top + 50);
  const big = ctx.measureText(pct(now)).width;
  ctx.font = `13px ${token('--sans')}`;
  ctx.fillStyle = colors['--muted'];
  ctx.fillText(`each asks for ${pct(t)}`, c.x + big + 12, L.top + 50);

  // Sparkline: y from 0 to 100%, x over the moves made so far.
  const y = (v) => c.y + c.h - v * c.h;
  ctx.strokeStyle = colors['--rule'];
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const v of [0, 0.5, 1]) { ctx.moveTo(c.x, Math.round(y(v)) + 0.5); ctx.lineTo(c.x + c.w, Math.round(y(v)) + 0.5); }
  ctx.stroke();
  ctx.fillStyle = colors['--muted'];
  ctx.font = `11px ${token('--sans')}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of [0, 0.5, 1]) ctx.fillText(pct(v), c.x + c.w + 34, y(v));
  ctx.textAlign = 'left';
  ctx.fillText('asked for', c.x, y(t) + (t > 0.9 ? 10 : -9));
  ctx.textBaseline = 'alphabetic';

  // The demand, dashed: what each agent wants.
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = colors['--mark-strong'];
  ctx.beginPath();
  ctx.moveTo(c.x, y(t));
  ctx.lineTo(c.x + c.w, y(t));
  ctx.stroke();
  ctx.setLineDash([]);

  // The outcome, solid: what they get together.
  const n = Math.max(history.length - 1, 1);
  const x = (k) => c.x + (k / Math.max(n, 60)) * c.w;
  ctx.strokeStyle = colors['--mark-ink'];
  ctx.lineWidth = 1.75;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  history.forEach((v, k) => (k ? ctx.lineTo(x(k), y(v)) : ctx.moveTo(x(k), y(v))));
  ctx.stroke();
  ctx.fillStyle = colors['--mark-accent'];
  ctx.beginPath();
  ctx.arc(x(history.length - 1), y(now), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors['--muted'];
  ctx.font = `11px ${token('--sans')}`;
  ctx.fillText('time', c.x, c.y + c.h + 18);

  status.textContent = !settled ? `${unhappy.size} unhappy` : stuck ? `stuck: ${stuck} unhappy, no cell suits them` : 'settled: nobody wants to move';
  readout.innerHTML = `Started at <b>${pct(history[0])}</b> like neighbours, now <b>${pct(now)}</b>. Each agent asks for at least <b>${pct(t)}</b>.`;
}

// Advance by a budget of moves. History gets one sample per frame that moved anything.
function advance(budget) {
  const { moves, unhappy } = model.step(demand(), rule, budget);
  if (unhappy === 0 || moves === 0) { settled = true; stuck = unhappy; setRunning(false); }
  history.push(model.segregation());
  if (history.length > 600) history = history.filter((_, k) => k % 2 === 0 || k === history.length - 1);
  return moves;
}

loop((dt) => {
  if (!running) return;
  acc += dt * movesPerSecond();
  const budget = Math.floor(acc);
  if (budget < 1) return;
  advance(budget);
  acc -= budget;
  draw();
}, stage);

runBtn.addEventListener('click', () => {
  if (settled) reset();
  if (reducedMotion()) {
    // No motion: compute to equilibrium and show the end state.
    for (let p = 0; p < 300 && !settled; p++) advance(Infinity);
    draw();
    return;
  }
  setRunning(!running);
});
document.getElementById('reset').addEventListener('click', () => reset());
threshold.addEventListener('input', () => {
  document.getElementById('threshold-out').value = pct(demand());
  settled = false;
  draw();
});
const showSpeed = () => (document.getElementById('speed-out').value = movesPerSecond());
speed.addEventListener('input', showSpeed);
ruleBtns.forEach((b) => b.addEventListener('click', () => {
  rule = b.dataset.rule;
  ruleBtns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  settled = false;
  draw();
}));

readColors();
showSpeed();
reset(false);
layout();
new ResizeObserver(layout).observe(stage);
const repaint = () => { readColors(); draw(); };
onThemeChange(repaint);
new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
