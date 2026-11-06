import { defineConfig } from 'vite';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = import.meta.dirname;

// Every <section>/<slug>/index.html under drills/ and lessons/ becomes its own page; adding a folder is enough.
const pages = { main: resolve(root, 'index.html') };
for (const section of ['drills', 'lessons']) {
  for (const slug of readdirSync(resolve(root, section))) {
    const file = resolve(root, section, slug, 'index.html');
    if (existsSync(file)) pages[`${section}/${slug}`] = file;
  }
}

export default defineConfig({
  base: './',
  build: { rollupOptions: { input: pages }, chunkSizeWarningLimit: 1200 },
});
