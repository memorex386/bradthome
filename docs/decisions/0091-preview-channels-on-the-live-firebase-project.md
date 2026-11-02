---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D91
---

# Preview channels on the live Firebase project

## Context and problem statement

Slice 2.1 gives every pull request a preview deploy ([D52](0052-firebase-hosting-on-blaze-with-the-api-on-cloud-run.md)). The preview job runs the pull request's own code with a Google sign-in, and Firebase Hosting grants deploy rights per project, not per channel. So an identity that can deploy a preview to the `bradthome` project can also deploy to its live channel, which serves today's site until slice 2.6. Where should the previews deploy?

## Decision drivers

- The hard rules are held by machines, not by trust ([D22](0022-enforce-hard-rules-in-three-layers.md)).
- Industry standard by default ([D50](0050-industry-standard-by-default.md)), and every paid service has a cap ([D53](0053-allow-paid-infrastructure-that-buys-scale.md), [D57](0057-six-layers-of-cost-stops.md)).
- Only Brad and the agent open pull requests ([D47](0047-the-repo-and-tooling-batch.md)), and CODEOWNERS puts every `.github/` change in front of Brad.
- Brad wants the slice to move fast.

## Considered options

The options are listed in the builder's ranked order.

1. A separate preview project on the free Spark plan (recommended)
2. Preview channels on the live project

## Decision outcome

Chosen option: "Preview channels on the live project". Brad added no note. It's what D52 described: one Firebase project, with previews as channels beside the live one, inside the Blaze plan's free allowance and under D57's budget alerts. It adds no project to keep.

### Consequences

- Good, because there's one project, one budget and one set of alerts, and slice 2.6 deploys to the same site the previews test.
- Good, because GitHub signs in without a stored key, and only this repo's runs can use the sign-in.
- Bad, because the identity the preview job uses could also deploy to the live channel. A pull request that changed the workflow could do it before Brad merges. Review, CODEOWNERS and the reviewer stand in the way, not a permission.
- Neutral: previews count against the project's Hosting allowance, 10 GB stored and 10 GB a month served on 2026-11-02, far more than an empty page needs.

### Confirmation

- Spec 003's tests confirm that every workflow deploys only to `pr-N` channels and never to the live channel, and that no Google key is stored in the repo or its secrets.
- The reviewer flags any change to the preview workflow or its sign-in.

## Pros and cons of the options

### A separate preview project on the free Spark plan

- Good, because the pull request's sign-in could never reach the live site, and a project with no billing can't cost anything.
- Good, because separate projects per environment is Firebase's own advice.
- Bad, because it adds a project to keep, with Spark's smaller limits.

### Preview channels on the live project

- Good, because it's simpler and matches D52 as written.
- Bad, because the preview's sign-in can deploy to the live channel.

## More information

- Decided by: Brad Thome, on the slice 2.1 interview page (Q1).
- Evidence, checked on 2026-11-02: [Firebase Hosting IAM roles](https://firebase.google.com/docs/projects/iam/roles-predefined-product), [Hosting usage and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing), [preview channels](https://firebase.google.com/docs/hosting/manage-hosting-resources).
