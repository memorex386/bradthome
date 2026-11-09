---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D190
---

# A release flag keeps the chat off live until v2.1

## Context and problem statement

The chat shows on previews and `next` only until v2.1 ([D177](0177-five-slices-with-the-chat-live-only-after-its-evals.md)), and the API already refuses bradthome.com ([D183](0183-only-previews-and-next-may-call-the-chat-api.md)). Spec 019 retired the release flag that kept `/v2` off live ([D127](0127-the-new-home-shows-at-v2-and-stays-off-live.md)), so every build is now the release's. How does bradthome.com stay without the chat?

## Decision drivers

- bradthome.com loads none of the chat before v2.1.
- CI, the previews and `next` test and show the same build.

## Considered options

The options are listed in the builder's ranked order.

1. Bring back the release flag (recommended)
2. A check of the address in the browser

## Decision outcome

Chosen option 1, as recommended. The release workflow's build step sets `BRADTHOME_RELEASE=1`. That build leaves out the chat's button and dialog, the gallery's chat section and, through a constant the bundler reads, the chat's code in the one module and its chunk. Every other build keeps them. Slice 4.4 removes the flag for v2.1.

### Consequences

- Good, because live loads none of the chat.
- Bad, because the release build differs from the one CI tests, by exactly the chat.

### Confirmation

Spec 022's test builds the site with the flag and finds no chat in any page or script, and checks `release.yml` sets the flag on its build step alone.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.3 session, 2026-11-08.
