---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D143
---

# App Store cards show a rating only from 100 ratings

## Context and problem statement

Apple's lookup API gives each app's average rating and rating count. VINDecoded has 4.7 from about 3,200 ratings; Sudoku World has 5.0 from 6. Neither number is in a public claim. Should an App Store card show them?

## Considered options

The options are listed in the builder's ranked order.

1. No ratings: icon, name, seller, category, a line of description and the snapshot's date (recommended)
2. The rating and count on every card
3. The rating only where there are at least 100 ratings

## Decision outcome

Chosen option 3. A card shows the snapshot's rating, to one decimal place, and its count rounded down to two significant figures, as in "4.7 stars · 3,200+ ratings", only when the count is at least 100. So VINDecoded's card shows it and Sudoku World's doesn't. The count is rounded so the weekly refresh rarely sees a change.

### Consequences

- Good, because the one well-rated app shows proof a visitor can check, and a thin count never reads as a boast.
- Bad, because a number that isn't a claim shows on the site, from Apple's data, and can move between refreshes.

### Confirmation

Spec 016's tests check the threshold and the rounding on planted snapshots, and VINDecoded's and Sudoku World's cards on `/v2`.

## More information

- Decided by: Brad Thome, on the slice 3.8 session's card, 2026-11-05.
