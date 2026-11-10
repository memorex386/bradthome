---
status: accepted
date: 2026-11-10
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D208
---

# One receipts drawer per card, with the numbers kept inline

## Context and problem statement

D118 gave every claim on the home page its own receipt: a note in the margin on a desktop, and a full-width box under the claim on a phone. On a phone, that's 23 boxes between the paragraphs, and 18 of them say the same "Ask me". The landing study measured the phone page at about 900 px longer than it needs to be. How should the home page show its evidence?

## Decision drivers

- A recruiter on a phone should read the claims straight through, with the evidence one tap away.
- Every claim keeps its numbered marker, and every receipt keeps its number, title and link.
- Content is complete at rest and works with no script (D122, D126).
- The desktop page shouldn't change much, since the margin notes cost it no height.

## Considered options

The options are listed in the builder's ranked order.

1. One drawer per card, beside its tags, with the markers kept inline (recommended)
2. One receipt per claim, as D118 had it

## Decision outcome

Chosen option 1, which Brad picked on the landing study's card (Q2, 2026-11-09) and approved at spec 026's Gate 1 (2026-11-10). This amends D118's per-claim notes and spec 009's FR-006.

- Each card with claims has one Receipts control: the Hopper story's role lines, its five topics, Bleacher Report, BookShout, Bottle Rocket, VINDecoded and Sudoku World. It sits after the card's tags, at the line's end, or alone as a bar under the claims.
- The drawer is a native `details`. It lists each receipt's number, title, and either "Ask me" or its source's host as a link. "Ask Brad about these" goes to Contact until A6.
- A marker is a link to its row. Following it opens the drawer, scrolls the row about 40% down the screen and tints it for a moment, all without script. The study's script opened the drawer in place; Brad chose the link.
- MA-12's motion is CSS only: the height opens in 280 ms where the browser can animate a disclosure, and at once elsewhere or under reduced motion.
- On Brad's Gate 1 cards: the claims' column caps at 56 rem, since the study's 46 rem made the desktop page 3.7% longer; and on a phone the control shows its numbers and "Receipts" without its summary, so it fits beside the tags.

### Consequences

- Good, because the phone page is about 890 px shorter, and desktop changes by under 2%.
- Good, because the one module and the CSP don't change.
- Bad, because a receipt's title is one tap further from its claim on a desktop, where the margin showed it beside the claim.
- Bad, because following a marker moves the page, where the study's script didn't.

### Confirmation

Spec 026's tests count the drawers and rows against the markers on `/` and each role page, open them from markers with script off, and measure the page's height at 390, 1280 and 1440 px.

## More information

- Decided by: Brad Thome, on the landing study's Q2 card (2026-11-09) and at spec 026's Gate 1 (2026-11-10).
- Builds on [D118](0118-direction-a-with-cs-numbered-evidence-receipts.md), [D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), [D126](0126-the-heros-text-is-readable-from-the-first-frame.md) and [D153](0153-ask-me-links-go-to-the-contact-section.md).
