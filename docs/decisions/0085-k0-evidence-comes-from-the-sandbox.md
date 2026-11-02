---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D85
---

# K0's evidence comes from the sandbox

## Context and problem statement

Spec 002's locked evidence test asked for a row citing a successful CI run of pull request #6 itself (K0). Every run of #6 runs that same test, so no run could pass until the evidence file already cited a passing one. The evidence couldn't be finished honestly as the test stood, and a locked test changes only with Brad's approval ([D21](0021-lock-tests-written-from-approved-scenarios.md)). How should the evidence show K0?

## Decision drivers

- The evidence has to be true when it's committed ([D78](0078-the-conventions-batch-for-tests-locks-and-machine-setup.md), [D82](0082-the-conventions-batch-for-building-ci.md)).
- Brad should see a green gate on #6 at Gate 3, as the ruleset will require from slice 1.5.

## Considered options

The options are listed in the builder's ranked order.

1. K0 cites the sandbox's clean run of this branch, and #6 shows its own green gate (recommended)
2. K0 cites the #6 run where only this one check failed
3. Keep the test, and add the K0 row after #6 merges

## Decision outcome

Chosen option: "K0 cites the sandbox's clean run of this branch, and #6 shows its own green gate", the recommended option. Brad added no note.

- The evidence's K0 row links a passing run in the private CI sandbox, which runs this branch's exact files.
- Pull request #6 turns green on the push that adds the evidence, and Brad sees that on #6 itself.

### Consequences

- Good, because the evidence is true when it's committed, and nothing waits for after the merge.
- Bad, because the K0 row's run is the sandbox's, not this repo's. #6's own checks show the rest.

### Confirmation

`tests/002/static/evidence.test.ts` checks that the K0 row links a sandbox run with result `success`. The plan's K0 row says where it's recorded.

## More information

- Decided by: Brad Thome, on slice 1.4's build decision page, question Q5, on 2026-11-02.
- Changes: the locked evidence test, and the K0 row of [the plan's](../../specs/002-ci-and-rulesets/plan.md) table of mock states.
