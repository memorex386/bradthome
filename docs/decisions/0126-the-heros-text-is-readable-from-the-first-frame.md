---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D126
---

# The hero's text is readable from the first frame

## Context and problem statement

The hero study's motion brings each word up from invisible through a blur, then fades in the lines, buttons and chips after it, so only the eyebrow shows in the first frame. [D35](0035-purposeful-motion.md) says motion never hides content, and slice 3.2's brief asks for text that can be read in the first frame, with motion only building on it. A hidden heading would also hold back the page's Largest Contentful Paint by about 1.7 s. How should the words land?

## Decision drivers

- D35: motion never hides content.
- The roles and lines are what a recruiter needs first.
- Spec 003's Lighthouse budgets: Largest Contentful Paint under 2 s, and no layout shift.

## Considered options

The options are listed in the builder's ranked order.

1. Readable, then land: every word, line, button and chip is painted in place in the first frame. The words start a little low, in a muted gray that meets AA, then each rises into ink in turn. The lines, buttons and chips rise 10 pixels. There's no blur (recommended)
2. As drawn: the words blur in from hidden and the rest fades in, so only the eyebrow is readable at first
3. The words as in option 1, with the lines, buttons and chips fading in from hidden as drawn

## Decision outcome

Chosen option: "Readable, then land". The motion keeps the hero study's order and timing, but it only adds emphasis, so nothing waits on it.

- Nothing in the hero starts transparent or blurred. The motion only changes colors and transforms, so nothing shifts the layout.
- The first frame's colors meet WCAG 2.2 AA in both themes.

### Consequences

- Good, because the heading paints at once, so Largest Contentful Paint isn't held back, and a visitor who looks away mid-sequence misses nothing.
- Bad, because it loses the board's blur, the most striking part of the drawn motion.

### Confirmation

Spec 010's tests read the hero's text and colors in the first frame and mid-sequence, and Lighthouse checks Largest Contentful Paint and layout shift on the page.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.2 session.
