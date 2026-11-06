# Web animation field map (2026-11-05)

Source: background survey agent, checked against gh api, npm view, caniuse and direct fetches. Items marked [unverified] were not checked.

## Libraries by layer
- DOM/SVG timelines: GSAP 3.15.1 (free incl. all plugins, proprietary license, no Webflow-competing builders), Motion 14.9.1 (MIT, React + vanilla), anime.js 4.5.0 (MIT), Web Animations API (native).
- Native CSS: scroll-driven animations (Chrome 115+, Safari 26+, Firefox 159+, ~89%), View Transitions same-doc (~93%; cross-doc partial in Firefox). Lenis 1.3.27 for smooth scroll.
- Canvas/WebGL/WebGPU: three.js r187 (WebGPU/TSL moving fast; production readiness disputed), r3f 9.8.2 + drei 10.7.9, PixiJS 8.22.0, p5.js 2.3.4, two.js 0.8.24, Rive runtime 2.49.4 (editor proprietary), dotlottie-web 0.82.1 (lottie-web stalling). ogl, regl quiet.
- Video/explainer engines: Remotion 4.0.541 (source-available; free for <=3 employees), Revideo 0.11.0 (MIT, Motion Canvas fork), ManimCE 0.22.1. Motion Canvas dormant, Theatre.js stalled.
- Scrollytelling: Scrollama 3.2.0 (stable), d3 7.9.2 + d3-transition, Svelte 5.57.3 transitions/springs, Observable Framework (slowing). Idyll abandoned.
- Physics/procedural: matter.js 0.20.0, Rapier 0.21.0 (wasm), simplex-noise 4.0.3.

## Creators: what to learn
- Bartosz Ciechanowski: figures inside the prose, one slider each (ciechanow.ski/mechanical-watch)
- Nicky Case: playable argument, then the lesson (ncase.me/trust, /polygons, /crowds, /loopy)
- Amit Patel / Red Blob Games: direct manipulation, simple to complex (redblobgames.com)
- Josh Comeau: springs, CSS, teaching voice (joshwcomeau.com)
- Bret Victor: theory (worrydream.com/LadderOfAbstraction)
- 3Blue1Brown: narration-synced derivation (Manim)
- The Pudding: scroll steps over data (pudding.cool)
- Maxime Heckel: shaders, raymarching, r3f
- Emil Kowalski, Rauno Freiberg, Shu Ding, Paco Coursey: UI motion craft and restraint
- Jhey Tompkins, Bramus Van Damme: CSS scroll-driven and view transitions
- Sam Rose (samwho.dev): animated systems simulations
- Tyler Hobbs, Inigo Quilez, Matt DesLauriers, Daniel Shiffman: generative, SDF, canvas-sketch, Nature of Code
- Also: Cassie Evans (SVG+GSAP), Amelia Wattenberger, Neal Agarwal, Shirley Wu / Nadieh Bremer, Victor Powell, Mike Bostock, Matuschak & Nielsen (quantum.country), Bruno Simon. Directory: explorabl.es/all
- Kevin T. Ngo (@kevin_t_ngo, kevintngo.com): THE reference. Sub-30-second films drawn frame by frame in JavaScript with Claude, in paper, risograph, halftone, cyanotype, hatching and stipple textures. See research/kevin-ngo.md. (Not Kevin Ngo @kevopuff, the A-Frame co-creator, whose gogh painter is drill 10.)

## Courses
animations.dev (Emil, reopens 2026-11-10), Whimsical Animations (Comeau, $299+), Nature of Code (free), Book of Shaders (free), Three.js Journey, GSAP docs, Frontend Masters canvas/WebGL (DesLauriers), Coding Train, Pudding scrollytelling how-to, scroll-driven-animations.style.

## History / philosophy exemplars and techniques
The Fallen of WWII (unit charts + narration), Slate slave-trade map (one dot per ship over time), Histography, Chronas (time slider over borders), ORBIS (run the Roman travel model), Snow Fall, Pudding music history, Evolution of Trust, Parable of the Polygons, Moral Machine.
Recurring techniques: sticky graphic + scrolling steps; time scrubber as primary control; unit/dot animation to make numbers felt; maps that change over time; playable model then explicit lesson; "what would you do?" hook; narration-synced animation.

## Risks
GSAP and Remotion licenses; avoid dormant foundations (Motion Canvas, Theatre.js, Idyll, lottie-web); AI-generated explainers that look persuasive but are wrong (need source checks).
