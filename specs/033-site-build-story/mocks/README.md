# Spec 033: states

The mocks are this slice's own build, captured on 2026-11-11 in Chromium with reduced motion, at 2× density, from a local preview. The counts are the repo's at that build: 214 decisions, 31 specs and 8 releases. Once the slice lands, `tests/snapshots/033/` holds each state's baseline, with the counts and date held fixed, and the page itself, on `next`, is the record.

## States

| ID | State | Phone, 390 × 844 | Desktop, 1280 × 800 |
| -- | ----- | ---------------- | ------------------- |
| M1 | The card, drawer closed | [light](M1-card-phone-light.png), [dark](M1-card-phone-dark.png) | [light](M1-card-desktop-light.png), [dark](M1-card-desktop-dark.png) |
| M2 | The card, drawer open | [light](M2-card-open-phone-light.png), [dark](M2-card-open-phone-dark.png) | [light](M2-card-open-desktop-light.png), [dark](M2-card-open-desktop-dark.png) |
| M3 | "On the side", all three cards | [light](M3-section-phone-light.png), [dark](M3-section-phone-dark.png) | [light](M3-section-desktop-light.png), [dark](M3-section-desktop-dark.png) |

## What changed from the interview's preview

Brad chose the small card from a text preview. Building it, three of its words changed so the card stays no taller than VINDecoded's on a phone, all tier 3:

- The first count's label is "decisions", not "decision records", so every tile's label fits one line.
- The kicker is "Built in the open", without "since 2026".
- The date line is "Counted from the repo on Nov 11, 2026.", one line on a phone.

## Heights

Each card's height in pixels, in Chromium, at 800 pixels tall. bradthome.com's is at most VINDecoded's at every width from 320 to 800 in 10-pixel steps and from 800 to 1440 in 40-pixel steps. The closest is 3 pixels, at 440. `tests/033/` holds the five widths below.

| Width | VINDecoded | Sudoku World | bradthome.com |
| ----- | ---------- | ------------ | ------------- |
| 320   | 937        | 489          | 906           |
| 390   | 828        | 417          | 760           |
| 430   | 767        | 417          | 740           |
| 768   | 651        | 346          | 585           |
| 1280  | 564        | 331          | 496           |
