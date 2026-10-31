---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D45
---

# A private-term script plus a secret scanner

## Context and problem statement

**The question:** How is the private-term list enforced?

[D27](0027-the-conventions-batch-for-templates-ids-and-records.md) keeps the term list out of the repo. GitHub's free scanning can't use custom terms, and CI logs are public. Follow-up F4 proposes gitleaks instead of Betterleaks.

## Considered options

The options are listed in the builder's ranked order.

1. A small script plus Betterleaks (recommended, chosen)
2. Betterleaks alone, with the terms in a config kept outside the repo
3. Rely on GitHub's push protection

## Decision outcome

Chosen option: "A small script plus Betterleaks".

Private terms are caught by a small script plus Betterleaks, run before each push and as a required check.

The script scans tracked files, staged changes and the built site for terms it reads from the private notes locally and from a CI secret. It masks each term in the logs and prints only the file and line. Betterleaks scans for secrets.

## More information

- Decided by: Brad Thome, on the foundation decision page (R11).
- Later: [D54](0054-husky-gitleaks-and-two-license-files.md) replaced Betterleaks with gitleaks.
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
