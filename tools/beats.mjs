// Screenshots a scroll story at every step, so each beat can be looked at without scrolling by hand.
// Usage: node tools/beats.mjs lessons/ship-of-theseus [--at 0.5] [--choice repaired]
// Writes tools/screens/<slug>/beat-NN--{desktop,phone}.png. Steps are elements with class .step.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const target = process.argv[2]?.replace(/\/$/, '');
if (!target) throw new Error('usage: node tools/beats.mjs lessons/<slug>');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const at = Number(arg('--at', '0.6'));   // how far into each step to stop, 0 to 1
const choice = arg('--choice', null);

const server = await createServer({ root, logLevel: 'error', server: { port: 5299, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0] + target + '/';
const out = resolve(root, 'tools/screens', target.split('/').pop());
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  const count = await page.locator('.step').count();
  for (let i = 0; i < count; i++) {
    // Put the reading anchor `at` of the way through step i, matching how the page reads scroll.
    await page.evaluate(([i, at]) => {
      const step = document.querySelectorAll('.step')[i];
      const anchor = innerHeight * (innerWidth >= 1100 ? 0.55 : 0.75);
      const top = step.getBoundingClientRect().top + scrollY;
      scrollTo(0, top + step.offsetHeight * at - anchor);
    }, [i, at]);
    if (choice && i === count - 3) await page.locator(`[data-choice="${choice}"]`).click().catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: resolve(out, `beat-${String(i + 1).padStart(2, '0')}--${label}.png`) });
  }
  console.log(`${label}: ${count} beats${errors.length ? ', errors: ' + errors.join('; ') : ''}`);
  await page.close();
}
await browser.close();
await server.close();
console.log('screens in', out);
