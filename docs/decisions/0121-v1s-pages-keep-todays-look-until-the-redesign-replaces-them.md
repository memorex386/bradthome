---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D121
---

# v1's pages keep today's look until the redesign replaces them

## Context and problem statement

Slice 3.1 builds the redesign's header, footer, fonts and colors. The home, essay and 404 pages could switch to them now, with the same words, or wait until slices 3.2–3.5 build the new pages. Which?

## Decision drivers

- Main stays releasable ([D120](0120-v1-x-fixes-ship-from-main-which-stays-releasable.md)).
- The live words and look change only at the v2.0 relaunch ([D58](0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Wait: the new components show only on the gallery until slices 3.2–3.5 (recommended)
2. Switch now: the home, essay and 404 pages take the new chrome in this slice

## Decision outcome

Chosen option: "Wait". It keeps v1 exactly as released, so any v1.x fix can ship from main, and the new chrome first appears on pages built for it.

- The design system lives beside v1's styles, in its own stylesheet and layout, and v1's pages don't load it.
- Slices 3.2–3.5 move each page to the new layout as they build it.

### Consequences

- Good, because v1's pages, their checks and their snapshots don't change.
- Bad, because the site holds two layouts and two sets of tokens until the relaunch.

### Confirmation

Spec 009's tests check that v1's pages load none of the design system, and the snapshots of specs 003, 006 and 007 still match.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.1 session.
