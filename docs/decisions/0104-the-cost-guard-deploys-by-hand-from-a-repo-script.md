---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D104
---

# The cost guard deploys by hand from a repo script

## Context and problem statement

The cost guard can unlink the project's billing. Should CI deploy it on each merge, or should it be deployed by hand?

## Decision drivers

- [D91](0091-preview-channels-on-the-live-firebase-project.md) already accepted that CI's preview identity could reach the live site. A deployer for the guard would add another reach.
- The guard changes rarely.

## Considered options

The options are listed in the builder's ranked order.

1. By hand, from a repo script (recommended)
2. CI on merge to main, signed in without a key and limited to main

## Decision outcome

Chosen option: "By hand, from a repo script", as recommended. `pnpm cost-guard:deploy` deploys only the guard, only to `bradthome`, and only from a clean checkout of a commit on `origin/main`, apart from a dry-run deploy. The agent runs it with Brad's Google login after Brad's go-ahead. CI gets no new permission.

### Consequences

- Good, because no pull request or workflow can change the guard or its settings.
- Bad, because the deployed guard can drift from main if a change merges without a redeploy. Spec 004's plan names the redeploy as a task after the merge.

### Confirmation

Spec 004's tests check that no workflow deploys the guard, and that the script refuses an unclean checkout or a commit off main.

## Pros and cons of the options

### By hand, from a repo script

- Good, because CI keeps the permissions it has.
- Bad, because a redeploy is a manual step.

### CI on merge to main

- Good, because main and the deployed guard can't drift.
- Bad, because CI gains an identity that can change the guard.

## More information

- Decided by: Brad Thome, in the slice 2.2 session, 2026-11-03.
