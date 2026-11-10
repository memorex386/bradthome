---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D207
---

# Direction A of the landing page runs as phase 5

## Context and problem statement

Phase 4 ended with v2.2. On 2026-11-09 Brad chose direction A of the landing study, today's home refined, as six slices, A1 to A6. Where do they sit in the slice plan?

## Decision drivers

- The plan numbers slices by phase.
- Each slice ships alone, on the full track, and lands on `next` before any release.

## Considered options

The options are listed in the builder's ranked order.

1. A new phase 5, slices 5.1–5.6, released as v2.3 (recommended)
2. Follow-ups to phase 3, slices 3.12–3.17

## Decision outcome

Chosen option 1, as recommended. A1–A6 are slices 5.1–5.6, released as v2.3, or in parts on Brad's release card after 5.1.

### Consequences

- Good, because the plan reads in order, and phase 3's record stays closed.
- Bad, because nothing.

### Confirmation

`docs/plan.md` has a phase 5 section with the six slices, and slice 5.1's state.

## More information

- Decided by: Brad Thome, at spec 025's Gate 1, 2026-11-09.
