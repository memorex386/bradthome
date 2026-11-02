---
status: accepted
date: 2026-11-01
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D81
---

# The conventions batch for CI and the ruleset

## Context and problem statement

Slice 1.4 adds CI, Dependabot and main's ruleset. [D47](0047-the-repo-and-tooling-batch.md), [D49](0049-the-ci-and-safety-batch.md) and [D55](0055-split-the-required-checks-by-determinism.md) settle most of it. Five conventions were left open, and they came to Brad as one batch.

## Considered options

The options are listed in the builder's ranked order.

1. Approve all (recommended)
2. Approve all except the ones Brad names
3. Discuss each one

## Decision outcome

Chosen option: "Approve all", the recommended option. Brad added no note.

The conventions batch for slice 1.4 is approved:
- The tests run on Ubuntu and Windows. The hooks run on Brad's Windows PC, and Ubuntu covers the Linux case spec 001 left open (FR-029).
- Only Brad's approval counts. CODEOWNERS names Brad for every file, and the ruleset requires a code owner's approval, so an approval from the agent's account doesn't satisfy it. With no bypass, GitHub won't let Brad approve a pull request Brad opened, so Brad's changes go through the agent, or through a logged decision that changes the ruleset.
- The private-term list reaches CI as two secrets, one for Actions and one for Dependabot, since Dependabot's pull requests can't read Actions secrets. Each is set from the file on Brad's PC with one approved command, and the agent never sees the terms ([D27](0027-the-conventions-batch-for-templates-ids-and-records.md)).
- Dependabot runs weekly, with one grouped pull request for the packages and one for the Actions, and waits 3 days after a release before proposing it.
- The repo allows only squash merges, keeps auto-merge off, and deletes branches after merging.

## More information

- Decided by: Brad Thome, on the slice 1.4 decision page (Q2).
- Spec: [002, CI and rulesets](../../specs/002-ci-and-rulesets/spec.md).
