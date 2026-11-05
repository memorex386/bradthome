---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D149
---

# Spec 002 lets the previews workflow open its pull request

## Context and problem statement

Spec 002's locked FR-015 check allowed `pull-requests: write` only in the preview's comment job. The refresh's App token needs it to open its pull request (D146).

## Considered options

The options are listed in the builder's ranked order.

1. Amend FR-015 to let the previews workflow ask its App's token for it, and relock spec 002 (recommended)
2. Keep spec 002, push a branch and have Brad open each pull request by hand

## Decision outcome

Chosen option 1. FR-015 now says no workflow merges or approves a pull request, only the preview's comment job holds `pull-requests: write`, and only the previews workflow asks its App's token for it. `tests/002/static/dependabot.test.ts` allows that one line, and spec 002 was relocked.

### Consequences

- Good, because the refresh opens its own pull request, and the check still fails any merge, approval or automatic merge.
- Bad, because one more workflow can write to pull requests, through an App's token. Merging still needs Brad's approval as code owner.

### Confirmation

`pnpm lock --check` passes on spec 002, and its static check runs in every CI run.

## More information

- Decided by: Brad Thome, on the slice 3.8 session's card, 2026-11-05.
