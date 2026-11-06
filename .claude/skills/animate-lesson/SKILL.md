---
name: animate-lesson
description: Turn a history lesson, philosophical idea or project explanation into an animated web explainer in Motion Studio. Use when Henry asks to animate, explain visually, make an explorable or scrollytelling piece, or "make X click" for a topic.
---

# Animate a lesson

An animated explainer exists to make one idea click: a moment where the viewer sees something they could not see from prose. Everything else is setup for that moment. Build toward it, verify the facts under it, and stop when it lands.

## 1. Find the click (before any code)

Write these four lines in `lessons/<slug>/storyboard.md`:

- **The idea in one sentence.** If it needs two, it is two lessons.
- **The misconception or blind spot** the viewer arrives with.
- **The click:** the single visual change that breaks it. Phrase it as what moves on screen ("the discarded planks reassemble into a second ship beside the first").
- **What the viewer does** at the click: scrolls, drags, chooses, or watches. Doing beats watching when the idea is about cause and effect.

If you cannot write the click as motion, the topic may be better as prose. Say so.

## 2. Check the facts first

Animation makes claims feel true, so a wrong claim does real harm. For every factual claim, find the primary or best scholarly source and locate the passage (book, chapter, section; for ancient texts the standard reference, e.g. Plutarch, *Theseus* 23.1). Write `lessons/<slug>/sources.md` with claim, source, passage, and confidence. Anything reconstructed, disputed or invented for illustration is labelled on the page itself, not only in sources.md. Have the `outside-judge` agent check sources.md against the sources, given the claims, not your reasoning.

## 3. Pick the form

| The idea is about | Form | Drills to pull from |
|---|---|---|
| A sequence of events or an argument in steps | Scroll story: sticky graphic, prose steps | 04 scrollytelling, 02 GSAP timeline, 03 CSS scroll-driven |
| A system where individual rules make collective results | Playable model, then the lesson | 08 agent simulation, 01 springs for controls |
| Change over time or place | Time scrubber, map or timeline | 07 time scrubber, 06 unit chart |
| Scale, numbers too big to feel | Unit chart, one mark per unit | 06 unit chart |
| A thought experiment with a twist | Scroll story that ends in a choice the viewer must make | 04, 05 view transitions for the reveal |
| Place, architecture, a physical object | 3D scene with camera stations | 11 three scene |
| Mood, atmosphere, a world | Generative backdrop | 09 flow field, 10 procedural painting, 12 SDF shader |

Most lessons are a scroll story with one interactive figure at the click. Do not stack techniques for their own sake; one technique per idea.

## 4. Storyboard as beats

5 to 9 beats. Each beat is one graphic state plus one or two sentences of prose. The usual arc:

1. Hook: a concrete scene, not a definition.
2. to N-2. Build the setup one change at a time.
N-1. The click.
N. Hand it to the viewer: a choice, a slider, "you decide".
Then the lesson stated plainly, and the open question it leaves.

Write the beats in storyboard.md as a table: beat, graphic state, prose, interaction.

## 5. Build

- Copy the page skeleton from a drill. Lessons use `<article class="page">` with the same tokens.
- Model the graphic as **states**: one `render(state, t)` function that draws any beat at any progress `t` in [0, 1]. Scroll, buttons and reduced-motion all call the same function, so every beat is reachable without animation.
- Drive beats with GSAP ScrollTrigger (scrub for continuous beats, onEnter for discrete) or with buttons for playable models.
- Accent color only on the thing the current beat is about.
- Reduced motion: render end states, no tweens.
- Keep prose short. The figure carries the explanation; prose names what to look at.

## 6. Verify

- `npm run check -- lessons/<slug>` must pass. Then screenshot each beat (scroll to each step with Playwright) at 1440px and 390px and look at every one.
- Read the page top to bottom as a newcomer. Is the click visible without reading the prose?
- outside-judge on sources.md.
- Report what was not verified.

## References

- `research/field-map.md`: libraries, creators, exemplars, and the recurring techniques of history and philosophy explainers.
- `lessons/ship-of-theseus/`: the worked example of this workflow.
