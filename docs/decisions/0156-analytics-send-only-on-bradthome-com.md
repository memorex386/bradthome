---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D156
---

# Analytics send only on bradthome.com

## Context and problem statement

Previews and the `next` channel serve the same build as production will, and must never count as real visits.

## Considered options

The options are listed in the builder's ranked order.

1. Send nothing unless the page's host is exactly `bradthome.com` (recommended, chosen)
2. Send previews and `next` to a separate test website in Umami

## Decision outcome

Chosen option 1. The sender checks `location.hostname === 'bradthome.com'` before it wires anything. Tests run against a fake Umami.

### Consequences

- Good, because nothing needs setting up for previews, and Umami's free plan allows only one website.
- Bad, because nothing exercises the real Umami before v2.0; the first real request is on live. The tests' fake follows Umami's documented API.

### Confirmation

Spec 018's S2.1 checks no request leaves a preview, `next` or a local host.

## More information

- Decided by: Brad Thome, on the slice 3.10 session's card, 2026-11-05.
