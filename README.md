# Motion Studio

Code-drawn short films, a portfolio of web animation techniques, and history and philosophy lessons built from them. Live at https://henryvu.io/motion/.

```bash
npm install
npm run dev        # gallery at http://localhost:5173
npm run check      # every page in headless Chromium, desktop and phone; fails on errors or overflow
node tools/beats.mjs lessons/ship-of-theseus   # screenshot each beat of a scroll story
node tools/render-film.mjs films/ship-of-theseus --sheet   # contact sheet; --mp4 for the video
npm run build      # static site in dist/
```

- `films/` short films drawn frame by frame in JavaScript (paper, ink, halftone, risograph, watercolor), with in-browser MP4 export.
- `drills/` one technique per page, each with what it teaches, the lines that matter, and who it was learned from.
- `lessons/` finished explainers. Each has `storyboard.md` (the click, the beats) and `sources.md` (every claim, with its passage).
- `research/` field map of libraries and creators, the curriculum, notes on Kevin Ngo.
- `.claude/skills/make-film/` and `.claude/skills/animate-lesson/` the workflows for the next film or lesson. Ask Claude to "animate a lesson on X" from this folder.
