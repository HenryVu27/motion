// A dewdrop, drawn twice. Timing is how long things take; spacing is how far they move between
// drawings. Everything about the drop is a pure function of time (scene.js), so the onion skin
// and the spacing chart are just the same functions asked about earlier drawings.
import { SIZE, FPS_DRAW, PRINCIPLES, draw } from './scene.js';
import { loop } from '../../shared/page.js';

// ---------- Page ----------

const rigid = document.getElementById('rigid'), alive = document.getElementById('alive');
for (const c of [rigid, alive]) { c.width = SIZE; c.height = SIZE; }
const on = Object.fromEntries(Object.keys(PRINCIPLES).map((key) => [key, true]));
const tools = { onion: false, chart: true };
const NONE = Object.fromEntries(Object.keys(PRINCIPLES).map((key) => [key, false]));
let dirty = true;

function toggles(el, labels, state) {
  for (const [key, label] of Object.entries(labels)) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
    b.setAttribute('aria-pressed', String(state[key]));
    b.addEventListener('click', () => { state[key] = !state[key]; b.setAttribute('aria-pressed', String(state[key])); dirty = true; });
    el.append(b);
  }
}
toggles(document.getElementById('principles'), PRINCIPLES, on);
toggles(document.getElementById('tools'), { onion: 'Onion skin', chart: 'Spacing chart' }, tools);

const speed = document.getElementById('speed');
let clock = 0, last = -1;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
loop((dt) => {
  clock += still ? 0 : dt * Number(speed.value);
  const T = still ? 1.9 : clock;
  draw(rigid, T, NONE, tools, true);
  const drawing = Math.floor(T * FPS_DRAW);
  if (dirty || !on.twos || drawing !== last) { draw(alive, T, on, tools); last = drawing; dirty = false; }
}, alive);
speed.addEventListener('input', () => (document.getElementById('speed-out').value = `${speed.value}x`));

window.renderPair = (T) => { draw(rigid, T, NONE, tools, true); draw(alive, T, on, tools); };
window.setTools = (o) => Object.assign(tools, o);
