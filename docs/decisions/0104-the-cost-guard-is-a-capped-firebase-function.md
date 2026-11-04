---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D104
---

# The cost guard is a capped Firebase function

## Context and problem statement

Slice 2.2 builds D57's disaster stop: a function that unlinks billing from the `bradthome` project when a month's spend reaches $25. What should it run on? Brad asked whether Google Cloud is needed at all when the site is on Firebase. A Firebase project is a Google Cloud project, and budgets, Pub/Sub and the billing link exist only in Google Cloud, so the question is how to run the function.

## Decision drivers

- Brad's only concern is runaway cost, so the guard must not cost anything itself.
- Industry standard by default ([D50](0050-industry-standard-by-default.md)), with one language and one test runner in the repo.
- The repo already pins the Firebase CLI.

## Considered options

The options are listed in the builder's ranked order.

1. Cloud Functions for Firebase (2nd gen) in TypeScript, deployed with the Firebase CLI (recommended)
2. A plain Cloud Run function in TypeScript, deployed with gcloud
3. A Cloud Run function in Python, from Google's sample

## Decision outcome

Chosen option: "Cloud Functions for Firebase in TypeScript". Brad left the choice to the builder, with runaway cost as the one concern. All three run on the same Cloud Run functions underneath and cost the same, and this one keeps the repo to one language and one deploy tool. The function is capped: one instance at most, none kept warm, 256 MiB, a sixth of a vCPU, 60 seconds and no retries, in the `bradthome` project, region `us-central1`.

### Consequences

- Good, because the guard's code is tested with the repo's own Vitest, with simulated notices and a fake billing client.
- Good, because a few notices a day stay inside the free tier, so the guard itself costs nothing in practice.
- Bad, because a Firebase deploy builds in Cloud Build, which needs billing, so the guard can't be redeployed while billing is unlinked.

### Confirmation

Spec 004's tests read the exported function's settings and fail if a cap is lifted.

## Pros and cons of the options

### Cloud Functions for Firebase in TypeScript

- Good, because it uses the CLI and language the repo already has.
- Bad, because it adds two Firebase packages to the repo.

### A plain Cloud Run function in TypeScript

- Good, because it has one fewer layer.
- Bad, because it adds gcloud as a second deploy tool.

### A Cloud Run function in Python

- Good, because it's Google's own sample.
- Bad, because it adds a second language and test runner.

## More information

- Decided by: Brad Thome, in the slice 2.2 session, 2026-11-03. Brad left the choice open, with runaway cost as the only worry.
- Evidence, checked on 2026-11-03: [disabling billing with notifications](https://docs.cloud.google.com/billing/docs/how-to/disable-billing-with-notifications), [Cloud Functions for Firebase options](https://firebase.google.com/docs/functions/manage-functions).
