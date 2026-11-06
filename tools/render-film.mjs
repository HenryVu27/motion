// Renders a film headless: stills at chosen times, a contact sheet of the whole film, or the MP4.
// Usage: node tools/render-film.mjs films/ship-of-theseus --stills 1,7,14,20,27,33
//        node tools/render-film.mjs films/ship-of-theseus --sheet        (one still per second)
//        node tools/render-film.mjs films/ship-of-theseus --mp4          (writes films/<slug>/out/<slug>.mp4)
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const target = process.argv[2]?.replace(/\/$/, '');
if (!target) throw new Error('usage: node tools/render-film.mjs films/<slug> [--stills t,t] [--sheet] [--mp4]');
const has = (f) => process.argv.includes(f);
const arg = (f) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : null; };
const slug = target.split('/').pop();
const out = resolve(root, target, 'out');
mkdirSync(out, { recursive: true });

const server = await createServer({ root, logLevel: 'error', server: { port: 5499, strictPort: false } });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1300 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(server.resolvedUrls.local[0] + target + '/?still', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.renderStill && document.fonts.status === 'loaded');
const duration = await page.evaluate(() => window.film.duration);

const save = async (T, name) => {
  const url = await page.evaluate((T) => window.renderStill(T), T);
  writeFileSync(resolve(out, name), Buffer.from(url.split(',')[1], 'base64'));
};

if (arg('--stills')) {
  for (const T of arg('--stills').split(',').map(Number)) await save(T, `still-${String(T).padStart(5, '0')}.png`);
  console.log('stills in', out);
}

if (has('--sheet')) {
  // A contact sheet: one small frame per second, drawn into a grid in the page.
  const url = await page.evaluate(async (duration) => {
    const n = Math.floor(duration), cols = 6, cell = 240, rows = Math.ceil(n / cols);
    const sheet = Object.assign(document.createElement('canvas'), { width: cols * cell, height: rows * (cell + 24) });
    const g = sheet.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, sheet.width, sheet.height);
    g.font = '14px system-ui'; g.fillStyle = '#333';
    for (let i = 0; i < n; i++) {
      const img = new Image();
      img.src = window.renderStill(i + 0.5);
      await img.decode();
      const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + 24);
      g.drawImage(img, x + 2, y + 2, cell - 4, cell - 4);
      g.fillText(`${i + 0.5}s`, x + 6, y + cell + 16);
    }
    return sheet.toDataURL('image/png');
  }, duration);
  writeFileSync(resolve(out, 'sheet.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log('contact sheet', resolve(out, 'sheet.png'));
}

if (has('--mp4')) {
  const file = resolve(out, `${slug}.mp4`);
  rmSync(file, { force: true });
  const t0 = Date.now();
  // The buffer comes back in slices: one huge string through the DevTools protocol is fragile.
  const size = await page.evaluate(async () => {
    window.__mp4 = new Uint8Array(await window.exportFilm());
    return window.__mp4.byteLength;
  });
  const parts = [];
  for (let at = 0; at < size; at += 4e6) {
    const b64 = await page.evaluate(([at]) => {
      const s = window.__mp4.subarray(at, at + 4e6);
      let bin = '';
      for (let i = 0; i < s.length; i += 0x8000) bin += String.fromCharCode(...s.subarray(i, i + 0x8000));
      return btoa(bin);
    }, [at]);
    parts.push(Buffer.from(b64, 'base64'));
  }
  writeFileSync(file, Buffer.concat(parts));
  console.log(`mp4 ${(size / 1e6).toFixed(1)} MB, ${duration}s, rendered in ${((Date.now() - t0) / 1000).toFixed(0)}s: ${file}`);
}

if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
await browser.close();
await server.close();
process.exit(errors.length ? 1 : 0);
