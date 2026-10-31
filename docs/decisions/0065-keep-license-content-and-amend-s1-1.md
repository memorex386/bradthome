---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D65
---

# Keep LICENSE-CONTENT and amend S1.1

## Context and problem statement

**The question:** How should GitHub show the two license files?

The review found that GitHub shows any root `LICENSE-*` file as a second license ("MIT, License licenses found"), checked on a repo with the same two files. That's accurate, since the content is licensed differently, and it keeps [D54](0054-husky-gitleaks-and-two-license-files.md)'s two-file pattern.

## Considered options

The options are listed in the builder's ranked order.

1. Keep LICENSE-CONTENT and amend S1.1 (recommended, chosen)
2. Rename it to CONTENT-NOTICE.md

## Decision outcome

Chosen option: "Keep LICENSE-CONTENT and amend S1.1".

Keep LICENSE-CONTENT, and amend S1.1: GitHub's license API reports MIT from LICENSE, and the repo sidebar also lists LICENSE-CONTENT as a second license.

## More information

- Decided by: Brad Thome, on the slice 1.1 decision page (Q3).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
