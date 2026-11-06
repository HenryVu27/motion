# Kevin T. Ngo (@kevin_t_ngo), the reference for this studio

Correction (2026-11-05): the first pass of research studied the wrong Kevin Ngo (Kevin Ngo / @kevopuff, A-Frame co-creator; his gogh painter is still the subject of drill 10). The artist Henry meant is **Kevin T. Ngo**, kevintngo.com, a "creative technologist" who posts films, games and art "I make with Claude" on X.

## What he makes
- Short films, all 2026, each under 30 seconds: what do you love?, dew, answer, honey bearer, orizuru, still here, nib, watermelon. Generative art: drawing desk, borrowed light, still, kind, fable, self-portraits. Games: isle, mecha redline, ballpoint gambit.
- dew (27 s, square): "A fruit fly's whole life in twenty-seven seconds." His post: "Claude Opus 5 drew every frame of this animation using JavaScript." (x.com/kevin_t_ngo/status/2099858454043349342, 2026-09-15, 1.2M views.)
- answer (28 s, square): "A dot on a sheet of paper calls out. What comes back is the world."

## The look, from frames of dew and answer
- Everything sits on paper: off-white or kraft stock with grain. The site itself is kraft paper, tape and film strips.
- Print processes imitated in code:
  - risograph: flat spot inks, halftone dots, layers slightly misregistered (a yellow ring offset under a red dot in answer)
  - halftone gradients (the Saturn in answer)
  - cyanotype blue (the medallions in answer)
- Hand media imitated in code: ink lines with slight wobble, hatching on wings and orange peel, stippling on the egg, colored-pencil strokes.
- Procedural structure as drawing: Voronoi cobblestones, a hex grid for the compound eye, radial cell patterns.
- Composition: one subject, centered, big; a story told in five or six scene changes; each scene a different texture world.
- Story shape: a whole life or a whole idea in under 30 seconds, from tiny to cosmic and back (dot, call, world).

## What this means for Motion Studio
The target is code-drawn illustrated short films, not interactive diagrams. Pipeline in this repo: `film/kit` (texture and drawing primitives, seeded and deterministic), `film/engine` (scenes on a timeline, every frame a pure function of time), WebCodecs plus mediabunny to encode MP4 in the browser, `tools/render-film.mjs` to render headless.
