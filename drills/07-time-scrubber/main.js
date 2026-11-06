import { select, scaleLinear, scaleBand, axisBottom, easeCubicInOut, easeLinear, interpolateRound } from 'd3';
import { reducedMotion, token, onThemeChange } from '../../shared/page.js';
import { philosophers, toAstro, label } from './data.js';

const people = philosophers
  .map((d) => ({ ...d, a0: toAstro(d.born), a1: toAstro(d.died) }))
  .sort((p, q) => p.a0 - q.a0);
const DOMAIN = [toAstro(-640), toAstro(1960)];
const M = { top: 34, right: 12, bottom: 28, left: 12 };

const stage = select('#stage');
const scrub = document.getElementById('scrub');
const playBtn = document.getElementById('play');
const yearNote = document.getElementById('year-note');
const aliveEl = select('#alive');
scrub.min = DOMAIN[0];
scrub.max = DOMAIN[1];

let year = toAstro(-350);
let alive = new Set();
let colors, x, y, svg, bars, names, line, yearText, width, height;

const dur = (ms) => (reducedMotion() ? 0 : ms);
const isAlive = (d, a) => d.a0 <= a && a <= d.a1;
const fade = (d) => (d.bornCirca && d.diedCirca ? 'both' : d.bornCirca ? 'start' : d.diedCirca ? 'end' : null);

function readColors() {
  colors = { off: token('--mark-strong'), on: token('--mark-accent') };
}

// Masks that fade a bar's circa ends. Bounding-box units, so one mask fits every bar.
function defs(svg) {
  const d = svg.append('defs');
  for (const [id, stops] of [
    ['start', [[0, 0.15], [0.28, 1], [1, 1]]],
    ['end', [[0, 1], [0.72, 1], [1, 0.15]]],
    ['both', [[0, 0.15], [0.25, 1], [0.75, 1], [1, 0.15]]],
  ]) {
    const g = d.append('linearGradient').attr('id', `g-${id}`);
    stops.forEach(([o, a]) => g.append('stop').attr('offset', o).attr('stop-color', '#fff').attr('stop-opacity', a));
    d.append('mask').attr('id', `fade-${id}`).attr('maskContentUnits', 'objectBoundingBox')
      .append('rect').attr('width', 1).attr('height', 1).attr('fill', `url(#g-${id})`);
  }
}

function render() {
  const box = stage.node().getBoundingClientRect();
  width = box.width;
  height = box.height;
  stage.selectAll('svg').remove();
  svg = stage.append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img')
    .attr('aria-label', 'Lifespans of 27 philosophers as horizontal bars on a time axis from about 640 BCE to 1960 CE, with a movable year line.');
  defs(svg);

  x = scaleLinear(DOMAIN, [M.left, width - M.right]);
  y = scaleBand(people.map((d) => d.name), [M.top, height - M.bottom - 8]).paddingInner(0.38);

  // Axis ticks are chosen in historical years, then placed in astronomical ones.
  const step = width < 560 ? 500 : 250;
  const ticks = [-500, ...Array.from({ length: Math.floor(1900 / step) + 1 }, (_, i) => (i ? i * step : 1))];
  if (step === 250) ticks.splice(1, 0, -250);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - M.bottom})`)
    .call(axisBottom(x).tickValues(ticks.map(toAstro)).tickFormat(label).tickSizeOuter(0).tickSize(4));

  const row = svg.append('g').selectAll('g').data(people).join('g');
  bars = row.append('rect')
    .attr('x', (d) => x(d.a0)).attr('y', (d) => y(d.name)).attr('height', y.bandwidth())
    .attr('width', (d) => Math.max(2, x(d.a1) - x(d.a0)))
    .attr('mask', (d) => (fade(d) ? `url(#fade-${fade(d)})` : null))
    .attr('fill', colors.off)
    .attr('fill-opacity', (d) => (d.traditional ? 0.22 : 1))
    .attr('stroke', (d) => (d.traditional ? colors.off : null))
    .attr('stroke-dasharray', (d) => (d.traditional ? '3 2' : null));
  row.append('title').text((d) => `${d.name}, ${d.dates}${d.note ? '. ' + d.note : ''}`);

  // Names sit after the bar, or before it when they would run off the right edge.
  names = row.append('text').attr('class', 'name')
    .attr('y', (d) => y(d.name) + y.bandwidth() / 2).attr('dy', '0.35em')
    .text((d) => d.name);
  names.each(function (d) {
    const w = this.getComputedTextLength();
    const after = x(d.a1) + 6 + w < width - M.right;
    select(this).attr('x', after ? x(d.a1) + 6 : x(d.a0) - 6).attr('text-anchor', after ? 'start' : 'end');
  });

  const g = svg.append('g').attr('pointer-events', 'none');
  line = g.append('line').attr('class', 'yearline').attr('y1', M.top - 6).attr('y2', height - M.bottom);
  yearText = g.append('text').attr('class', 'yearlabel').attr('y', M.top - 12).attr('text-anchor', 'middle');

  // The whole chart is the drag surface. The range input stays the source of truth.
  svg.on('pointerdown', (e) => {
    stopPlay();
    svg.node().setPointerCapture(e.pointerId);
    fromPointer(e);
    svg.on('pointermove', fromPointer);
  });
  svg.on('pointerup pointercancel', () => svg.on('pointermove', null));

  alive = new Set();
  setYear(year);
}

