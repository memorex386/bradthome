---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D157
---

# Do Not Track and Global Privacy Control turn analytics off

## Context and problem statement

Umami counts visits without cookies and identifies no one, but a browser can still ask not to be tracked, with Do Not Track or Global Privacy Control. Umami's tracker offers a switch for Do Not Track only.

## Considered options

The options are listed in the builder's ranked order.

1. Honor both, sending nothing, page views included (recommended, chosen)
2. Honor Do Not Track only, as Umami's switch does
3. Honor neither

## Decision outcome

Chosen option 1. The sender sends nothing when `navigator.doNotTrack` is `"1"` or `navigator.globalPrivacyControl` is `true`, and the privacy note says so.

### Consequences

- Good, because a visitor's stated choice is kept, whatever the signal.
- Bad, because counts are a little lower.

### Confirmation

Spec 018's S2.3 sets each signal and checks no request goes to Umami.

## More information

- Decided by: Brad Thome, on the slice 3.10 session's card, 2026-11-05.
