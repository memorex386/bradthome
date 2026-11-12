---
status: accepted
date: 2026-11-12
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D227
---

# On a phone the header keeps GitHub, LinkedIn and the résumé beside the menu

## Context and problem statement

On a phone the header showed Brad's name and the menu; GitHub and LinkedIn sat inside the menu (spec 009's FR-003), and the home and role pages passed no résumé. Brad asked for GitHub, LinkedIn and the résumé to always be visible at the top of a phone. How should the header hold them?

## Decision drivers

- One tap to each, from anywhere on the page, while the header is sticky ([D209](0209-a-sticky-header-that-marks-the-section.md)).
- 44 px targets that fit beside the name and the menu down to 320 px, with nothing scrolling sideways.
- No outside requests, and no CSP change.

## Considered options

The hero study's headers, in the builder's ranked order:

1. Icons: GitHub's and LinkedIn's logos and a résumé PDF icon beside the menu, and the same logos on a desktop (recommended)
2. The same, with Brad's avatar as the GitHub button
3. Today's: the profiles in the menu

## Decision outcome

Chosen option 1, on Brad's cards of 2026-11-12 and at spec 036's Gate 1. It amends spec 009's FR-003 and D209 for the header's phone layout.

- On a phone the header shows Brad's name, then GitHub's logo, LinkedIn's logo and a résumé PDF icon, each a 44 px link, beside the 44 px menu, which now holds the sections alone. Under 360 px the four touch, so they fit at 320.
- On a desktop it shows the sections, then the same two logos and a "Résumé" button with its PDF tag. The home and role pages pass the page's PDF; the gallery, evals and privacy pages show the logos, and a résumé only where they pass one.
- The logos are drawn inline: Primer's Octicons GitHub mark and LinkedIn's "in". LinkedIn's blue is a token, lightened on dark to keep 3:1. Each keeps its spec 016 preview card, and over the Hopper band they take the band's colors.

### Consequences

- Good, because GitHub, LinkedIn and the résumé are one tap away anywhere on the page, on every size.
- Bad, because the phone's header is busier, and at 320 px its icons touch.

### Confirmation

Spec 036's tests check the icons' names, sizes, order and links at 320, 375, 390 and 640 px, sticky and over the band, the desktop's header, the other pages', and that nothing scrolls sideways.

## More information

- Decided by: Brad Thome, on the hero study's cards (2026-11-12) and at spec 036's Gate 1 (2026-11-12).
- Spec: [spec 036](../../specs/036-hero-tiles/spec.md).
