---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D204
---

# The hero plays at the Brisk pace, and a deep link finishes it at once

## Context and problem statement

[D125](0125-the-hero-plays-at-the-story-pace.md) set the hero's sequence at the Story pace, which settles at 2,675 ms. The landing study compared paces for direction A, today's page refined. On a first visit the hero is all a visitor sees, so its length is felt. A visit that opens at `/#hopper`, or reloads scrolled down, plays the sequence out of sight and could replay it on the way back. Which pace should the hero use, and what happens away from the top?

## Decision drivers

- Readable from the first frame, with motion only when the visitor hasn't asked for less ([D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), [D126](0126-the-heros-text-is-readable-from-the-first-frame.md)).
- The hero is the one orchestrated moment, and it shouldn't hold up reading.
- Phase 3's pages load one small module, whose size specs 016–018 check.

## Considered options

The options are listed in the builder's ranked order.

1. Brisk, done at 1,600 ms (recommended)
2. Story, as today
3. No sequence

## Decision outcome

Chosen option 1, as recommended, on the study's card. The words land 300 ms apart over 520 ms, rising on a spring, `cubic-bezier(0.3, 1.32, 0.52, 1)`, and inking on the ease-out. Each dot pops as its word lands. Each "End to end" row runs a sheen 140 ms after its word, and the lines, buttons, proof tiles and switch rise last. The sequence ends at 1,600 ms. On a pointer device, a word and its rows light together, and the hero's button and tiles lift and press. This amends D125's pace; D126 stands.

A page that loads with a hash, or scrolled down, finishes the hero's animations at once. A few lines in the site's one module do this, checked again at `load`, with no scroll handler. Brad approved a 512-byte allowance for them in specs 017 and 018's module-size checks, at spec 025's Gate 1.

### Consequences

- Good, because the first screen settles a second sooner.
- Good, because a deep link never plays the hero out of sight, and going back replays nothing.
- Bad, because the one module grows, by 184 bytes as built.
- Bad, because a browser without `:has()` doesn't light the rows when a word is hovered.

### Confirmation

Spec 025's end-to-end tests read `document.getAnimations()` against the motion table within 10 ms, and check `/#hopper`, a restored scroll and reduced motion.

## More information

- Decided by: Brad Thome, on the landing study's card (Q3) and at spec 025's Gate 1, 2026-11-09.