function fromPointer(e) {
  setYear(x.invert(e.offsetX));
}

// One function moves everything. Called per drag event, per input event, and per tween frame.
function setYear(a) {
  year = Math.max(DOMAIN[0], Math.min(DOMAIN[1], Math.round(a)));
  const px = x(year);
  line.attr('x1', px).attr('x2', px);
  yearText.attr('x', Math.max(34, Math.min(width - 34, px))).text(label(year));
  scrub.value = year;
  yearNote.textContent = label(year);

  const now = new Set(people.filter((d) => isAlive(d, year)).map((d) => d.name));
  const changed = now.size !== alive.size || [...now].some((n) => !alive.has(n));
  alive = now;
  if (!changed) return updateHeading();

  // Only changed rows get a transition; naming it means a newer one interrupts it cleanly.
  bars.filter(function (d) { return (this.__on ?? false) !== alive.has(d.name); })
    .each(function (d) { this.__on = alive.has(d.name); })
    .transition('hl').duration(dur(180)).ease(easeCubicInOut)
    .attr('fill', (d) => (alive.has(d.name) ? colors.on : colors.off))
    .attr('stroke', (d) => (d.traditional ? (alive.has(d.name) ? colors.on : colors.off) : null));
  names.classed('on', (d) => alive.has(d.name));
  updateList();
}

function updateHeading() {
  aliveEl.select('strong').text(`Alive in ${label(year)}:`);
}

function updateList() {
  if (aliveEl.select('strong').empty()) aliveEl.append('strong');
  updateHeading();
  const list = people.filter((d) => alive.has(d.name));
  aliveEl.selectAll('span.who').data(list, (d) => d.name).join(
    (enter) => enter.append('span').attr('class', 'who')
      .call((s) => s.append('span').text((d) => d.name))
      .call((s) => s.append('small').text((d) => `(${d.dates})`))
      .style('opacity', 0).style('transform', 'translateY(4px)')
      .call((s) => s.transition().duration(dur(240)).style('opacity', 1).style('transform', 'translateY(0px)')),
    (update) => update,
    (exit) => exit.interrupt().remove(),
  ).order();
  aliveEl.selectAll('span.none').data(list.length ? [] : [1]).join('span').attr('class', 'none')
    .text('nobody on this list');
}

// Programmatic moves tween the year itself, so every intermediate year is drawn.
function tweenTo(to, ms, ease) {
  svg.interrupt('jump');
  if (!dur(ms)) return setYear(to);
  return svg.transition('jump').duration(ms).ease(ease)
    .tween('year', () => { const i = interpolateRound(year, to); return (t) => setYear(i(t)); });
}

function stopPlay() {
  svg.interrupt('jump');
  playBtn.setAttribute('aria-pressed', 'false');
  playBtn.textContent = 'Play';
}

playBtn.addEventListener('click', () => {
  if (playBtn.getAttribute('aria-pressed') === 'true') return stopPlay();
  if (year >= DOMAIN[1] - 5) setYear(DOMAIN[0]);
  playBtn.setAttribute('aria-pressed', 'true');
  playBtn.textContent = 'Pause';
  const t = tweenTo(DOMAIN[1], ((DOMAIN[1] - year) / (DOMAIN[1] - DOMAIN[0])) * 18000, easeLinear);
  if (t) t.on('end', stopPlay);
  else stopPlay();
});
document.querySelectorAll('[data-year]').forEach((b) => b.addEventListener('click', () => {
  stopPlay();
  tweenTo(toAstro(Number(b.dataset.year)), 700, easeCubicInOut);
}));
scrub.addEventListener('input', () => { stopPlay(); setYear(Number(scrub.value)); });

readColors();
render();

// Bars grow out of their birth year once, the first time the chart is drawn.
if (!reducedMotion()) {
  bars.attr('width', 0).transition('grow').delay((_, i) => i * 22).duration(600).ease(easeCubicInOut)
    .attr('width', (d) => Math.max(2, x(d.a1) - x(d.a0)));
}

let lastW = width;
new ResizeObserver(() => {
  if (Math.abs(stage.node().getBoundingClientRect().width - lastW) < 1) return;
  lastW = stage.node().getBoundingClientRect().width;
  render();
}).observe(stage.node());

const repaint = () => {
  readColors();
  bars.interrupt('hl').attr('fill', (d) => (alive.has(d.name) ? colors.on : colors.off))
    .attr('stroke', (d) => (d.traditional ? (alive.has(d.name) ? colors.on : colors.off) : null));
};
onThemeChange(repaint);
new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
