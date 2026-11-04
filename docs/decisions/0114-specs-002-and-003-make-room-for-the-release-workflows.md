---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D114
---

# Specs 002 and 003 make room for the release workflows

## Context and problem statement

Two locked specs block [D113](0113-releases-run-from-a-tag-behind-brads-approval.md)'s release workflows:

- Spec 002's FR-014 allows a write permission only where a spec names it, and names only the preview's.
- Spec 003's S3.5 says no workflow deploys anything but `pr-N` channels or ever reaches the live channel.

Those were the right rules before a release existed. Slice 2.6 adds one on purpose.

## Decision drivers

- A locked test changes only with its spec, in the same pull request ([D101](0101-a-lighter-loop-one-session-and-two-gates.md)).
- The new exceptions should be as narrow as the old rules: named jobs, not whole files.

## Considered options

1. Amend both specs to name spec 008's jobs, and re-lock them (recommended, chosen).
2. Leave the specs, and keep the release out of `.github/workflows/`.

## Decision outcome

Option 1, approved by Brad with spec 008 at Gate 1 on 2026-11-04.

- **Spec 002's FR-014** lets these jobs hold `id-token: write`: release.yml's `stage` and `release`, and rollback.yml's `rollback`. Its workflow test's list of allowed writes names exactly those.
- **Spec 003's S3.5 and FR-017** keep the preview off the live channel. Only spec 008's release and rollback jobs may release to it, from the `production` environment. A new test in `tests/003/static/preview.test.ts` checks that exactly those two jobs run the release scripts, each in `production`.
- Both specs are re-locked.

### Consequences

- Good, because a workflow that releases to live from anywhere else still fails a locked test.
- Neutral: the stage job deploys to the channel `release`, which isn't a `pr-N` channel. S3.5 now says "channels".

### Confirmation

`tests/002/static/workflows.test.ts`, `tests/003/static/preview.test.ts` and `tests/008/static/workflows.test.ts`.

## More information

- Decided by: Brad Thome, at spec 008's Gate 1 ([issue #29](https://github.com/memorex386/bradthome/issues/29)), 2026-11-04.
