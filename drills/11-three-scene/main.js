import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, Fog, Vector2, Vector3, Object3D,
  HemisphereLight, DirectionalLight, PCFShadowMap,
  Mesh, InstancedMesh, MeshStandardMaterial, MeshBasicMaterial,
  BoxGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry, ExtrudeGeometry, Shape,
} from 'three';
import { gsap } from 'gsap';
import { loop, token, reducedMotion, onThemeChange } from '../../shared/page.js';

const stage = document.getElementById('stage');
const canvas = stage.querySelector('canvas');
const note = document.getElementById('station-note');

// ---------- Renderer: created once, resized many times ----------
let renderer;
try {
  renderer = new WebGLRenderer({ canvas, antialias: true });
} catch (err) {
  stage.insertAdjacentHTML('beforeend', '<p class="fallback">This figure needs WebGL, which this browser could not start.</p>');
  throw err; // still surface it in the console: a missing context is worth knowing about
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // 3x screens cost 2.25x the pixels for little gain
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap; // PCFSoftShadowMap was removed in r18x; PCF plus shadow.radius is the soft option
renderer.shadowMap.autoUpdate = false;  // the scene never moves, only the camera: render the shadow map once

const scene = new Scene();
const camera = new PerspectiveCamera(40, 16 / 10, 0.1, 100);
const target = new Vector3();
let dirty = true; // render on demand: only when something changed

// ---------- Colors come from tokens, re-read when the theme flips ----------
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
};
const paler = (a, b) => (luminance(token(a)) >= luminance(token(b)) ? token(a) : token(b));

const mats = {
  stone: new MeshStandardMaterial({ flatShading: true, roughness: 0.9 }),
  shade: new MeshStandardMaterial({ flatShading: true, roughness: 0.95 }),
  ground: new MeshStandardMaterial({ roughness: 1 }),
  marker: new MeshBasicMaterial(),
};
const hemi = new HemisphereLight();
const sun = new DirectionalLight();

function applyTheme() {
  const bg = token('--bg');
  scene.background = new Color(bg);
  scene.fog = new Fog(bg, 16, 42); // fog to the page color: the ground melts into the paper
  // Stone takes the pale end of the mark scale in either theme; light takes the brighter of paper and ink.
  mats.stone.color.set(paler('--mark', '--mark-ink'));
  mats.shade.color.set(token('--mark-strong'));
  mats.ground.color.set(token('--mark-strong'));
  mats.marker.color.set(token('--mark-accent'));
  const light = paler('--bg', '--ink');
  hemi.color.set(light);
  hemi.groundColor.set(token('--mark-strong'));
  sun.color.set(light);
  dirty = true;
}

