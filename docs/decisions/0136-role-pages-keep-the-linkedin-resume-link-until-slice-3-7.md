---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D136
---

# Role pages keep the LinkedIn résumé link until slice 3.7

## Context and problem statement

D6 has each role page offer its matching résumé PDF, but the PDFs are slice 3.7. The hero's "Read the résumé" links LinkedIn until then (D128). What does a role page's résumé link do in the meantime?

## Considered options

The options are listed in the builder's ranked order.

1. Link LinkedIn on every page, as the home does (recommended)
2. Hide the link on the role pages until their PDF exists

## Decision outcome

Chosen option 1. Every page's "Read the résumé" links LinkedIn, and slice 3.7 swaps each page's link for its matching PDF.

### Consequences

- Good, because the hero looks the same on every page, and no page shows a dead link.
- Bad, because D6's matching PDF waits a slice.

### Confirmation

Spec 014's tests check the résumé link on every page.

## More information

- Decided by: Brad Thome, on the slice 3.6 session's card, 2026-11-05.
