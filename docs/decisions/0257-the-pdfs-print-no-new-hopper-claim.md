---
status: accepted
date: 2026-11-20
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D257
---

# The résumé PDFs print none of the offer agent's claims

## Context and problem statement

The résumé PDFs print every Hopper claim, and since spec 040 the tightest has about 13 pt to spare in its two pages. The four new Fintech AI claims (D255) would push them to a third. What do the PDFs print from them?

## Decision drivers

- The PDFs stay at two pages (spec 015).
- Every sentence on paper is a claim's words (D137).

## Considered options

1. Nothing new: a list keeps the new claims off paper (recommended)
2. One trimmed "what it was" line, as a claim of its own, with another line trimmed to make room

## Decision outcome

Chosen option 1, on Brad's card in spec 047's session, 2026-11-20. `OFF_PAPER` in `hopper.ts` names the four claims, and the résumé's Hopper groups skip them, as spec 041's paper list does for the side cards. The PDFs print what they print today.

### Consequences

- Good, because the PDFs don't change.
- Bad, because a reader of the PDF alone doesn't see the offer agent; the existing Fintech AI line stays.

### Confirmation

Spec 047's S5.6.

## More information

- Decided by: Brad Thome, on the session's card in spec 047.