// ---------- A small hexastyle temple from primitives ----------
const geos = [];
const geo = (g) => (geos.push(g), g);
const add = (g, m, x, y, z, { cast = true, receive = true } = {}) => {
  const mesh = new Mesh(geo(g), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  scene.add(mesh);
  return mesh;
};

function buildTemple() {
  const ground = add(new PlaneGeometry(120, 120), mats.ground, 0, 0, 0, { cast: false });
  ground.rotation.x = -Math.PI / 2;

  // Three steps (the crepidoma), each a little smaller.
  const STEP = 0.18;
  [[5.6, 8.8], [5.2, 8.4], [4.8, 8.0]].forEach(([w, d], i) => add(new BoxGeometry(w, STEP, d), mats.stone, 0, STEP * (i + 0.5), 0));
  const floor = STEP * 3;

  // 6 columns across the front and back, 9 down each side: 26 columns, one draw call.
  const H = 2.6;
  const spots = [];
  for (let i = 0; i < 6; i++) { const x = -2 + i * 0.8; spots.push([x, 3.4], [x, -3.4]); }
  for (let j = 1; j < 8; j++) { const z = -3.4 + j * 0.85; spots.push([-2, z], [2, z]); }
  const shaft = geo(new CylinderGeometry(0.19, 0.23, H, 12)); // 12 flat facets read as flutes
  const capital = geo(new BoxGeometry(0.56, 0.12, 0.56));
  const columns = new InstancedMesh(shaft, mats.stone, spots.length);
  const capitals = new InstancedMesh(capital, mats.stone, spots.length);
  const o = new Object3D();
  spots.forEach(([x, z], i) => {
    o.position.set(x, floor + H / 2, z); o.updateMatrix(); columns.setMatrixAt(i, o.matrix);
    o.position.set(x, floor + H + 0.06, z); o.updateMatrix(); capitals.setMatrixAt(i, o.matrix);
  });
  for (const m of [columns, capitals]) { m.castShadow = m.receiveShadow = true; scene.add(m); }

  const top = floor + H + 0.12;
  add(new BoxGeometry(4.9, 0.5, 8.1), mats.stone, 0, top + 0.25, 0); // entablature
  // Roof: a triangle extruded along the temple's length; its ends are the pediments.
  const tri = new Shape([new Vector2(-2.55, 0), new Vector2(2.55, 0), new Vector2(0, 0.85)]);
  add(new ExtrudeGeometry(tri, { depth: 8.2, bevelEnabled: false }), mats.stone, 0, top + 0.5, -4.1);

  add(new BoxGeometry(2.5, H, 5.0), mats.shade, 0, floor + H / 2, -0.3); // the cella, the inner room

  // Fallen drums in the grass: a ruin, ready for a history lesson.
  [[3.6, 5.6, 0.4], [4.4, 4.7, 1.3], [-3.9, 5.1, 2.2]].forEach(([x, z, ry]) => {
    const d = add(new CylinderGeometry(0.23, 0.23, 0.55, 12), mats.stone, x, 0.23, z);
    d.rotation.set(0, ry, Math.PI / 2);
  });
}

// The accent: a small dot at the point the camera is looking at.
const marker = new Mesh(geo(new SphereGeometry(0.1, 16, 12)), mats.marker);
// Drawn last and through everything, because the look-at point is usually inside the temple.
mats.marker.depthTest = false;
mats.marker.depthWrite = false;
marker.renderOrder = 10;

// ---------- Stations ----------
const STATIONS = [
  { name: 'Approach', pos: [7.5, 2.4, 12], look: [0, 1.7, 0] },
  { name: 'Colonnade', pos: [4.4, 1.0, 7.4], look: [1.4, 2.1, -1.2] },
  { name: 'Above', pos: [-6.5, 9.5, -7.5], look: [0, 0.8, 0] },
];
let current = 0;

function goTo(i) {
  const s = STATIONS[i];
  const up = s.pos[1] > camera.position.y;
  const duration = reducedMotion() ? 0 : 1.8;
  current = i;
  note.textContent = s.name;
  document.querySelectorAll('[data-station]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.station) === i)));
  // Height gets its own ease: it leads on the way up and lags on the way down, so the
  // straight line between stations bends into an arc that clears the roof.
  const common = { duration, overwrite: true, onUpdate: () => (dirty = true) };
  gsap.to(camera.position, { x: s.pos[0], z: s.pos[2], ease: 'power2.inOut', ...common });
  gsap.to(camera.position, { y: s.pos[1], ease: up ? 'power3.out' : 'power3.in', ...common, overwrite: false });
  gsap.to(target, { x: s.look[0], y: s.look[1], z: s.look[2], ease: 'power2.inOut', ...common });
  dirty = true;
}

// ---------- Size: follow the .stage box, never the window ----------
function resize() {
  const { width, height } = stage.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false); // false: leave canvas CSS alone, the stage owns layout
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  dirty = true;
}

function render() {
  camera.lookAt(target);
  marker.position.copy(target);
  renderer.render(scene, camera);
  dirty = false;
}

// Free GPU memory when this module is replaced (Vite hot reload) or a lesson tears the figure down.
export function dispose() {
  geos.forEach((g) => g.dispose());
  Object.values(mats).forEach((m) => m.dispose());
  sun.shadow.map?.dispose();
  renderer.dispose();
}
import.meta.hot?.dispose(dispose);

// ---------- Wire up ----------
buildTemple();
scene.add(marker, hemi, sun, sun.target);
hemi.intensity = 1.5;
sun.intensity = 2.4;
sun.position.set(-7, 11, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
sun.shadow.radius = 3;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
renderer.shadowMap.needsUpdate = true;
applyTheme();

const s0 = STATIONS[0];
camera.position.set(...s0.pos);
target.set(...s0.look);
note.textContent = s0.name;

document.querySelectorAll('[data-station]').forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.station))));
new ResizeObserver(resize).observe(stage);
resize();
onThemeChange(applyTheme);

// The loop stops when the figure scrolls away; inside it, draw only frames that changed.
loop(() => { if (dirty) render(); }, stage);
