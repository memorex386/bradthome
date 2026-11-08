---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D185
---

# The chat API deploys by hand, from a repo script

## Context and problem statement

How does a new version of the chat API reach Cloud Run?

## Decision drivers

- No CI account should hold rights that can spend money.
- The same pattern as the cost guard ([D104](0104-the-cost-guard-is-a-capped-firebase-function.md)).

## Considered options

The options are listed in the builder's ranked order.

1. By hand, with `pnpm chat-api:deploy` (recommended)
2. From CI on each push to main

## Decision outcome

Chosen option 1, as recommended. `pnpm chat-api:deploy` builds the API from source with Cloud Build and deploys it to the `chat-api` service in `us-central1`, run on this machine with Brad's gcloud login after Brad says push. It sets and then reads back the caps: 0 to 2 instances, the service account, both secrets and the request timeout, and fails if any differs. CI never deploys it.

### Consequences

- Good, because no CI identity gets Cloud Run or Cloud Build rights.
- Bad, because main and the running API can drift if a deploy is forgotten. The script prints the deployed commit, and the release checklist for v2.1 reads it.

### Confirmation

Spec 021's tests check the script's settings, and no workflow names the service.

## Pros and cons of the options

### By hand

- Good, because it's the least access.

### From CI

- Good, because main and the API never drift.
- Bad, because a deploy identity with Cloud Run admin rights has to be set up and watched.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.2 session, 2026-11-08.
