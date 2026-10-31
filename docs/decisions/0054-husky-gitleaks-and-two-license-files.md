---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D54
---

# husky, gitleaks and two license files

## Context and problem statement

**The question:** Switch three approved tools to the industry standard

Applies [D50](0050-industry-standard-by-default.md) to choices already approved. Updates [D42](0042-mit-for-code-all-rights-reserved-for-content.md), [D45](0045-a-private-term-script-plus-a-secret-scanner.md) and [D47](0047-the-repo-and-tooling-batch.md).

## Considered options

The options are listed in the builder's ranked order.

1. Switch all three (recommended, chosen)
2. Switch all except the ones I name below
3. Keep the approved tools

## Decision outcome

Chosen option: "Switch all three".

Three tools switch to the industry standard:
- husky replaces lefthook.
- gitleaks replaces Betterleaks.
- Two plain license files (an MIT LICENSE, plus a LICENSE-CONTENT file and a README note) replace the REUSE spec.

## More information

- Decided by: Brad Thome, on the foundation decision page (F4).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
