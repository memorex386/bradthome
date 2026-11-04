---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D121
---

# Spec 002 lets the `next` deploy sign in

## Context and problem statement

[D117](0117-main-deploys-to-the-next-channel-on-every-push.md) adds a workflow that deploys main to the `next` channel. Its deploy job signs in to Google with GitHub's identity token, which needs `id-token: write`. Spec 002's locked workflow test allows a write permission only in the jobs its FR-014 names, as [D114](0114-specs-002-and-003-make-room-for-the-release-workflows.md) did for the release workflows. How should slice 3.1 handle it?

## Decision drivers

- A locked test changes only with a spec change Brad approves, in the same pull request ([D101](0101-a-lighter-loop-one-session-and-two-gates.md)).
- The rule stays strict: one more named job, and nothing else.

## Considered options

The options are listed in the builder's ranked order.

1. Amend spec 002's FR-014 and its permission list to name `next.yml`'s deploy job, and relock (recommended)
2. Ship slice 3.1 without the `next` workflow, and add it in a follow-up light change

## Decision outcome

Chosen option: "Amend spec 002's FR-014 and its permission list, and relock". FR-014 names `next.yml`'s deploy job, which may hold `id-token: write`. The workflow test's list of allowed writes gains that one entry, and spec 002 is relocked in slice 3.1's pull request.

### Consequences

- Good, because `next` ships with the slice that needs it, and the rule still names every job that may write.
- Bad, because a locked test changes again.

### Confirmation

`pnpm lock specs/002-ci-and-rulesets --check` passes with the new hash, and spec 002's workflow test passes with `next.yml` in the folder.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.1 session, with Gate 1.
