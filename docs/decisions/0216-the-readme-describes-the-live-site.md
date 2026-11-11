---
status: accepted
date: 2026-11-11
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D216
---

# The README describes the live site and how a change is made

## Context and problem statement

The footer's "Built in the open" line links the repo (D210), so the README is the first page a visitor from the site reads. It said the live site was v0, a one-day prototype, and that the repo held the groundwork rather than the site, and it opened with the agent's GitHub account, whose profile is gone while the account is suspended (D160). What should the README say?

## Decision drivers

- A visitor from the footer should learn what's live, what it's built with, how a change is made and where to look, in a few minutes.
- The process is Brad's, and Brad's approvals are its gates; nothing says Brad is "one engineer", runs "a team of AI agents" or works "solo", or that agents run the site.
- Every sentence can be checked in the repo.

## Considered options

For the wording, in the builder's ranked order:

1. As drafted: what's live, what it's built with, how a change is made (spec, tests, build, a second reviewer, Brad's push, a release Brad approves with a rollback ready), where to look, license and security (recommended)
2. The same, trimmed to what's live, how a change is made and where to look

For the agent account's suspension:

1. No mention: the README says how work lands today, and D160 and D161 keep the history (recommended)
2. One plain line with the dates and the two records

## Decision outcome

Chosen: the wording as drafted, with no mention of the suspension, both as recommended, on the session's card of 2026-11-11. Brad also chose to push the README to main on its own, ahead of the rest of slice 5.8, as `add7141`.

### Consequences

- Good, because the footer's link now lands on an accurate account of the site and its process.
- Good, because how work lands today is the loop's fifth step, and the history stays in the decisions.
- Bad, because the README names v2.5 and must change with each release that changes what's live.

### Confirmation

Spec 033's tests read the README for the labels the site avoids, and the release records step updates its "What's live" line.

## More information

- Decided by: Brad Thome, on the site-build-story session's card, 2026-11-11.
- Spec: [spec 033](../../specs/033-site-build-story/spec.md).
