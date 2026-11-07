// Film engine: a film is a list of scenes, and every frame is a pure function of time. The same
// draw code feeds the in-page player, single-frame stills and the MP4 export, so what you scrub
// is exactly what gets rendered.
import { paper, caption, clamp, INK, surface } from './kit.js';

const UNITS = 1000;   // scenes draw in a 1000 x 1000 space, whatever the output size

// drawings: hold each drawing for 1/drawings s (12 at fps 24 is on twos); null draws every frame.
export function defineFilm({ title, size = 1080, fps = 30, drawings = null, paperSeed = 7, paperTone = INK.paper, scenes, captions = [], crossfade = 0.5 }) {
  let start = 0;
  const timed = scenes.map((s) => { const out = { ...s, start }; start += s.dur; return out; });
  return { title, size, fps, drawings, paperSeed, paperTone, scenes: timed, captions, crossfade, duration: start, frames: Math.round(start * fps) };
}

function drawScene(ctx, film, scene, T) {
  const t = T - scene.start;
  ctx.save();
  scene.draw(ctx, { t, p: clamp(t / scene.dur), T, dur: scene.dur, film });
  ctx.restore();
}

// Draw the frame at global time T (seconds) onto a canvas of film.size.
export function renderAt(canvas, film, T) {
  if (film.drawings) T = Math.floor(T * film.drawings + 1e-6) / film.drawings;
  const ctx = canvas.getContext('2d');
  const k = canvas.width / UNITS;
  const i = Math.max(0, film.scenes.findIndex((s) => T >= s.start && T < s.start + s.dur));
  const idx = T >= film.duration ? film.scenes.length - 1 : i;
  const scene = film.scenes[idx];
  const sheet = (s) => paper(canvas.width, film.paperSeed, s.paperTone ?? film.paperTone);   // a scene may choose its own stock
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sheet(scene), 0, 0);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  drawScene(ctx, film, scene, T);

  // Crossfade: the previous scene's last moment dissolves into this one, through the paper.
  const into = T - scene.start;
  if (idx > 0 && film.crossfade > 0 && into < film.crossfade && scene.cut !== true) {
    const prev = film.scenes[idx - 1];
    const buf = surface('xfade', canvas.width, canvas.height), g = buf.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(sheet(prev), 0, 0);
    g.setTransform(k, 0, 0, k, 0, 0);
    drawScene(g, film, prev, prev.start + prev.dur - 0.001);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1 - into / film.crossfade;
    ctx.drawImage(buf, 0, 0);
    ctx.restore();
  }

  // Captions sit on a soft paper band at the bottom so they read over any scene.
  for (const c of film.captions) {
    if (T < c.at || T > c.until) continue;
    const a = Math.min(clamp((T - c.at) / 0.35), clamp((c.until - T) / 0.35));
    ctx.save();
    ctx.globalAlpha = a * 0.82;
    const grad = ctx.createLinearGradient(0, 820, 0, 1000);
    grad.addColorStop(0, 'rgba(242,234,217,0)');
    grad.addColorStop(0.45, 'rgba(242,234,217,0.9)');
    grad.addColorStop(1, 'rgba(242,234,217,0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 820, UNITS, 180);
    ctx.restore();
    caption(ctx, c.text, 500, 940, { size: c.size ?? 36, alpha: a, maxWidth: 820 });
  }
}

// ---------- Player ----------

export function mountPlayer(film, root = document.getElementById('film')) {
  const canvas = Object.assign(document.createElement('canvas'), { width: film.size, height: film.size });
  canvas.className = 'film-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', film.title);
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `
    <button type="button" data-act="play">Play</button>
    <label class="scrub">Time <input type="range" min="0" max="${film.frames - 1}" value="0" step="1"></label>
    <output>0.0 s</output>
    <button type="button" data-act="export">Export MP4</button>
    <span class="status" aria-live="polite"></span>`;
  root.append(canvas, controls);

  const range = controls.querySelector('input'), out = controls.querySelector('output'), status = controls.querySelector('.status');
  const playBtn = controls.querySelector('[data-act=play]');
  let frame = 0, playing = false, last = 0, raf = 0;
  const show = (f) => {
    frame = Math.max(0, Math.min(film.frames - 1, f));
    renderAt(canvas, film, frame / film.fps);
    range.value = frame;
    out.value = `${(frame / film.fps).toFixed(1)} s`;
  };
  const tick = (now) => {
    if (!playing) return;
    if (now - last >= 1000 / film.fps - 1) { last = now; show(frame + 1 >= film.frames ? 0 : frame + 1); }
    raf = requestAnimationFrame(tick);
  };
  const setPlaying = (on) => {
    playing = on;
    playBtn.textContent = on ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(on));
    cancelAnimationFrame(raf);
    if (on) raf = requestAnimationFrame(tick);
  };
  playBtn.addEventListener('click', () => setPlaying(!playing));
  range.addEventListener('input', () => { setPlaying(false); show(Number(range.value)); });
  controls.querySelector('[data-act=export]').addEventListener('click', async () => {
    setPlaying(false);
    const buf = await exportMP4(film, (p) => (status.textContent = `Encoding ${Math.round(p * 100)}%`));
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([buf], { type: 'video/mp4' })), download: `${film.title.toLowerCase().replace(/\W+/g, '-')}.mp4` });
    a.click();
    status.textContent = `${(buf.byteLength / 1e6).toFixed(1)} MB`;
  });

  // Hooks for tools/render-film.mjs: stills and headless export.
  window.film = film;
  window.renderStill = (T) => { renderAt(canvas, film, T); return canvas.toDataURL('image/png'); };
  window.exportFilm = (onProgress) => exportMP4(film, onProgress);

  document.fonts.load('italic 36px "EB Garamond"').finally(() => {
    show(0);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !new URLSearchParams(location.search).has('still')) setPlaying(true);
  });
  return { show, canvas };
}

// ---------- Export: WebCodecs H.264 through mediabunny, entirely in the browser ----------

export async function exportMP4(film, onProgress = () => {}) {
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_VERY_HIGH } = await import('mediabunny');
  await document.fonts.load('italic 36px "EB Garamond"');
  const canvas = Object.assign(document.createElement('canvas'), { width: film.size, height: film.size });
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: 'avc', bitrate: QUALITY_VERY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: film.fps });
  await output.start();
  for (let f = 0; f < film.frames; f++) {
    renderAt(canvas, film, f / film.fps);
    await source.add(f / film.fps, 1 / film.fps);
    if (f % 15 === 0) onProgress(f / film.frames);
  }
  await output.finalize();
  onProgress(1);
  return output.target.buffer;
}
