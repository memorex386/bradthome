---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D44
---

# An export script brings public facts in

## Context and problem statement

**The question:** How do public facts get from Brad's private notes to the site?

Keeps private and interview-only facts out of the public repo.

## Considered options

The options are listed in the builder's ranked order.

1. An export script in Brad's private notes that opens a pull request (recommended, chosen)
2. Copy by hand, with review
3. A git submodule

## Decision outcome

Chosen option: "An export script in Brad's private notes that opens a pull request".

An export script in the private career notes copies public facts into the site's content files and opens a pull request for Brad to review. It copies only facts tagged public, and only the allowed fields. A strict schema rejects anything else, and a fact with no tag counts as private.

## More information

- Decided by: Brad Thome, on the foundation decision page (R10).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
