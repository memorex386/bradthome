---
status: accepted
date: 2026-11-11
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D218
---

# The design-system gallery is linked from one receipt

## Context and problem statement

The gallery at `/design-system` has been live since v2.0, unlinked and noindex (D165). bradthome.com's new card (D217) leads with a claim from the charter's Purpose, that the site's design, code and process are all public. The repo proves the code and the process; the gallery proves the design. Should a receipt link it?

## Decision drivers

- Every claim links its proof (the charter's first principle).
- The gallery is a working page, not a page for every visitor, so it shouldn't be promoted.

## Considered options

The options are listed in the builder's ranked order.

1. Link it from the lead claim's receipt, beside the repo, and keep it noindex and out of the menus (recommended)
2. Keep it unlinked, and have the lead claim say only that the code and process are public

## Decision outcome

Chosen option 1, as recommended, on the site-build-story session's card of 2026-11-11. It amends D165: the gallery stays noindex and out of the header and footer, and the one link to it is the second source in `bradthome-com-1`'s receipt.

### Consequences

- Good, because the lead claim's "design" has its proof one tap away.
- Bad, because the gallery is now reachable from the home, so a change to it is a change a visitor may see.

### Confirmation

Spec 033's tests read `bradthome-com-1`'s evidence and its receipt's links. Spec 019's checks that the gallery is built and carries noindex still run.

## More information

- Decided by: Brad Thome, on the site-build-story session's card, 2026-11-11.
- Spec: [spec 033](../../specs/033-site-build-story/spec.md).
- Amends: [D165](0165-the-design-system-gallery-goes-live-unlinked.md).
