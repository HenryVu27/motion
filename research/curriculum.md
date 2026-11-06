# Curriculum: from easing curves to animated lessons

Goal: be able to take any history lesson, philosophical idea or project of yours and build an animated explainer where one idea clicks. Each stage ends with something built, not something read. The drills in this repo are the worked answers; redo each one from a blank file before moving on.

## Stage 1. Timing (a week)
Why one move feels quick and another sluggish.
- Drill 01 easing and springs. Rebuild it from scratch with only the Web Animations API, then add Motion's spring.
- Read Emil Kowalski, "Great animations" (emilkowal.ski/ui/great-animations); Josh Comeau, spring physics intro.
- Exercise: animate a button press, a menu open and a toast, each under 300 ms. Record which curve you picked and why.

## Stage 2. Sequencing (a week)
Many moves in a choreographed order; a timeline is an object you can scrub.
- Drill 02 GSAP timeline. Drill 05 view transitions.
- Read the GSAP Timeline docs; Cassie Evans on SVG animation.
- Exercise: an SVG diagram of one of your projects (e.g. the PianoLens pipeline) that builds itself in 6 to 8 steps, scrubbable.

## Stage 3. Scroll as the play button (two weeks)
The reader's scroll drives the story; every state must be reachable backwards.
- Drill 03 CSS scroll-driven animations. Drill 04 scrollytelling. Then read lessons/ship-of-theseus/main.js: one `render(s)` for the whole story.
- Read The Pudding, "How to implement scrollytelling"; Bramus, scroll-driven-animations.style.
- Exercise: a five-beat scroll story about one decision in your own career, with one scrubbed beat.

## Stage 4. Many marks (two weeks)
Canvas, thousands of moving things, data that means something.
- Drill 06 unit chart. Drill 07 time scrubber (d3). Drill 08 agent simulation.
- Study Neil Halloran, "The Fallen of World War II"; Nicky Case, "The Evolution of Trust"; Amit Patel, Red Blob Games.
- Read The Nature of Code chapters 1 to 5 (vectors, forces, oscillation, particles, autonomous agents).
- Exercise: one playable model of a philosophical claim (e.g. the prisoner's dilemma) that ends in a stated lesson.

## Stage 5. Atmosphere (ongoing)
Generative and 3D work for mood and place, used sparingly.
- Drill 09 flow field. Drill 10 procedural painting (after Kevin Ngo's gogh). Drill 11 three.js scene. Drill 12 SDF shader.
- Read Tyler Hobbs on flow fields; Inigo Quilez on distance functions; The Book of Shaders chapters 1 to 7. Bruno Simon's Three.js Journey if 3D becomes central.

## Stage 6. Lessons (repeat forever)
Use `.claude/skills/animate-lesson`: find the click, check the sources, pick the form, storyboard in beats, build `render(s)`, verify with `npm run check` and `node tools/beats.mjs`.

Candidate lessons, each chosen because its click is a motion:
- **Eratosthenes measures the Earth (c. 240 BCE).** Two shadows, one angle, 1/50 of a circle. Click: the sun's parallel rays and the angle at the Earth's center line up. Form: scroll story, geometry.
- **Zeno's paradoxes.** Achilles closes half the gap, forever. Click: the infinite steps fit in a finite time bar. Form: scrubbed timeline.
- **Plato's cave.** Shadows on a wall, then the turn toward the fire. Click: the viewer is shown the wall first and only later sees what casts it. Form: scroll story with a reveal.
- **The prisoner's dilemma and the trolley problem.** Click: the viewer's own choice, then the population of choices. Form: playable model.
- **The Black Death (1347 to 1351).** Spread along trade routes over a map. Click: the route network appears and the spread snaps to it. Form: time scrubber on a map (needs a sourced dataset).
- **The Columbian exchange.** Crops and diseases crossing the Atlantic. Form: unit chart plus map.
- **Ship of Theseus, part two: Locke's prince and cobbler, or the teleporter.** Personal identity. Form: scroll story.

## Courses worth paying for, if any
- Emil Kowalski, animations.dev (interface motion). Enrollment reopens 2026-11-10.
- Josh Comeau, Whimsical Animations ($299 and up): particles, springs, canvas, scroll.
- Free and enough to go far: The Nature of Code, The Book of Shaders, GSAP docs, The Coding Train.
