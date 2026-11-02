---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the reviewer agent
informed: []
tier: 1
log-id: D88
---

# Lock regression tests for slice 1.4's review fixes

## Context and problem statement

Slice 1.4's review led to three code fixes inside spec 002: the commits job skips the format of merge commits, Dependabot's exemptions apply only on a pull request Dependabot opened, and the ruleset check ignores parameters GitHub lists at their empty defaults. None had a test, and spec 002's tests are locked. [D87](0087-ci-jobs-that-print-pull-request-text-hide-private-terms.md) meant re-locking them anyway. May the re-lock also add regression tests for these fixes?

## Decision drivers

- A locked test changes only with Brad's approval ([D21](0021-lock-tests-written-from-approved-scenarios.md)), even when it only adds tests.
- A fix without a test can be undone by a later change without CI noticing.

## Considered options

The options are listed in the reviewer's session's ranked order.

1. Yes, add them in the same re-lock (recommended)
2. No, keep the hand checks

## Decision outcome

Chosen option: "Yes, add them in the same re-lock", the recommended option. Brad added no note.

- `tests/002/integration/review-fixes.test.ts` adds five tests under S2.5, S3.1, S3.2 and S5.3. No existing test or spec text changes for them.

### Consequences

- Good, because each fix is now held by a test that fails without it.
- Bad, because spec 002's lock changes a second time in the review.

### Confirmation

Four of the five tests fail against the scripts as they were before the fixes, and all pass after them. The fifth checks that a set parameter the file leaves out is still a difference. `pnpm lock specs/002-ci-and-rulesets --check` matches.

## More information

- Decided by: Brad Thome, on slice 1.4's review decision page, question Q8, on 2026-11-02.
