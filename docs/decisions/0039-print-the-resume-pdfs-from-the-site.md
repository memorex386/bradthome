---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D39
---

# Print the résumé PDFs from the site

## Context and problem statement

**The question:** How is the résumé PDF made?

One design, with accessibility checked automatically.

## Considered options

The options are listed in the builder's ranked order.

1. Print the site's own page with Playwright, checked by veraPDF (recommended, chosen)
2. Typst templates
3. WeasyPrint

## Decision outcome

Chosen option: "Print the site's own page with Playwright, checked by veraPDF".

The résumé PDFs are printed from the site's own pages with Playwright and checked by veraPDF in CI. If the accessibility tags fail, Typst is the fallback.

## More information

- Decided by: Brad Thome, on the foundation decision page (R4).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
