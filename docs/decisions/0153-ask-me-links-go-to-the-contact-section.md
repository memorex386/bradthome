---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D153
---

# Ask-me links go to the contact section

## Context and problem statement

The ask-me receipts' "Ask Brad about it" links, and the "Ask about Brad" placeholder that waits for the chat in phase 4, opened `mailto:brad@bradthome.com` directly. Where should they go until the chat?

## Considered options

The options are listed in the builder's ranked order.

1. To the contact section, `#contact`, on the same page (recommended)
2. Keep opening the mail app directly

## Decision outcome

Chosen option 1. Every ask-me receipt, and the gallery's "Ask about Brad", link to `#contact`, where the address, its mail link and Copy are.

### Consequences

- Good, because there's one place for contact, and Copy is there when the mail app doesn't open, as in LinkedIn's in-app browser.
- Bad, because writing an email takes one tap more.

### Confirmation

Spec 017's tests check every ask-me link on `/v2`, the role pages and the gallery goes to `#contact`.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.9 session, 2026-11-05.
