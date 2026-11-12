---
status: superseded by D223
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D205
---

# Proof tiles from three claims replace the highlight chips

## Context and problem statement

Spec 010's hero ended with three highlight chips: "Hopper · Fintech AI", "Capital One Travel" and "10+ partner products". They name where the work happened, but not what it did. Direction A asks the first screen to prove the work. What should sit under the hero's buttons?

## Decision drivers

- Every word on the page is a public claim or an existing label, and a short label uses only words its claim holds.
- No new claims, figures or framings.
- The first screen has little room, on a phone above all.

## Considered options

The options are listed in the builder's ranked order.

1. Three proof tiles, each a figure from a claim (recommended)
2. The chips, as today

## Decision outcome

Chosen option 1, as the study recommended and Brad approved at spec 025's Gate 1. Three tiles, each linking its Hopper topic:

- "5", "more partners adopted the reusable capability from Capital One Travel's purchase flow", from `hopper-disruption-assistance-1`. The flow created the capability, and the capability is what 5 more partners adopted.
- "10+", "partner products, including Frontier and Spirit", from `hopper-disruption-assistance-3`.
- "Founding", "engineer on Hopper's Fintech AI team", from `hopper-role-and-dates-2`.

Wide screens show one row of three; phones stack them as rows, each figure beside its label.

### Consequences

- Good, because the first screen shows outcomes, and each one opens its evidence.
- Good, because a test checks every word against its claim.
- Bad, because the tiles are taller than chips, which T2's tighter spacing pays for.

### Confirmation

Spec 025's static test checks each tile's words against its claims and its topic link, and its end-to-end tests check the links and the layout at each size.

## More information

- Decided by: Brad Thome, at spec 025's Gate 1, 2026-11-09, from the landing study's T1.
- Superseded by [D223](0223-the-role-tiles-are-the-switch.md), 2026-11-12: the role tiles, with live years, replace the proof tiles. Founding engineer on Hopper's Fintech AI team stays, as the Applied AI tile.
