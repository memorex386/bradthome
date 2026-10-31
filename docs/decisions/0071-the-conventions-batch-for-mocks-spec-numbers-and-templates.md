---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D71
---

# The conventions batch for mocks, spec numbers and templates

## Context and problem statement

**The question:** Approve the conventions batch from the review?

Tier-2 batch. The canvas and the decision pages are private, so public specs can't link them, and slice 1.3 is the first full-track slice.

## Considered options

The options are listed in the builder's ranked order.

1. Approve all three (recommended, chosen)
2. Approve all except the ones I name below
3. Discuss each one

## Decision outcome

Chosen option: "Approve all three".

The conventions batch from slice 1.2's review is approved:
- A spec commits its mock screenshots or an export under `specs/NNN-name/mocks/`, and links Brad's approving review or comment on GitHub.
- Full-track work follows Spec Kit: the spec folder and branch are `NNN-short-name`, numbered in the order specs are created, and each spec names its slice. Light and trivial changes use `slice/N.N-short-name`, or `fix/short-name` outside a slice.
- The decision template gets a "Decided by" line, and the pull request template gets the hand-run checks until CI exists.

## More information

- Decided by: Brad Thome, on the slice 1.2 decision page (Q5).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
