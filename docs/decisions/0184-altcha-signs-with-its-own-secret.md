---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D184
---

# ALTCHA signs with its own secret

## Context and problem statement

ALTCHA's challenges are signed with an HMAC key, and the API checks the signature when a question comes back ([D172](0172-altcha-proof-of-work-is-the-chats-bot-check.md)). Either of the 2 instances may check a challenge the other issued, so the key must be shared, and it must stay secret. Where does it come from?

## Decision drivers

- Secret values never reach the agent.
- Industry standard by default ([D50](0050-industry-standard-by-default.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Its own Secret Manager secret, whose value Brad adds (recommended)
2. Derived one way from the chat's Anthropic key

## Decision outcome

Chosen option 1, as recommended. The `bradthome` project holds two secrets, `chat-anthropic-key` and `chat-altcha-key`, each readable only by the API's service account. The agent creates both empty, and Brad adds each first version in the Cloud Console: the Anthropic key, and a long random string for ALTCHA. The API reads both at start-up and never logs either.

### Consequences

- Good, because each secret can be rotated on its own.
- Bad, because it's one more step for Brad, and about $0.06 a month.

### Confirmation

The deploy script reads the service's settings and fails unless both secrets are mounted from Secret Manager, and spec 021's tests show a challenge signed with another key is refused.

## Pros and cons of the options

### Its own secret

- Good, because it's the standard pattern.

### Derived from the Anthropic key

- Good, because it needs no second secret.
- Bad, because it's less standard, and rotating the Anthropic key would void challenges in flight.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.2 session, 2026-11-08.
- Evidence, checked 2026-11-08: [Secret Manager pricing](https://cloud.google.com/secret-manager/pricing), [Cloud Run secrets](https://cloud.google.com/run/docs/configuring/services/secrets).
