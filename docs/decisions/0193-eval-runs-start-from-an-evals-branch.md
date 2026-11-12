---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D193
---

# Eval runs start from a pushed evals branch

## Context and problem statement

Changes go straight to main after Brad says push ([D161](0161-changes-go-straight-to-main.md)), and main's new check needs a run's results before the slice lands ([D194](0194-a-prompt-or-model-change-needs-a-fresh-eval-run.md)). GitHub only starts a new hand-run workflow once it's on main, but a push to a branch can start one. How do the runs happen before the slice is on main?

## Decision drivers

- Main never holds a prompt or model without its run.
- Pushes to main stay one per change, after Brad's word.

## Considered options

The options are listed in the builder's ranked order.

1. Push an evals branch (recommended): a push to a branch named `evals/*` starts the evals workflow, and nothing else deploys from it.
2. Land the harness on main first, with the fresh-run check passing while no results exist.

## Decision outcome

Chosen option 1, as recommended. The `evals` workflow runs on a push to `evals/**` and by hand. The builder pushes only such a branch to GitHub before the slice's push to main, downloads the run's results and commits them on the slice's branch. The branch is deleted after the release.

### Consequences

- Good, because the slice reaches main with a real run, in one push.
- Bad, because a branch other than main is pushed, which D161 otherwise avoids. It deploys nothing and never merges.

### Confirmation

Spec 023's tests check the workflow's triggers, and that no deploy workflow runs on `evals/**`.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.4 session, 2026-11-09.
- Amended by [D228](0228-evals-run-the-cases-a-change-touches.md), 2026-11-12: a push to an `evals/` branch runs a changed run, only the cases new or edited since the last full run, which needs no card; a full run runs only by hand with `full` set, when Brad asks.
