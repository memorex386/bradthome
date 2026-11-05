---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D145
---

# The GitHub card shows Brad's avatar

## Context and problem statement

Brad's GitHub avatar is a playful picture. The design board drew a BT monogram. Should the GitHub card show the avatar?

## Considered options

The options are listed in the builder's ranked order.

1. Show the avatar, resized and stored in the repo (recommended)
2. A BT monogram on the GitHub and LinkedIn cards

## Decision outcome

Chosen option 1. The refresh fetches the avatar, resizes it to 112 pixels square as WebP and commits it to `public/previews/`, named by its hash, so a new avatar comes in with the next refresh. LinkedIn's card keeps the monogram, since LinkedIn is written by hand.

### Consequences

- Good, because the card previews what a visitor sees at the link, as GitHub's own hover cards do.
- Bad, because the picture sets a lighter tone than the rest of the page.

### Confirmation

Spec 016's tests check the image is self-hosted, named in the snapshot, and that no request leaves the page.

## More information

- Decided by: Brad Thome, on the slice 3.8 session's card, 2026-11-05.
