---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D30
---

# Success criteria for quality and process

## Context and problem statement

**The question:** How will we know the site is working?

Principle 2, applied to the whole project.

## Considered options

The options are listed in the builder's ranked order.

1. Quality and process bars now, visitor measures later (recommended, chosen)
2. Quality and process bars only
3. Visitor measures first

## Decision outcome

Chosen option: "Quality and process bars now, visitor measures later".

Success criteria, from the first slice: Core Web Vitals good on phones (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile), WCAG 2.2 AA with no automated violations, no private-data leaks, and every slice through the loop. Visitor measures follow the analytics decision.

## More information

- Decided by: Brad Thome, on the charter decision page (C2).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
