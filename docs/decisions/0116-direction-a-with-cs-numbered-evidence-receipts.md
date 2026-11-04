---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D116
---

# Direction A, with C's numbered evidence receipts

## Context and problem statement

Phase 3 redesigns the site, and slice 3.1 builds its design system, which waits on the look ([plan](../plan.md)). The design canvas drew three directions: A, a bold, story-led page; B, a console; and C, a living résumé whose claims carry numbered receipts. A was later redrawn as "Home v2", senior engineer first. Which look does the redesign build?

## Decision drivers

- A visitor should see who Brad is, and that the claims are real, in the first screen.
- Every claim should be backed by evidence the visitor can open.
- One look, so slices 3.2–3.11 build on one set of tokens and components.

## Considered options

The options are listed in the builder's ranked order.

1. Direction A as Home v2 draws it, plus C's numbered evidence receipts on claims (recommended)
2. Direction A as Home v2 draws it
3. Direction C
4. Direction B

## Decision outcome

Chosen option: "Direction A as Home v2 draws it, plus C's numbered evidence receipts on claims". Brad liked A's confident, readable page, and wanted C's receipts to carry the proof, so a claim can be checked without leaving the page.

- The look: Home v2's warm off-white and near-black palette with one blue accent, a dark band for featured work, Inter Tight for display, Inter for text, JetBrains Mono for eyebrows and labels, pill buttons and chips, rounded cards, and the "Hiring for" role switch.
- The receipts: a numbered marker on a claim opens a note with its evidence. A filled marker is proof that can be shown, and an outlined one is something to ask Brad about. On a desktop the notes sit in the margin, and on a phone they open in line. They take A's accent, not C's orange.
- Where A's older boards differ from Home v2, Home v2 wins. The boards' words aren't the site's words: each page's slice writes its own.

### Consequences

- Good, because the design system has one source to match, and the receipts give every later page the same way to show evidence.
- Bad, because a note in the margin needs a wide screen, so the phone needs its own in-line form.

### Confirmation

Spec 009's gallery shows every component in both themes at both sizes, and Brad approves it at Gate 1.

## More information

- Decided by: Brad Thome, on 2026-11-04, in the session that planned phase 3, and passed to slice 3.1 in its brief.
