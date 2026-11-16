---
status: accepted
date: 2026-11-16
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D232
---

# Six pages get a share card, drawn at build from their own words

## Context and problem statement

Counted on live v2.9.0 on 2026-11-16, no page set `og:image`, so a link to the site pasted into LinkedIn, Slack, an email or a text showed words only, and `/evals` set no share tags at all. Pages with share tags set `twitter:card` to `summary`. Brad picked share cards on the pictures study's second round of cards. Which pages get one, what does each show, and how is it made?

## Decision drivers

- A card shows only the page's own words and data, and stays current as they change, the years included (D224).
- Visitors never load a card, so the pages' weight and the CSP don't change (D159).
- Nothing is fetched to build one (D48), and the same tree builds the same bytes, as the résumé PDFs do (D139).
- LinkedIn skips SVG and may skip WebP, so a card is a PNG.

## Considered options

1. A 1200 × 630 PNG for the home, the three role pages, the essay and `/evals`, drawn at build in the pinned container from the page's words; the other pages share the home's (recommended)
2. One card for the whole site
3. No cards: words only, as today

## Decision outcome

Chosen option 1, on Brad's card in the career session's study of 2026-11-16, and approved with spec 039 at its Gate 1 the same day.

- Six cards, each drawn from its page's own data: the home's eyebrow, the hero's three words with their dots, the three role tiles with their years counted for the build's day and the hero's first line; each role page's `og:title` with its word and tile lit and the others quiet; the essay's title, its diagram's six phases and its summary's 1,235 merged pull requests, 83% from agent branches, with their dates; and `/evals`' title with the latest full run's safe and accurate counts, model and date.
- Astro builds a print page for each, and an integration draws it with the pinned container's Chromium, serving only the build's own files, then removes the print pages. Each card is drawn twice and must match byte for byte, must be under 300 KB, and must fit its words with its fonts loaded, or the build fails. A build in CI without Chromium fails; elsewhere it says so and leaves the cards out.
- Every page with share tags sets `og:image` to `https://bradthome.com/share/<page>.png`, with its width, height and alt, `twitter:card` `summary_large_image`, `twitter:image` and its alt. `/evals` gains share tags. A page with share tags and no card of its own names the home's, and the 404 page still sets none (spec 007).
- No avatar or photo is on a card (D226).

### Consequences

- Good, because a pasted link shows the page's words and numbers as a picture, and the cards follow the page as it changes.
- Good, because visitors download nothing more, and the CSP is unchanged.
- Bad, because the build now needs Chromium as well as WeasyPrint, which only the pinned container has.
- Bad, because LinkedIn keeps an old preview for about a week after a release; its Post Inspector fetches the new one, with Brad signed in.

### Confirmation

Spec 039's tests read every page's share tags, open each card they name and check it's a 1200 × 630 PNG under 300 KB, check the 404 page has none, and snapshot each card.

## More information

- Decided by: Brad Thome, on the pictures study's round 2 card (2026-11-16) and at spec 039's Gate 1 (2026-11-16).
- Spec: [spec 039](../../specs/039-pictures/spec.md).
