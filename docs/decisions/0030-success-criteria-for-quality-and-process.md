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
- Later: [D40](0040-analytics-with-umami-cloud.md) chose Umami Cloud for the visitor measures.
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
- Amended on Brad's card, 2026-11-17, in spec 041: the phone LCP budget Lighthouse CI enforces is 2.1 s, from 2.0 s, since VINDecoded's live card took the home's HTML past the first round trip; a later slice slims the home to win it back. The charter's 2.5 s doesn't change.
- Amended on Brad's card, 2026-11-18, in spec 043: the phone LCP budget is 2.0 s again. Lighthouse CI now loads the build as Firebase Hosting serves it, with brotli, where its own static server sent only gzip, and the unchanged home measures 1.94 s ([D245](0245-lighthouse-ci-serves-the-build-as-firebase-does.md)). A 14,000-byte brotli budget holds the home's HTML inside the first round trip ([D246](0246-a-byte-budget-for-the-homes-html.md)).
