---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D27
---

# The conventions batch for templates, IDs and records

## Context and problem statement

These conventions came with the 0.1 drafts. Item 7 is Claude pushing back on its own draft: hashes of short phrases can be guessed.

## Considered options

Brad approved this conventions batch as drafted, so no alternatives were put to him.

## Decision outcome

The tier-2 batch for step 0.1 is approved:
- Templates live in `docs/templates/`. The PR and light-change issue templates live in `.github/`.
- IDs: scenarios S1.1, requirements FR-001, success criteria SC-001, tasks T001.
- Decision records are `docs/decisions/NNNN-short-title.md`. The decision log is that folder's README.
- Full-track commits use the spec number as the scope. Light and trivial changes add `Refs: #N`.
- Each spec has a `tests.lock` file.
- Gate 3 is Brad pressing merge. Agents are blocked from merging, and required checks apply to admins too.
- The private-term list never enters the public repo. The check reads it locally and from a CI secret.

The last item changes the agreement's wording.

## More information

- Decided by: Brad Thome, by approving the draft.
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
