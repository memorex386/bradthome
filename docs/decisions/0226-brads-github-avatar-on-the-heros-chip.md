---
status: accepted
date: 2026-11-12
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D226
---

# Brad's GitHub avatar shows on the hero's GitHub chip and its card only

## Context and problem statement

v2.0 shipped with no photo of Brad ([D164](0164-no-photo-at-v2-0.md)); only the GitHub link's preview card showed Brad's avatar ([D145](0145-the-github-card-shows-brads-avatar.md)). Brad asked for the hero's buttons to carry Brad's GitHub and LinkedIn pictures. Where may Brad's picture show?

## Decision drivers

- Brad's own choice of how Brad appears on the site.
- No image taken from LinkedIn or elsewhere ([D164](0164-no-photo-at-v2-0.md)), and nothing loaded from another host.

## Considered options

1. The avatar on the hero's GitHub chip and its card; GitHub's logo in the header (recommended)
2. The avatar in the header's GitHub button too
3. No picture: GitHub's logo everywhere

## Decision outcome

Chosen option 1, on Brad's card of 2026-11-12. It amends D164.

- The hero's GitHub chip shows Brad's avatar, the 112-pixel WebP that spec 016's refresh commits to `public/previews/`, so it's the site's own file and a new avatar comes with the next refresh. Its preview card shows it as before.
- The header shows GitHub's logo, drawn inline. LinkedIn shows its logo everywhere, since its card is written by hand and has no picture.
- Without a snapshot, the chip shows GitHub's logo.

### Consequences

- Good, because the page has Brad's face where a visitor looks for Brad's profiles.
- Bad, because a picture sets a lighter tone than the rest of the page, as D145 noted.

### Confirmation

Spec 036's tests check the chip's image is the committed snapshot's and that the header uses the logo.

## More information

- Decided by: Brad Thome, on the hero study's cards (2026-11-12).
- Spec: [spec 036](../../specs/036-hero-tiles/spec.md).
