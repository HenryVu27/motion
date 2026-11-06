// Opens every page in headless Chromium at desktop and phone width, lets it animate, and reports
// console errors, page errors, horizontal overflow and empty stages. Screenshots go to tools/screens/.
// Usage: npm run check            (starts its own dev server)
//        npm run check -- drills/03-scrollytelling   (one page)
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const only = process.argv[2];
const pages = ['', ...['films', 'lessons', 'drills'].flatMap((s) =>
  readdirSync(resolve(root, s)).filter((d) => existsSync(resolve(root, s, d, 'index.html'))).map((d) => `${s}/${d}/`))]
  .filter((p) => !only || p.startsWith(only.replace(/\/?$/, '/')) || (only === 'index' && p === ''));

const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
const shots = resolve(root, 'tools/screens');
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
let failures = 0;

for (const path of pages) {
  for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base + path, { waitUntil: 'networkidle' });
    // Exercise the page: click the first button, scroll through, wait for animation frames.
    await page.locator('.controls button').first().click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const emptyStages = await page.evaluate(() => [...document.querySelectorAll('.stage')].filter((s) => s.getBoundingClientRect().height < 40).length);
    const name = (path || 'index').replace(/\/$/, '').replaceAll('/', '__');
    await page.screenshot({ path: resolve(shots, `${name}--${label}.png`), fullPage: false });
    const problems = [...errors, ...(overflow > 1 ? [`horizontal overflow ${overflow}px`] : []), ...(emptyStages ? [`${emptyStages} collapsed .stage`] : [])];
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${label.padEnd(7)} /${path}${problems.length ? '\n       ' + problems.join('\n       ') : ''}`);
    failures += problems.length ? 1 : 0;
    await page.close();
  }
}

await browser.close();
await server.close();
console.log(failures ? `\n${failures} page views with problems` : '\nall pages clean');
process.exit(failures ? 1 : 0);
