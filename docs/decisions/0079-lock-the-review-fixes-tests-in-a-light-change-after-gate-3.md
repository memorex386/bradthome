---
status: accepted
date: 2026-11-01
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D79
---

# Lock the review fixes' tests in a light change after Gate 3

## Context and problem statement

Slice 1.3's review (stage 7) found four routes the checks missed: gh's repo flag before the verb, a `cd` into the checkout from a session started elsewhere, a merge commit's own changes at pre-push, and an address on a trailer's indented line. Each was fixed in PR #5 and checked from outside the repo, because the spec's tests are locked, and a new locked test needs a spec change Brad approves ([D21](0021-lock-tests-written-from-approved-scenarios.md)). When do the four cases get locked tests?

## Decision drivers

- A fix with no test can be undone by a later change without anyone noticing.
- Locked tests change only with a spec change Brad approves (D21).
- Gate 3 for slice 1.3 shouldn't wait on work that can land safely right after it.

## Considered options

The options are listed in the builder's ranked order.

1. A light change right after Gate 3 (recommended)
2. In PR #5, before Gate 3
3. No locked tests for these

## Decision outcome

Chosen option: "A light change right after Gate 3", the recommended option. Brad added no note. It keeps Gate 3 on time, and the four cases still get locked tests through the usual spec change.

After PR #5 merges, the agent opens a light-change issue from the template. It adds the four cases to spec 001's edge cases with their scenario IDs, writes a test for each in `tests/001/`, and relocks them with `pnpm lock`. Brad approves the issue (Gate 1) and merges the pull request (Gate 3).

### Consequences

- Good, because Gate 3 isn't delayed, and the tests still change only with a spec change Brad approves.
- Bad, because until the light change merges, the four fixes are covered only by the review's evidence in PR #5, so a regression in that window wouldn't fail a test.

### Confirmation

The light change's issue lists the four cases, and its pull request shows a passing locked test for each one, with `pnpm trace` and `pnpm lock --check` passing on spec 001.

## Pros and cons of the options

### A light change right after Gate 3

- Good, because the slice lands now and the tests follow through the normal path.
- Bad, because there's a short window with no test for the fixes.

### In PR #5, before Gate 3

- Good, because the slice lands fully tested.
- Bad, because Gate 3 waits for a fresh session to edit the spec, write the tests and relock them.

### No locked tests for these

- Good, because there's nothing more to do.
- Bad, because a regression would never be caught.

## More information

- Decided by: Brad Thome, on the slice 1.3 review's decision page (Q2).
- Spec: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md). The four cases touch S1.5, S1.8, S2.4, S2.5 and S2.10.
- The review and its evidence: [PR #5](https://github.com/memorex386/bradthome/pull/5), "Review (stage 7)".
