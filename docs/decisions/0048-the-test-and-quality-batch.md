---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D48
---

# The test and quality batch

## Context and problem statement

**The question:** Approve the test and quality batch

Tier-2 batch.

## Considered options

The options are listed in the builder's ranked order.

1. Approve all (recommended, chosen)
2. Approve all except the ones I name below
3. Discuss each one

## Decision outcome

Chosen option: "Approve all".

The test and quality batch (R14) is approved:
- Vitest 5.
- Playwright with axe: WCAG 2.2 AA, with the target-size rule on.
- A manual pass in each slice: keyboard, screen reader and reduced motion.
- Lighthouse CI: median of five runs, with budgets set below the charter's limits.
- html-validate, lychee and astro check.
- ESLint and Prettier, with oxlint optional.
- StrykerJS nightly, on the safety scripts.
- Link previews committed to the repo and refreshed by a scheduled PR. The LinkedIn and Play cards are written by hand.

## More information

- Decided by: Brad Thome, on the foundation decision page (R14).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
