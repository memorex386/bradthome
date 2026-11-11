---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D165
---

# The design-system gallery goes live, unlinked

## Context and problem statement

The gallery at `/design-system` showed on previews and `next`, and a release build left it out (D127). Once the release flag retires, does the gallery go live?

## Considered options

The options are listed in the builder's ranked order.

1. Ship it unlinked and noindex (recommended)
2. Keep it off live

## Decision outcome

Chosen option 1. The gallery is live from v2.0 at `/design-system`. Nothing links to it and it carries noindex. The release build is the same build as every other, so the flag retires completely.

### Consequences

- Good, because no build differs from another.
- Neutral, because its source is public in the repo anyway.
- Bad, because one more page is served that visitors don't need.

### Confirmation

Spec 019's S1.3 and S2.1 check it's built and carries noindex.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.11 session, 2026-11-06.
- Spec: [spec 019, the v2.0 relaunch](../../specs/019-relaunch/spec.md).
- Amended by [D218](0218-the-design-system-gallery-is-linked-from-one-receipt.md), 2026-11-11: one receipt links the gallery, bradthome.com's lead claim's, beside the repo. It stays noindex and out of the menus.
