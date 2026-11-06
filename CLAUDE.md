# Motion Studio

A portfolio of web animation techniques (drills), and animated history and philosophy lessons built from them. Goal behind it: Henry can take any project or idea and turn it into an animated explanation that makes one idea click.

## Layout
- `drills/NN-slug/` one technique per page: `index.html`, `main.js`, `meta.json`. Copy `drills/01-easing-and-springs` as the template.
- `lessons/slug/` finished explainers that combine drills. Same three files, plus `sources.md` (every factual claim with a primary-source citation).
- `shared/studio.css` tokens and base styles; `shared/page.js` helpers (`fitCanvas`, `loop`, `token`, `reducedMotion`). Do not fork these per page; add a token or helper here if two pages need it.
- `research/` field map, creator notes, technique catalog.
- `.claude/skills/animate-lesson/` the workflow for making a new lesson. Use it.
- Pages are discovered automatically (vite.config.js and shared/gallery.js read the folders). Adding a folder is enough.

## Commands
- `npm run dev` dev server. `npm run build` production build into `dist/`.
- `npm run check` opens every page in headless Chromium at 1440px and 390px, clicks the first control, scrolls, and fails on console errors, page errors, horizontal overflow or collapsed `.stage`. Screenshots land in `tools/screens/`. `npm run check -- drills/05-foo` checks one page. Look at the screenshots; a clean check with a blank figure is still a failure.

## Page rules (editorial, same tokens as henryvu.blog)
- One 660px serif column; figures break out to 880px with `<figure class="wide">`.
- Two voices: EB Garamond for prose, system sans (`var(--sans)`) inside figures and controls. No third font.
- No boxes or cards. `.stage` gets an ink rule on top, a hairline below. Controls are hairline pill buttons.
- Marks are pale neutrals (`--mark`, `--mark-strong`, `--mark-ink`); `--mark-accent` goes only to the thing the text is about. Every color is a token; canvas reads them with `token('--mark-accent')`. Must work in dark mode.
- Every drill page has: runhead, h1, one-line dek, the figure with a caption that says what to look at, then "What this teaches" (3 to 5 bullets of real craft rules), "The lines that matter" (the few lines of code), "Learned from" (links to the creator).
- No emojis, no em dashes in prose.

## Motion rules
- Animate `transform` and `opacity`; avoid layout properties in loops. Canvas for more than a few hundred moving things.
- Respect `prefers-reduced-motion`: jump to end states or show a static frame.
- Pause rAF loops off screen (`loop(step, el)` does this).
- UI responses 150 to 300 ms ease-out; narrative motion can be slower. Springs for anything interruptible.

## Libraries (installed)
gsap 3.15 (all plugins free: ScrollTrigger, DrawSVG, SplitText, MorphSVG, Flip), motion 14.9 (vanilla `animate`, `scroll`, `inView`, `stagger`), d3 7.9, three 0.187, simplex-noise 4. Node 20.11, Vite 6. Ask before adding a dependency; prefer the platform (Web Animations API, CSS scroll-driven animations, View Transitions).

## Facts in lessons
History and philosophy claims need a primary or scholarly source in `sources.md`, checked, with the passage located. Mark anything reconstructed or uncertain on the page itself. A persuasive animation of a wrong claim is the main failure mode of this genre.
