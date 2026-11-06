# Motion Studio

A portfolio of web animation techniques, and history and philosophy lessons built from them.

```bash
npm install
npm run dev        # gallery at http://localhost:5173
npm run check      # every page in headless Chromium, desktop and phone; fails on errors or overflow
node tools/beats.mjs lessons/ship-of-theseus   # screenshot each beat of a scroll story
npm run build      # static site in dist/
```

- `drills/` one technique per page, each with what it teaches, the lines that matter, and who it was learned from.
- `lessons/` finished explainers. Each has `storyboard.md` (the click, the beats) and `sources.md` (every claim, with its passage).
- `research/` field map of libraries and creators, the curriculum, notes on Kevin Ngo.
- `.claude/skills/animate-lesson/` the workflow for making the next lesson. Ask Claude to "animate a lesson on X" from this folder.
