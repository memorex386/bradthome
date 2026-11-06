# Spec 016 mocks: Link previews

"Show it" for [spec 016](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mock is the cards themselves, built from this branch. Open this pull request's preview on a desktop and hover or Tab to a link, or on a phone and tap one: the header's GitHub and LinkedIn, and the store and site links in the receipts of "On the side".
- `/design-system#previews` holds every kind of card open at once, including the missing state, which real data never shows.
- The snapshot baselines in `tests/snapshots/016/` show each state below, from the pinned container with reduced motion on.
- The look is Link Cards' L1–L5, on the design system's tokens. The words are the snapshots, the claims and the job and project files, never the board's drafts.

## Every state

| ID                | State                                                                                                         | Scenarios  |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| <a id="l1"></a>L1 | GitHub, open on hover, desktop, light: avatar, bio, repo count, snapshot date (D150)                          | S1.1, S2.1 |
| <a id="l2"></a>L2 | LinkedIn, open on hover, desktop, dark: written by hand, with Hopper and VINDecoded and their years           | S1.1, S2.4 |
| <a id="l3"></a>L3 | VINDecoded's App Store listing, in its receipt, desktop: icon, store name, rating from 3,200+ ratings         | S2.2, S2.3 |
| <a id="l4"></a>L4 | VINDecoded's Google Play listing, written by hand, its line from claim `vindecoded-3`                         | S2.4       |
| <a id="l5"></a>L5 | No snapshot yet, in the gallery: the host, and a line saying the link opens the page itself                   | S2.5       |
| <a id="f1"></a>F1 | Keyboard: the header's LinkedIn focused, its card open, desktop, dark                                         | S1.2       |
| <a id="f2"></a>F2 | Keyboard: Escape pressed, the card closed, focus still on the link                                            | S1.2       |
| <a id="t1"></a>T1 | A tap on VINDecoded's App Store link in its receipt, phone, light: the sheet, the link above it, Open focused | S1.3, S1.4 |
| <a id="t2"></a>T2 | A tap on the header menu's GitHub, phone, dark: the sheet over the open menu                                  | S1.3       |

## What's left out

- The board's contribution heatmap and its count (D144).
- Download counts on the cards, and Sudoku World's rating, from 6 ratings (D143).
- LinkedIn's headline and follower count, and Brad's city: none is in a public claim.
