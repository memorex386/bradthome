---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D117
---

# Main deploys to the `next` channel on every push

## Context and problem statement

[D58](0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md) says phase 3 merges into main and deploys to a preview channel named `next` until the v2.0 relaunch. Each pull request gets its own `pr-N` channel ([D91](0091-preview-channels-on-the-live-firebase-project.md)), and spec 008 releases tags to live, but nothing deploys main to `next`. How should main reach it?

## Decision drivers

- Brad should be able to see the redesign as merged, from a phone, at one address.
- No new Google sign-in or key ([D91](0091-preview-channels-on-the-live-firebase-project.md)). The preview's identity is bound to this repo's runs, not to pull requests.
- Never the live channel (spec 003's FR-017).

## Considered options

The options are listed in the builder's ranked order.

1. A workflow that deploys main to `next` on every push (recommended)
2. The same workflow, run only by hand
3. No `next` channel yet, and review on each pull request's preview

## Decision outcome

Chosen option: "A workflow that deploys main to `next` on every push". It's the address D58 promised, it's always current, and it needs no Google Cloud change.

- A new `next` workflow runs on each push to main. It builds main and deploys it to the channel `next`, with the preview's noindex config and keyless sign-in.
- Hosting caps a channel's life at 30 days, so `next` expires 30 days after the last push, and each push renews it.
- It sits outside the gate, like the preview, and never names the live channel.

### Consequences

- Good, because `next` always shows main, without anyone starting it.
- Neutral, because each push adds one version to Hosting's storage, inside the free allowance.
- Bad, because a month with no push lets the channel expire, until the next push brings it back.

### Confirmation

Spec 009's tests check the workflow's trigger, channel, expiry, sign-in and noindex config, and spec 003's tests still find no workflow that deploys to live.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.1 session.
