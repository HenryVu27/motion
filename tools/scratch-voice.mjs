// Scratch narration for an animatic, with macOS's built-in speech (free, offline).
// Reads the scene table in films/<slug>/script.md (columns: # | time | narration | ...), speaks
// each line, measures it, and pads with silence so every line starts at its scene's time.
// Usage: node tools/scratch-voice.mjs films/hegel-recognition [--voice Daniel] [--rate 150]
// Writes films/<slug>/out/scratch-voice.m4a and scratch-voice.json (per-scene start, spoken length).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const target = process.argv[2]?.replace(/\/$/, '');
if (!target) throw new Error('usage: node tools/scratch-voice.mjs films/<slug> [--voice Daniel] [--rate 150]');
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d; };
const voice = arg('--voice', 'Daniel'), rate = arg('--rate', '150');
const out = resolve(root, target, 'out'), tmp = resolve(out, 'voice-tmp');
mkdirSync(tmp, { recursive: true });

const secs = (s) => { const [m, x] = s.trim().split(':').map(Number); return m * 60 + x; };
const rows = readFileSync(resolve(root, target, 'script.md'), 'utf8').split('\n')
  .filter((l) => /^\|\s*\d+\s*\|/.test(l))
  .map((l) => l.split('|').map((c) => c.trim()))
  .map((c) => ({ scene: Number(c[1]), start: secs(c[2].split(' to ')[0]), end: secs(c[2].split(' to ')[1]), text: c[3] }));

const duration = (file) => Number(/estimated duration: ([\d.]+)/.exec(execFileSync('afinfo', [file], { encoding: 'utf8' }))[1]);

// Measure each line alone, then build one script for `say` with silences that land each line on time.
let clock = 0, parts = [];
const report = rows.map((r, i) => {
  const f = resolve(tmp, `s${r.scene}.aiff`);
  execFileSync('say', ['-v', voice, '-r', rate, '-o', f, r.text]);
  const spoken = duration(f);
  const startAt = Math.max(r.start + (i === 0 ? 1 : 0.3), clock);   // a breath after each cut
  parts.push(`[[slnc ${Math.round((startAt - clock) * 1000)}]]`, r.text);
  clock = startAt + spoken;
  return { scene: r.scene, start: +startAt.toFixed(2), spoken: +spoken.toFixed(2), sceneEnd: r.end, overrun: +(Math.max(0, clock - r.end)).toFixed(2) };
});
const aiff = resolve(tmp, 'all.aiff'), m4a = resolve(out, 'scratch-voice.m4a');
execFileSync('say', ['-v', voice, '-r', rate, '-o', aiff, parts.join(' ')]);
execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', aiff, m4a]);
writeFileSync(resolve(out, 'scratch-voice.json'), JSON.stringify(report, null, 1));
rmSync(tmp, { recursive: true, force: true });
console.log(report.map((r) => `scene ${String(r.scene).padStart(2)} starts ${r.start.toFixed(1)}s, speaks ${r.spoken.toFixed(1)}s${r.overrun ? `, OVERRUNS by ${r.overrun}s` : ''}`).join('\n'));
console.log(`\n${m4a} (${duration(m4a).toFixed(1)} s)`);
