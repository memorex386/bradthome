---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D83
---

# Accept Dependabot's sign-off in CI

## Context and problem statement

Slice 1.4's first Dependabot pull request, in the CI sandbox, failed the privacy job. Dependabot ends every commit with a `Signed-off-by` trailer carrying GitHub's public support address, and spec 001's trailer rule allows only GitHub noreply addresses, brad@bradthome.com and Claude's co-author address ([D16](0016-brads-own-commits-use-brad-bradthome-com.md), [D43](0043-a-separate-github-account-for-the-agent.md)). So the gate would fail every Dependabot pull request, and from slice 1.5 the ruleset would block them all. The address isn't a person's, but the rule is a privacy rule. Should the privacy check accept it?

## Decision drivers

- Dependabot's pull requests have to be able to pass, or the weekly updates stop at slice 1.5 ([D81](0081-the-conventions-batch-for-ci-and-the-ruleset.md)).
- The address rule keeps personal addresses out of a history that will be public, so an exception stays as narrow as it can.
- Dependabot writes the trailer itself. No setting changes it.

## Considered options

The options are listed in the builder's ranked order.

1. Accept it only in the sign-off of a commit Dependabot authored (recommended)
2. Accept it as a trailer address everywhere
3. Keep the rule, and read Dependabot's privacy failures by hand

## Decision outcome

Chosen option: "Accept it only in the sign-off of a commit Dependabot authored", the recommended option. Brad also asked whether the repo should have its own noreply address. It can't stand in here, since Dependabot writes the sign-off with GitHub's address whatever the repo uses.

- The privacy job accepts GitHub's support address only in a `Signed-off-by` trailer, and only on a commit whose author is Dependabot's own noreply address.
- Every other commit, and every other trailer on Dependabot's commits, keeps spec 001's rule. The git hooks don't change, since they never check Dependabot's commits.

### Consequences

- Good, because Dependabot's pull requests can pass the gate, before and after slice 1.5.
- Good, because the exception covers one trailer on one author's commits, so a person's commit can't use it.
- Bad, because the address rule has an exception to remember, in CI only.

### Confirmation

Spec 002's S2.5 and FR-006 name the exception. A privacy test shows Dependabot's sign-off passing on its own commit and failing on anyone else's.

## More information

- Decided by: Brad Thome, on slice 1.4's build decision page, question Q3, on 2026-11-02.
- Found in: the CI sandbox's first Dependabot run, recorded in [the evidence](../../specs/002-ci-and-rulesets/evidence/ci-runs.md).
- Changes: [spec 002](../../specs/002-ci-and-rulesets/spec.md), S2.5 and FR-006.
