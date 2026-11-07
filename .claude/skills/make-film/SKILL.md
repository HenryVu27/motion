---
name: make-film
description: Make a short code-drawn film in Motion Studio, in the style of Kevin T. Ngo: every frame drawn in JavaScript with paper, ink, halftone, risograph, hatching and watercolor textures, exported to MP4. Use when Henry asks for a film, a short, an animated video, or "draw it" for a history lesson, philosophical idea or project.
---

# Make a film

The reference is Kevin T. Ngo (research/kevin-ngo.md): under 30 seconds, square, one idea, told in five or six scene changes, each scene its own texture world, all of it drawn by code on paper. The worked example is `films/ship-of-theseus/`.

## 1. Script (before code)
- For any explainer, run the crew: the scriptwriter agent (`.claude/agents/scriptwriter.md`) drafts `script.md` and `sources.md` from primary texts; the script-critic agent reviews them; revise; Henry approves the script before animation starts.
- One sentence: the idea. One line: the turn (the moment it lands). For history or philosophy, the facts come from a checked `sources.md` (see the animate-lesson skill); a film states fewer facts, but each one must be checked.
- 5 to 7 scenes, 4 to 8 seconds each, 25 to 40 seconds in all. Write each as: what is drawn, what moves, which texture carries it, caption (if any).
- Captions are optional. Kevin's films have none; lessons usually need a few. Keep each under 12 words and on screen at least 2 seconds.

## 2. Art direction
- Paper first: every frame starts on `paper()`. Inks are flat colors from `INK`, printed through `inkLayer` (grain, multiply, optional misregistration offset).
- Tone is marks, not gradients: `hatch` for shadow, `stipple` for texture and decay, `halftone` for glow, sky and sea, `wash` for watercolor bodies.
- One subject, big and centered. Line weight scales with the subject's size; small things get lighter, sparser marks or they turn into cages.
- Multiply can only darken: put fresh paper under anything light that sits on something dark.
- Things in water need water drawn again in front of them.

## 3. Build
- `films/<slug>/film.js` exports `defineFilm({ title, size: 1080, fps: 30, scenes, captions })`. Each scene is `{ name, dur, draw(ctx, { t, p }) }`, drawing in a 1000 by 1000 space. No state between frames: everything comes from `t` and fixed seeds.
- Copy `index.html` and `meta.json` from the example. The page mounts the player (play, scrub, Export MP4).
- Kit lives in `film/kit.js`, motion in `film/motion.js`. Build motion from its blocks (spring, lag, overlap, bend, fall, beat, ride, rippleLayer); if a scene needs physics the library lacks, add a block there, not in the scene.

## 4. Review (look, do not assume)
- `node tools/render-film.mjs films/<slug> --sheet` writes a one-frame-per-second contact sheet. Read it. Then `--stills 6.5,14.5` for full-size frames of anything doubtful.
- Check: is the subject legible at thumbnail size, does each scene have one clear texture, do captions sit on a calm area, does anything float that should sit, does anything boil (unseeded randomness)?
- Fix and re-render until a stranger could follow the story from the sheet alone.

## 5. Ship
- `node tools/render-film.mjs films/<slug> --mp4` writes `films/<slug>/out/<slug>.mp4` (H.264 through WebCodecs and mediabunny; out/ is git-ignored). Verify with `mdls -name kMDItemDurationSeconds <file>`.
- `npm run check -- films/<slug>`, commit, push; GitHub Pages redeploys henryvu.io/motion/.
