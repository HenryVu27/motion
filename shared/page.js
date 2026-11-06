// Small helpers every drill and lesson shares. Keep this file dependency-free.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Read a CSS token so canvas drawing follows the light/dark theme.
export const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Size a canvas to its box at device pixel ratio; returns a 2D context in CSS pixels.
export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

// requestAnimationFrame loop with delta time in seconds, paused while the tab is hidden or the
// element is off screen. Returns a stop function.
export function loop(step, el) {
  let raf = 0, last = 0, visible = true;
  const tick = (t) => {
    const dt = last ? Math.min((t - last) / 1000, 1 / 20) : 0;
    last = t;
    step(dt, t / 1000);
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  if (el) new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(el);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
  return stop;
}

// Re-run a draw function when the theme flips, so canvas colors follow tokens. Covers both the
// system setting and a page-level <html data-theme> switch.
export function onThemeChange(fn) {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
  new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
