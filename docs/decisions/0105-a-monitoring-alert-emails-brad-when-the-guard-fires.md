---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D105
---

# A Monitoring alert emails Brad when the guard fires

## Context and problem statement

When the cost guard unlinks billing, the site goes down. How does Brad hear about it?

## Decision drivers

- A stopped site Brad doesn't know about is an outage.
- Every paid service has a cap ([D57](0057-six-layers-of-cost-stops.md)), and Brad's concern is runaway cost.
- No email address may enter the public repo.

## Considered options

The options are listed in the builder's ranked order.

1. A Cloud Monitoring log alert that emails Brad (recommended)
2. The budget's $25 email alone, plus the function's logs

## Decision outcome

Chosen option: "A Cloud Monitoring log alert", as recommended. One alert policy with one condition matches the guard's `cost-guard` log lines for an unlink, a dry-run unlink or a failed call, and emails Brad's notification channel at most once every 5 minutes. Brad's address is stored only in Google Cloud.

### Consequences

- Good, because Brad hears within minutes, and also hears when the unlink call fails.
- Bad, because Google charges for alert conditions from May 2026, about $0.10 a month for this one. The interview's card called the alert free, which was wrong, and the builder corrected it at Gate 1.

### Confirmation

Spec 004's live check publishes one simulated over-budget notice in dry-run and records the email arriving within 15 minutes.

## Pros and cons of the options

### A Cloud Monitoring log alert

- Good, because it covers a failed unlink as well as a successful one.
- Bad, because it's one more setting to keep, at a small monthly cost.

### The budget's email alone

- Good, because nothing new is set up.
- Bad, because a failed unlink would go unnoticed.

## More information

- Decided by: Brad Thome, in the slice 2.2 session, 2026-11-03.
- Evidence, checked on 2026-11-03: [Google Cloud Observability pricing](https://cloud.google.com/monitoring/pricing), [managing alerting costs](https://cloud.google.com/monitoring/alerts/cost-control).
