---
status: accepted
date: 2026-11-11
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D217
---

# bradthome.com gets a small card under "On the side", with its records counted at build

## Context and problem statement

The charter calls the site a work sample in its own right, with its design, code and process all public (D1, D9, D69), but the site said so only in one footer line (D210), and "Ask about Brad" had no source about it. On 2026-11-11 Brad asked that how the site is built be part of the portfolio, and chose on cards that it gets its own card under "On the side" and that the chat answers questions about it. The landing study had proposed a dated "how this site is built" tile and parked it on the GitHub App (D146). How big is the card, what does it show and from where, and does it print on the résumé PDFs?

## Decision drivers

- Hopper stays the lead; the card is never bigger than VINDecoded's and never in a heading above Hopper (D132, D134).
- Every claim links its proof (the charter's first principle), and every sentence is a public claim or a file's words (D129, D133).
- Nothing is fetched when a visitor views a page (D48); no GitHub API and no GitHub App.
- The résumé PDFs stay two pages.

## Considered options

For its size, in the builder's ranked order:

1. A small card, like Sudoku World's, with the counts beside its name and four short claims (recommended)
2. A slim strip: name, counts and one line
3. A full card, like VINDecoded's

For the PDFs, which print every side project the page shows:

1. Leave it off (recommended)
2. Print it as a third side project

For the facts, six bullets in Brad's notes, tagged public with repo links as their sources:

1. Approve the six, the card showing the first four (recommended)
2. Only the card's four

## Decision outcome

Chosen: the small card, off the PDFs, and the six facts, each as recommended, on the session's cards of 2026-11-11, and approved with spec 033 at its Gate 1 the same day.

- The card follows Sudoku World's on the home and every role page. It's the small card, and it's no taller than VINDecoded's: spec 033 swept it from 320 to 1440 pixels wide, and its tests hold five widths.
- It counts the decision records in `docs/decisions`, the specs in `specs` and the release records in `docs/releases` when the site is built, from the checkout the build runs in, and dates them by the build's day. Each count links its records on GitHub. Nothing is fetched to do it, and there's no count of pull requests, which D161 ended.
- Its four claims, from the six facts, each carry a receipt that links a real record: the repo and the design-system gallery (D218), the working agreement, v2.5.0's release record with its rehearsal, and `/evals`. Its link is "Read the source on GitHub", since its own site is the page. The chat reads all six facts, and its evals ask how the site was built, whether its code is public, who approves changes, and a question offering the labels the site avoids.
- The résumé PDFs leave it out: their contact line already links bradthome.com, and counts dated by a build can't stay current on paper. This amends spec 015's rule that each PDF prints what its page shows.

### Consequences

- Good, because a visitor sees the process as numbers with dates and links, and the chat can answer about the site with sources.
- Good, because the counts stay current with every build and cost nothing to keep.
- Bad, because the counts change with every slice, so the snapshots hold them at fixed values and the pre-release check reads them as placeholders.
- Bad, because the card's claims are long sentences, so its height is held to VINDecoded's by tighter tiles on a phone.
- Bad, because a release's own record is written after its build, so the live card counts the releases before the one it ships in, one fewer than GitHub shows, until the next release.

### Confirmation

Spec 033's tests read the card's place, words, counts, date, links and receipts on the home and each role page, compare each count with the checkout, measure its height against VINDecoded's at five widths, check the PDFs leave it out, and run the four eval cases.

## More information

- Decided by: Brad Thome, on the site-build-story session's cards and at spec 033's Gate 1, 2026-11-11.
- Spec: [spec 033](../../specs/033-site-build-story/spec.md).
