---
status: accepted
date: 2026-11-16
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D237
---

# Brad's photo sits by "Get in touch", from Brad's LinkedIn profile

## Context and problem statement

v2.0 shipped with no photo, and D164 said the agent never takes an image from LinkedIn or elsewhere, so a photo could come only from a file Brad sends. D226 then put Brad's GitHub avatar on the hero's chip and its card only. In the pictures study Brad asked about a photo, and on its second round picked one beside "Get in touch". Where does it sit, and where does it come from?

## Decision drivers

- A face where a visitor is asked to write, without a second picture of Brad in the hero beside the avatar (D226).
- Brad decides how Brad appears, and which picture.
- No metadata (location, device or dates) reaches the repo, and nothing loads from another host.

## Considered options

For its place, from the study's round 2:

1. By "Get in touch" (recommended)
2. By the hero's first line
3. No photo

For its source, at Gate 1, after Brad answered "use my linkedin photo" and the builder pointed out that D164 rules that out:

1. Brad sends the original file of the same photo (recommended)
2. Override D164: the agent takes it from Brad's LinkedIn profile
3. Ship without it for now

## Decision outcome

Chosen: by "Get in touch", on Brad's round 2 card, and from Brad's LinkedIn profile, on Brad's Gate 1 card of 2026-11-16, which overrides D164's rule for this photo. Brad then approved the crop on a card.

- The photo is Brad's LinkedIn profile photo: the 800 px copy Brad's public profile served on 2026-11-16, saved once in Brad's own Chrome. `pnpm photo` refused nothing, since it's over 400 px square, cropped the 680 px square Brad approved, and wrote it at 64, 76, 128 and 152 px as WebP with no metadata.
- It sits round beside "Get in touch" on the home and each role page, 76 px on a desktop and 64 px above the heading on a phone, at 1x and 2x, lazy, with alt text naming Brad.
- The cap in the photo carries a baseball team's logo, about 10 px wide on the page; Brad saw it on the crop card and kept the photo.
- The résumé PDFs and the share cards show no photo.
- This amends D164: a photo now shows, and this one came from LinkedIn on Brad's say-so; any other picture still comes only from a file Brad sends. It amends D226 too: Brad's picture shows on the hero's GitHub chip and its card, and by "Get in touch".

### Consequences

- Good, because the page has Brad's face where a visitor decides to write.
- Bad, because LinkedIn's copy is compressed and 800 px at most, where an original would be sharper.
- Bad, because a new LinkedIn photo doesn't follow on its own; changing it takes `pnpm photo` and a new commit.

### Confirmation

Spec 039's tests check the photo's files, sizes and lack of metadata, its place, size and alt text on each page and screen, and that the résumé PDFs don't show it.

## More information

- Decided by: Brad Thome, on the pictures study's round 2 card (2026-11-16) and on spec 039's Gate 1 cards (2026-11-16).
- Spec: [spec 039](../../specs/039-pictures/spec.md).
- Amends: [D164](0164-no-photo-at-v2-0.md) and [D226](0226-brads-github-avatar-on-the-heros-chip.md).
