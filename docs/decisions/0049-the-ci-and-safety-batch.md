---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D49
---

# The CI and safety batch

## Context and problem statement

**The question:** Approve the CI and safety batch

Brad asked to work the way a real company would, as closely as possible, and is fine with slow checks being required. Follow-up F5 proposed that every check that gives the same result each time is required, however long it takes, and that only checks that can fail for reasons outside the pull request run nightly.

## Considered options

The options are listed in the builder's ranked order.

1. Approve all (recommended, chosen)
2. Approve all except the ones I name below
3. Discuss each one

## Decision outcome

Chosen option: "Approve all".

The CI and safety batch (R15) is approved:
- Required checks: gate, traceability, tests-locked and privacy-scan.
- No path filters on required workflows.
- The gate job checks each result.
- The locked-tests check runs from main's workflow and only reads the PR's files.
- Required checks finish in under 10 minutes. Slow checks run nightly.
- LF line endings.
- Node pinned.
- A written plan for leaks.

## More information

- Decided by: Brad Thome, on the foundation decision page (R15).
- Later: [D55](0055-split-the-required-checks-by-determinism.md) split the required checks.
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
