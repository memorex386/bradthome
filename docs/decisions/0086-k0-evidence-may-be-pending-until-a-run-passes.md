---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D86
---

# K0's evidence may be pending until a run passes

## Context and problem statement

[D85](0085-k0-evidence-comes-from-the-sandbox.md) moved K0's evidence to the CI sandbox, but that alone didn't make the evidence test passable. A sandbox run of this branch runs the same test, so it couldn't pass until the evidence cited a passing run, and no run could pass first. The builder raised this as its own question after D85, correcting the option it had offered there. What should the locked evidence test demand of the K0 row?

## Decision drivers

- The evidence has to be true at every commit ([D78](0078-the-conventions-batch-for-tests-locks-and-machine-setup.md), [D82](0082-the-conventions-batch-for-building-ci.md)).
- The test should still check K0's row, so it can't go missing.

## Considered options

The options are listed in the builder's ranked order.

1. The test checks the K0 row's shape, and the row is filled once a run passes (recommended)
2. Drop the K0 row from the test, and show K0 on #6 itself
3. Accept a run where only this one check failed

## Decision outcome

Chosen option: "The test checks the K0 row's shape, and the row is filled once a run passes", the recommended option. Brad added no note.

- The evidence test still wants a K0 row linking a sandbox run, with the result `pending` or `success`.
- The first commit with the evidence says pending. Once a sandbox run of that commit passes, the next commit cites it as success.

### Consequences

- Good, because there's a first green run, and the evidence is true at every commit.
- Bad, because the test no longer insists on success, so the final row's word is checked by review.

### Confirmation

`tests/002/static/evidence.test.ts` checks the K0 row for a sandbox link and `pending` or `success`. The committed evidence says success, with its run.

## More information

- Decided by: Brad Thome, on slice 1.4's build decision page, question Q6, on 2026-11-02.
- Amends: [D85](0085-k0-evidence-comes-from-the-sandbox.md), which still sets where K0's run comes from.
