---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D55
---

# Split the required checks by determinism

## Context and problem statement

**The question:** Which checks block a merge?

Brad's R15 note asked to work like a real company. Real teams make deterministic checks required and keep checks that can fail for outside reasons from blocking merges. This replaces R15's 10-minute rule and updates [D49](0049-the-ci-and-safety-batch.md).

## Considered options

The options are listed in the builder's ranked order.

1. Required for everything that gives the same result every time, nightly for the rest (recommended, chosen)
2. Make everything required, including external links and mutation testing
3. Discuss it first

## Decision outcome

Chosen option: "Required for everything that gives the same result every time, nightly for the rest".

Required checks split by determinism.

Required on every pull request, however long they take: lint and format, types, unit tests, end-to-end tests with accessibility and visual snapshots, Lighthouse (the median of five runs, with headroom), HTML validation, internal links, the PDF accessibility check, traceability, locked tests, the privacy scan and the secret scan.

Run nightly and non-blocking: external links, mutation testing and full-site crawls.

## More information

- Decided by: Brad Thome, on the foundation decision page (F5).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
