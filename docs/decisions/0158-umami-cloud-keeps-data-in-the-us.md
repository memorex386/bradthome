---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D158
---

# Umami Cloud keeps the data in the US

## Context and problem statement

Umami Cloud stores analytics in a US or an EU region, chosen when the account is created and fixed after.

## Considered options

1. US (chosen)
2. EU

## Decision outcome

Chosen option 1, US, where most of the site's visitors are. What's collected is the same in either region: no cookies, and no network address in the records. The privacy note names the region.

### Consequences

- Good, because the data sits where the audience is, and the note can say plainly where.
- Bad, because the region can't change later without a new account.

### Confirmation

The account's settings show the US region, and spec 018's static test checks the note names it.

## More information

- Decided by: Brad Thome, on the slice 3.10 session's card, 2026-11-05. The builder first recommended EU, for GDPR's stricter rules, and Brad chose US.
