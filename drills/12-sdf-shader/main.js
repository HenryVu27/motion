import { loop, token, reducedMotion, onThemeChange } from '../../shared/page.js';

const stage = document.getElementById('stage');
const canvas = stage.querySelector('canvas');
const $ = (id) => document.getElementById(id);

// ---------- Shaders ----------
// One triangle bigger than the screen, positioned from gl_VertexID: no vertex buffer at all.
const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); // (0,0) (2,0) (0,2)
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;      // drawing buffer size in device pixels
uniform float uTime;    // seconds
uniform vec2 uMouse;    // the movable circle, in the same units as p
uniform float uK;       // smooth-union radius
uniform float uIso;     // 1.0 shows iso-lines
uniform vec3 uBg, uFill, uLine, uAccent;
out vec4 outColor;

// Exact signed distances (Inigo Quilez, 2D distance functions).
float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
// Polynomial smooth minimum: blends two fields within distance k of each other.
float smin(float a, float b, float k) {
  k = max(k, 1e-4);
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float scene(vec2 p) {
  vec2 c = vec2(-0.25, 0.0);
  float m = 0.5 + 0.5 * sin(uTime * 0.9);               // 0 = rounded box, 1 = circle
  float a = mix(sdBox(p - c, vec2(0.44, 0.3)) - 0.05, sdCircle(p - c, 0.42), m);
  float b = sdCircle(p - uMouse, 0.24);
  return smin(a, b, uK);
}

void main() {
  // Centered, y up, one unit = half the stage height, so shapes keep their size on any screen.
  vec2 p = (2.0 * gl_FragCoord.xy - uRes) / uRes.y;
  float d = scene(p);
  float px = fwidth(d);                                   // how much d changes across one pixel

  vec3 col = d < 0.0 ? uFill : uBg;

  if (uIso > 0.5) {
    float f = d * 12.0;                                    // a contour every 1/12 unit
    float lineDist = abs(fract(f + 0.5) - 0.5) / fwidth(f); // distance to nearest contour, in pixels
    float a = clamp(1.0 - lineDist, 0.0, 1.0) * (0.25 + 0.6 * exp(-2.5 * abs(d)));
    col = mix(col, uLine, a);
  }
  // The zero contour, the shape's edge: 2 px wide at any resolution.
  float edge = clamp(1.5 - abs(d) / px, 0.0, 1.0);
  col = mix(col, uAccent, edge);
  outColor = vec4(col, 1.0);
}`;

// ---------- WebGL2 setup ----------
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
if (!gl) {
  stage.insertAdjacentHTML('beforeend', '<p class="fallback">This figure needs WebGL2, which this browser could not start.</p>');
  throw new Error('WebGL2 unavailable');
}

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

let program, vao, u = {};
function init() {
  program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  vao = gl.createVertexArray(); // empty, but WebGL2 wants one bound to draw
  for (const name of ['uRes', 'uTime', 'uMouse', 'uK', 'uIso', 'uBg', 'uFill', 'uLine', 'uAccent']) u[name] = gl.getUniformLocation(program, name);
  readColors();
  resize();
}

// ---------- Tokens become uniforms ----------
// Token hex goes in as 0..1 floats; WebGL writes them to the screen unchanged, so colors match the page.
const rgb = (name) => {
  const n = parseInt(token(name).slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
let colors;
function readColors() {
  colors = { uBg: rgb('--bg'), uFill: rgb('--mark'), uLine: rgb('--mark-ink'), uAccent: rgb('--mark-accent') };
}

// ---------- State ----------
const state = { time: reducedMotion() ? 0 : 1.3, // the still frame sits halfway between box and circle
  k: Number($('k').value), iso: false, playing: true,
  mouse: [0.6, 0.1], goal: [0.6, 0.1], pointer: false };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { width, height } = stage.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function draw() {
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.uniform2f(u.uRes, canvas.width, canvas.height);
  gl.uniform1f(u.uTime, state.time);
  gl.uniform2f(u.uMouse, ...state.mouse);
  gl.uniform1f(u.uK, state.k);
  gl.uniform1f(u.uIso, state.iso ? 1 : 0);
  for (const key of ['uBg', 'uFill', 'uLine', 'uAccent']) gl.uniform3fv(u[key], colors[key]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// Convert a pointer position into the shader's units: centered, y up, height = 2.
function toScene(e) {
  const r = canvas.getBoundingClientRect();
  return [(2 * (e.clientX - r.left) - r.width) / r.height, -(2 * (e.clientY - r.top) - r.height) / r.height];
}

function step(dt) {
  if (state.playing) state.time += dt;
  if (!state.pointer) {
    // No pointer: the circle drifts on a slow orbit so the union keeps forming and breaking.
    const t = state.time * 0.6;
    state.goal = [-0.25 + 0.85 * Math.cos(t), 0.55 * Math.sin(t * 1.3)];
  }
  // Frame-rate independent smoothing toward the goal, a critically damped feel without a spring.
  const a = 1 - Math.exp(-dt * 10);
  state.mouse = state.mouse.map((v, i) => v + (state.goal[i] - v) * a);
  draw();
}

// Reduced motion: no clock, but the figure still answers the pointer and the controls.
const still = reducedMotion();
const redrawIfStill = () => { if (still) draw(); };

canvas.addEventListener('pointermove', (e) => {
  state.pointer = true;
  state.goal = toScene(e);
  if (still) { state.mouse = state.goal; draw(); }
});
canvas.addEventListener('pointerleave', () => (state.pointer = false));

$('iso').addEventListener('click', (e) => {
  state.iso = !state.iso;
  e.currentTarget.setAttribute('aria-pressed', String(state.iso));
  redrawIfStill();
});
$('pause').addEventListener('click', (e) => {
  state.playing = !state.playing;
  e.currentTarget.setAttribute('aria-pressed', String(!state.playing));
});
$('k').addEventListener('input', () => {
  state.k = Number($('k').value);
  $('k-out').value = state.k.toFixed(2);
  $('k-note').textContent = state.k > 0 ? `smooth union, k = ${state.k.toFixed(2)}` : 'hard union, min(a, b)';
  redrawIfStill();
});

new ResizeObserver(() => { resize(); draw(); }).observe(stage);
onThemeChange(() => { readColors(); draw(); });

// A lost context (GPU reset, too many tabs) is recoverable: rebuild everything on restore.
canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
canvas.addEventListener('webglcontextrestored', () => { init(); draw(); });

init();
draw();
if (still) $('pause').hidden = true;
else loop(step, stage);
