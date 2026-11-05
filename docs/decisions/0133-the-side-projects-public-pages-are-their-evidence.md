---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D133
---

# The side projects' public pages are their evidence

## Context and problem statement

The side projects' claims had no evidence links, so every receipt in the "On the side" section would have been the ask-me state. Public pages back most of them: the apps' store listings, vindecoded.com, sudokuworld.app and the case study. Should those links become evidence in the content model?

## Decision drivers

- A receipt is worth most when it links proof a visitor can check (D118).
- Evidence comes into the content only through the export, from a public bullet's source in Brad's notes (D44, D108).

## Considered options

The options are listed in the builder's ranked order.

1. Add every public link: the store listings, both sites and the case study (recommended)
2. Add only the four store listings
3. Add none, so every receipt asks

## Decision outcome

Chosen option 1. Each link was added to its public bullet's source in the notes, and `pnpm content:export` wrote them as evidence. Nothing else in `claims.yaml` changed.

| Claim                          | Evidence                                          |
| ------------------------------ | ------------------------------------------------- |
| `vindecoded-2`                 | vindecoded.com                                    |
| `vindecoded-3`                 | VINDecoded's Google Play and App Store listings   |
| `vindecoded-6`, `vindecoded-7` | The case study, bradthome.com/vindecoded-agents   |
| `sudoku-world-1`               | sudokuworld.app                                   |
| `sudoku-world-3`               | Sudoku World's Google Play and App Store listings |

### Consequences

- Good, because the section's receipts link proof, as the Experience section's Play listing does.
- Bad, because the case study's link names live's address, so a receipt on a preview leaves the preview. That's the same page on both.

### Confirmation

Spec 013's tests check each receipt's state and links against the claims' evidence.

## More information

- Decided by: Brad Thome, on the slice 3.5 session's card, 2026-11-05.
