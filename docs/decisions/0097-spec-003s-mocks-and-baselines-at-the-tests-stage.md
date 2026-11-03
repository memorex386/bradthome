---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D97
---

# Spec 003's mocks match the plan, and its baselines sit outside the lock

## Context and problem statement

Writing spec 003's tests, a fresh-context review found four places where the approved mocks or plan couldn't be tested as written. C0 showed 19 checks, but the plan's preview has three jobs, so a pull request shows 21. C3 and C4 counted differently from what they listed. C1's fix named `pnpm test:e2e`, which runs only inside the pinned container. And the plan put the snapshot baselines in `tests/003/`, which the lock covers, while the build makes them. Each needed a change to an approved document before the tests lock.

## Decision drivers

- Locked tests check the mocks' words exactly, so the mocks must be right.
- The preview keeps the least-privilege split the plan approved.
- A fix line must name a command that works where it's read.
- The build and later visual changes must be able to add baselines without a relock.

## Considered options

Four questions, each with the options in the builder's ranked order.

1. C0: show 21 checks (recommended), or run the preview as one job to keep 19.
2. C3 and C4: correct the mocks' counts (recommended), or leave them as illustrations and drop "in the mock's words" from the tests.
3. C1: name `pnpm test:visual` (recommended), or make `pnpm test:e2e` start the container itself.
4. Baselines: outside the lock in `tests/snapshots/003/` (recommended), or inside `tests/003/`.

## Decision outcome

Brad chose the recommendation for each, on the tests stage's decision page.

- C0 lists 21 checks, adding `preview / build` and `preview / comment`.
- C3 reads "2 budgets missed" and C4 reads "1 problem".
- C1's fix reads "pnpm test:visual, then adjust the dark accent token…".
- The baselines live in `tests/snapshots/003/`, outside the locked folder.

### Consequences

- Good, because the tests match the mocks word for word, and C0's test now compares the mock's list with the workflows' jobs.
- Good, because the build adds the first baselines without stopping to relock, and Brad still reviews each new baseline as an image in its pull request.
- Bad, because a baseline can change without a spec change, so the pull request review is its only check.
- Neutral: `pnpm test:visual` runs every end-to-end test, though its name says visual.

### Confirmation

Spec 003's tests read the mocks: `tests/003/unit/gate-jobs.test.ts` checks C0's 21 checks against `ci.yml`, `locked-tests.yml` and `preview.yml`, and `tests/003/unit/messages.test.ts` checks C1, C3 and C4 in the mocks' words. `playwright.config.ts` writes baselines to `tests/snapshots/003/`.

## More information

- Decided by: Brad Thome, on the decision page for slice 2.1's tests stage, 2026-11-03.
- Spec: [003, skeleton and pipeline](../../specs/003-skeleton-and-pipeline/spec.md), its [mocks](../../specs/003-skeleton-and-pipeline/mocks/README.md) and [plan](../../specs/003-skeleton-and-pipeline/plan.md).
