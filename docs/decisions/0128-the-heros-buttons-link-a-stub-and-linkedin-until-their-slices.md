---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D128
---

# The hero's buttons link a stub and LinkedIn until their slices

## Context and problem statement

The hero's two buttons are "See the work at Hopper" and "Read the résumé". Their real targets come in slice 3.3, the Hopper story, and slice 3.7, the résumé PDFs. A link to a page or anchor that doesn't exist yet fails the links check. What do the buttons do until then?

## Decision drivers

- Every link works on every preview.
- The later slices only change where each button points.

## Considered options

The options are listed in the builder's ranked order.

1. Hopper links `#hopper`, a stub section under the hero that slice 3.3 fills, and the résumé links Brad's LinkedIn profile until 3.7 (recommended)
2. Both link stub sections under the hero, `#hopper` and `#resume`
3. Hopper links the `#hopper` stub, and the résumé links the essay at `/vindecoded-agents`

## Decision outcome

Chosen option: "A stub anchor and LinkedIn". The Hopper button already goes where it will in slice 3.3, and LinkedIn is Brad's public résumé until the PDFs exist.

### Consequences

- Good, because both buttons work now, and 3.3 and 3.7 each change one link.
- Bad, because until 3.7, "Read the résumé" leaves the site.

### Confirmation

Spec 010's tests follow both buttons, and the links check finds the `#hopper` anchor.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.2 session.
