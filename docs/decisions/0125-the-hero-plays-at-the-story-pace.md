---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D125
---

# The hero plays at the Story pace

## Context and problem statement

[D35](0035-purposeful-motion.md) gives each page one orchestrated moment when it opens. The hero study timed the hero's sequence at two paces: Brisk, done by about 1.7 s, and Story, done by about 2.7 s. Which pace does the hero use?

## Decision drivers

- The words should land one at a time, slowly enough to read as a sequence.
- The whole moment should stay short, play once, and never hold back what a visitor needs.

## Considered options

The options are listed in the builder's ranked order.

1. Story: each word takes 0.65 s, the words start 0.52 s apart, and everything is in place by about 2.7 s (recommended)
2. Brisk: each word takes 0.42 s, the words start 0.3 s apart, and everything is in place by about 1.7 s

## Decision outcome

Chosen option: "Story". Brad wanted each word to have its moment.

- Each word lands over 650 ms, starting at 0, 520 and 1,040 ms.
- The two lines start at 1,495 and 1,755 ms, the buttons at 2,015 ms and the chips at 2,115 ms. Each takes 560 ms, so the last ends at 2,675 ms.
- In the "End to end" card, each row lights for 1.1 s as its word lands.
- It plays once, when the page loads, and never loops. With reduced motion it doesn't play ([D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md)).

### Consequences

- Good, because the sequence reads as a story, in the order of Brad's career.
- Bad, because the full moment takes 2.7 s, although the text can be read from the first frame ([D126](0126-the-heros-text-is-readable-from-the-first-frame.md)).

### Confirmation

Spec 010's tests read the timings from the hero's stylesheet and check them against these numbers.

## More information

- Decided by: Brad Thome, on 2026-11-04, in the session that planned phase 3, and passed to slice 3.2 in its brief.
