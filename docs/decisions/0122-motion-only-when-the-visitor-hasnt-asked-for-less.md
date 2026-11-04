---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D122
---

# Motion only when the visitor hasn't asked for less

## Context and problem statement

Spec 003 built the skeleton's empty page, and locked a check that no file in the site's source holds a transition or an animation (S1.5), since nothing on that page moved. [D35](0035-purposeful-motion.md) allows short motion that responds to the visitor and turns off with reduced motion, and the design system's components need hover and focus transitions. How should spec 003's check change?

## Decision drivers

- A locked test changes only with a spec change Brad approves, in the same pull request ([D101](0101-a-lighter-loop-one-session-and-two-gates.md)).
- D35: motion is short, never loops, never hides content, and turns off with reduced motion.
- v1's pages still don't move ([D121](0121-v1s-pages-keep-todays-look-until-the-redesign-replaces-them.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Amend spec 003's S1.5 and its static check in this pull request, and relock (recommended)
2. No motion in slice 3.1, and slice 3.2 amends spec 003 when the hero's motion arrives

## Decision outcome

Chosen option: "Amend spec 003's S1.5 and its static check, and relock".

- A transition or animation in the site's source is allowed only inside a `@media (prefers-reduced-motion: no-preference)` block, so it can't run when a visitor asks for reduced motion.
- Spec 003's browser check doesn't change: the home page has no animation, and looks the same with reduced motion on or off.
- The site still ships no script, and no class names Tailwind's transition or animation utilities.

### Consequences

- Good, because a machine enforces D35's rule, instead of forbidding all motion.
- Bad, because a locked test changes again, and spec 003's `tests.lock` with it.

### Confirmation

Spec 003's amended static test fails on a transition outside that query, `pnpm lock --check` passes with the new hash, and spec 009's tests check each component with reduced motion on.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.1 session.
