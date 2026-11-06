// Same dewdrop, same motion as drill 14; only the drawing changes. Left: flat (every edge one
// even, closed line; marks clipped to silhouettes). Right: marks and edges that describe form.
// Light comes from the upper left throughout, and every choice below answers to it.
import {
  paper, inkLayer, inkLine, halftone, pathOf, circlePts, clamp, lerp, INK,
  flowStrokes, formOutline, lightBeams, construction,
} from '../../film/kit.js';
import {
  SIZE, FPS_DRAW, CYCLE, STEM, TIP, POOL_Y, PRINCIPLES,
  draw as drawFlat, dropAt, leafAt, splashAt, dropPath, leafShape,
} from '../14-timing-spacing/scene.js';
import { loop } from '../../shared/page.js';

const LIGHT = [-0.6, -0.8];   // points toward the light: upper left
const FORM = {
  contour: 'Cross-contour strokes',
  edges: 'Lost and found edges',
  lens: 'Drop as a lens',
  shadow: 'Contact shadow',
  beams: 'Light beams',
  guides: 'Construction lines',
};
const MOTION = Object.fromEntries(Object.keys(PRINCIPLES).map((k) => [k, true]));
const LEAF_DARK = '#2f4a22', LEAF = '#7da35a', LEAF_LIGHT = '#d9e3a0';

// ---------- Leaf ----------

function leafForm(ctx, angle, form) {
  const { leaf, rib } = leafShape();
  ctx.save();
  ctx.translate(...STEM); ctx.rotate(-angle); ctx.translate(-STEM[0], -STEM[1]);
  inkLayer(ctx, (g) => { g.fillStyle = LEAF; pathOf(g, leaf); g.fill(); }, { grain: 0.45, seed: 7 });

  // Which side of the midrib a point is on, and how far along the leaf.
  const [sx, sy] = rib[0], [tx, ty] = rib[rib.length - 1];
  const axis = Math.atan2(ty - sy, tx - sx);
  const side = (x, y) => Math.sign((tx - sx) * (y - sy) - (ty - sy) * (x - sx));   // +1 below the rib
  if (form.contour) {
    // Strokes run out from the midrib toward the tip, like veins: the leaf's own grain.
    const dir = (x, y) => axis + side(x, y) * 0.55;
    flowStrokes(ctx, leaf, { dir, tone: (x, y) => (side(x, y) > 0 ? 0.62 : 0.22), spacing: 6, length: 34, color: LEAF_DARK, width: 0.8, seed: 31, alpha: 0.6 });
    flowStrokes(ctx, leaf, { dir, tone: (x, y) => (side(x, y) < 0 ? 0.35 : 0.05), spacing: 8, length: 26, color: LEAF_LIGHT, width: 1.1, seed: 32, alpha: 0.7 });
  }
  inkLine(ctx, rib, { width: 1.8, seed: 22, color: LEAF_DARK });
  if (form.edges) formOutline(ctx, leaf, { light: LIGHT, width: 2.2, color: LEAF_DARK, seed: 23, lost: 0.45 });
  else inkLine(ctx, [...leaf, leaf[0]], { width: 1.5, seed: 23, taper: false });
  ctx.restore();
}

// ---------- Pool ----------

function poolForm(ctx, splash, form) {
  const cx = 500, cy = POOL_Y + 70, rx = 460, ry = 90;
  const pool = circlePts(cx, cy, 1, 72).map(([x, y]) => [cx + (x - cx) * rx, cy + (y - cy) * ry]);
  inkLayer(ctx, (g) => halftone(g, pool, { tone: (x, y) => clamp(0.12 + (y - POOL_Y) / 230), cell: 9, angle: 0.4, color: INK.federal }), { grain: 0.35, seed: 4 });
  if (form.contour) {
    // Strokes follow the ellipse, so the surface reads as a flat plane in perspective.
    // Tangent to the ellipse through (x, y): perpendicular to the gradient (x / rx^2, y / ry^2).
    const dir = (x, y) => Math.atan2((x - cx) / (rx * rx), -(y - cy) / (ry * ry));
    flowStrokes(ctx, pool, { dir, tone: (x, y) => 0.25 + 0.35 * clamp((y - cy) / ry + 0.5), spacing: 9, length: 46, color: INK.federal, width: 0.8, seed: 41, alpha: 0.55 });
  }
  if (form.edges) formOutline(ctx, pool, { light: LIGHT, width: 2, color: INK.federal, seed: 30, lost: 0.35, alpha: 0.8 });
  else inkLine(ctx, [...pool, pool[0]], { width: 1.2, color: INK.federal, seed: 30, alpha: 0.7, taper: false });
  if (!splash) return;
  for (const ring of splash.rings) {
    const pts = circlePts(TIP[0], POOL_Y, 1, 64).map(([x, y]) => [TIP[0] + (x - TIP[0]) * ring.r, POOL_Y + (y - POOL_Y) * ring.r * 0.22]);
    inkLine(ctx, pts, { width: 1.4, color: INK.federal, seed: 31, alpha: 0.85 * ring.alpha, taper: false });
  }
  for (const d of splash.drops) if (d.alive) dropForm(ctx, { x: d.x, y: d.y, r: d.r, stretch: 1.2, neck: 0, visible: true }, { ...form, lens: false }, 0);
}

// The shadow a falling drop throws on the water: wide and faint when high, small and dark as it lands.
function contactShadow(ctx, d) {
  if (!d.visible || d.y > POOL_Y) return;
  const h = clamp((POOL_Y - d.y) / 460);
  const rx = d.r * (0.7 + 1.8 * h), ry = rx * 0.22;
  inkLayer(ctx, (g) => { g.fillStyle = INK.federal; g.globalAlpha = 0.55 * (1 - h) + 0.08; g.beginPath(); g.ellipse(d.x + 14 * h, POOL_Y + 6, rx, ry, 0, 0, Math.PI * 2); g.fill(); }, { grain: 0.4, seed: 8 });
}

