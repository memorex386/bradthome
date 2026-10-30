---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D46
---

# Visual snapshots in a pinned Linux container

## Context and problem statement

**The question:** Where do visual snapshots run?

Baselines only match on the system where they were made.

## Considered options

The options are listed in the builder's ranked order.

1. A pinned Linux container, in CI and on Brad's PC (recommended, chosen)
2. CI only
3. Separate baselines for Windows and Linux

## Decision outcome

Chosen option: "A pinned Linux container, in CI and on Brad's PC".

Visual snapshots run in a pinned Linux container, both in CI and on Brad's PC through Docker Desktop.

## More information

- Decided by: Brad Thome, on the foundation decision page (R12).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
