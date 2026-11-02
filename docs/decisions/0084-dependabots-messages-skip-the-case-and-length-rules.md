---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D84
---

# Dependabot's messages skip the case and length rules

## Context and problem statement

Slice 1.4's first Dependabot pull request, in the CI sandbox, failed the commits job. Dependabot writes subjects such as `build(deps-dev): Bump …` with a capital letter, which the shared commitlint rules reject, and its group titles can run past the 100-character limit. Spec 002 exempted Dependabot from the spec-or-issue rule only. No Dependabot setting controls the case. Should its commits and titles skip the case and length rules too?

## Decision drivers

- Dependabot's pull requests have to be able to pass the gate ([D81](0081-the-conventions-batch-for-ci-and-the-ruleset.md)).
- Everyone else keeps the full convention ([D77](0077-the-tooling-batch-for-slice-1-3.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Exempt Dependabot from subject-case and header length too (recommended)
2. Allow a capitalised subject for everyone
3. Keep the rules, and fix each Dependabot title by hand

## Decision outcome

Chosen option: "Exempt Dependabot from subject-case and header length too", the recommended option. Brad added no note.

- Commits whose author is Dependabot, and the titles of pull requests Dependabot opened, skip the `spec-or-issue`, `subject-case` and `header-max-length` rules.
- They still need a type, such as `build`, and still pass the term, address and secret checks.

### Consequences

- Good, because Dependabot's pull requests can pass the gate.
- Good, because every other commit keeps the full convention, in the hooks and in CI.
- Bad, because main gets an occasional capitalised "Bump" in a squash commit's title.

### Confirmation

Spec 002's S3.2 and FR-010 name the exemption. A commits test shows Dependabot's capitalised, long title passing, and the same message from anyone else failing.

## More information

- Decided by: Brad Thome, on slice 1.4's build decision page, question Q4, on 2026-11-02.
- Found in: the CI sandbox's first Dependabot run, recorded in [the evidence](../../specs/002-ci-and-rulesets/evidence/ci-runs.md).
- Changes: [spec 002](../../specs/002-ci-and-rulesets/spec.md), S3.2 and FR-010.