// ---------- Drop ----------

function dropForm(ctx, d, form, leafAngle) {
  if (!d.visible) return;
  const P = dropPath(d), w = d.r / Math.sqrt(d.stretch), h = d.r * d.stretch;
  inkLayer(ctx, (g) => { g.fillStyle = '#d6e7f1'; pathOf(g, P); g.fill(); }, { grain: 0.3, seed: 5 });

  if (form.lens) {
    // A drop is a lens: it shows the world, upside down. Below it is water, above it the leaf,
    // so the pool appears at its top and the leaf at its bottom.
    ctx.save();
    pathOf(ctx, P); ctx.clip();
    ctx.translate(d.x, d.y);
    ctx.scale(-w / 330, -h / 330);
    ctx.translate(-TIP[0], -(TIP[1] + POOL_Y) / 2);
    inkLayer(ctx, (g) => { g.fillStyle = INK.federal; g.globalAlpha = 0.75; g.beginPath(); g.ellipse(500, POOL_Y + 70, 460, 140, 0, 0, Math.PI * 2); g.fill(); }, { grain: 0.25, seed: 3 });
    ctx.translate(...STEM); ctx.rotate(-leafAngle); ctx.translate(-STEM[0], -STEM[1]);
    inkLayer(ctx, (g) => { g.fillStyle = LEAF; g.globalAlpha = 0.9; pathOf(g, leafShape().leaf); g.fill(); }, { grain: 0.25, seed: 2 });
    ctx.restore();
    // Thick water at the rim darkens; light that passes through gathers on the far side.
    ctx.save();
    pathOf(ctx, P); ctx.clip();
    const rim = ctx.createRadialGradient(d.x - w * 0.2, d.y - h * 0.25, Math.min(w, h) * 0.4, d.x, d.y, Math.max(w, h) * 1.05);
    rim.addColorStop(0, 'rgba(31,78,140,0)');
    rim.addColorStop(1, 'rgba(31,78,140,0.55)');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rim;
    ctx.fillRect(d.x - w * 1.2, d.y - h * 1.6, w * 2.4, h * 3);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,240,190,0.75)';
    ctx.beginPath(); ctx.ellipse(d.x + w * 0.38, d.y + h * 0.5, w * 0.36, h * 0.16, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Highlights face the light: a soft one and a hard one.
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(d.x - w * 0.3, d.y - h * 0.28, w * 0.34, h * 0.24, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.ellipse(d.x - w * 0.38, d.y - h * 0.36, w * 0.12, h * 0.09, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (form.edges) formOutline(ctx, P, { light: LIGHT, width: 2.4 * clamp(d.r / 33, 0.4, 1.2), color: INK.ink, seed: 11, lost: 0.5 });
  else inkLine(ctx, [...P, P[0]], { width: 1.6, seed: 11, wobble: 0.5, taper: false });
}

// ---------- Frame ----------

function drawForm(canvas, T, form) {
  const ctx = canvas.getContext('2d');
  const k = canvas.width / 1000;
  const t = Math.floor((T % CYCLE) * FPS_DRAW) / FPS_DRAW;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(paper(canvas.width), 0, 0);
  ctx.setTransform(k, 0, 0, k, 0, 0);

  const angle = leafAt(t, MOTION), drop = dropAt(t, MOTION);
  if (form.guides) {
    // The drop's path, the water line, and the direction the light travels.
    construction(ctx, [TIP[0], TIP[1]], [TIP[0], POOL_Y], { extend: 80, seed: 71 });
    construction(ctx, [60, POOL_Y], [940, POOL_Y], { extend: 30, seed: 72 });
    if (drop.visible) construction(ctx, [drop.x + LIGHT[0] * 150, drop.y + LIGHT[1] * 150], [drop.x - LIGHT[0] * 150, drop.y - LIGHT[1] * 150], { extend: 0, seed: 73, alpha: 0.35 });
  }
  leafForm(ctx, angle, form);
  poolForm(ctx, splashAt(t), form);
  if (form.shadow) contactShadow(ctx, drop);
  dropForm(ctx, drop, form, angle);
  if (form.beams) lightBeams(ctx, { angle: -0.64, bands: [[-280, 220], [-20, 110], [230, 260]], color: 'rgba(255,236,190,0.28)' });
}

// ---------- Page ----------

const flat = document.getElementById('flat'), formed = document.getElementById('form');
for (const c of [flat, formed]) { c.width = SIZE; c.height = SIZE; }
const form = Object.fromEntries(Object.keys(FORM).map((k) => [k, true]));
let dirty = true;

const panel = document.getElementById('form-toggles');
for (const [key, label] of Object.entries(FORM)) {
  const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
  b.setAttribute('aria-pressed', 'true');
  b.addEventListener('click', () => { form[key] = !form[key]; b.setAttribute('aria-pressed', String(form[key])); dirty = true; });
  panel.append(b);
}
const speed = document.getElementById('speed');
speed.addEventListener('input', () => (document.getElementById('speed-out').value = `${speed.value}x`));

let clock = 0, last = -1;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
loop((dt) => {
  clock += still ? 0 : dt * Number(speed.value);
  const T = still ? 1.4 : clock;
  const drawing = Math.floor(T * FPS_DRAW);
  if (dirty || drawing !== last) {
    drawFlat(flat, T, MOTION, { onion: false, chart: false });
    drawForm(formed, T, form);
    last = drawing; dirty = false;
  }
}, formed);

window.renderPair = (T) => { drawFlat(flat, T, MOTION, { onion: false, chart: false }); drawForm(formed, T, form); };
