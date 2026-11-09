---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D192
---

# Eval runs happen only in CI

## Context and problem statement

The chat's evals call a real model in the `bradthome-evals` workspace ([D169](0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md)), with the key Brad stored as the repo secret `ANTHROPIC_EVALS_KEY`. An agent never sees a secret value. Where do eval runs happen, so the key never reaches the agent?

## Decision drivers

- The key never reaches an agent's machine, prompt or log.
- A run is repeatable, and its results are the ones the site shows.

## Considered options

The options are listed in the builder's ranked order.

1. CI only (recommended): a workflow reads the secret, runs the suites and uploads the results JSON as an artifact, which the builder downloads and commits.
2. CI, plus Brad's own terminal with the key in Brad's shell.

## Decision outcome

Chosen option 1, as recommended. The `evals` workflow is the only place the key is read. It runs `pnpm evals`, uploads `evals/results.json` and fails when a must-pass case fails. Nobody runs the evals on a machine.

### Consequences

- Good, because the key stays in GitHub's encrypted secrets.
- Bad, because each run takes a push and a few minutes in CI.

### Confirmation

Spec 023's tests check the workflow reads the key only in the step that runs the evals, and that the runner refuses to start without it.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.4 session, 2026-11-09.
