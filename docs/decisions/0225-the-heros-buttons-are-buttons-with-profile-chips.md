---
status: accepted
date: 2026-11-12
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D225
---

# The hero's buttons are buttons with icons, the address gets a copy button, and GitHub and LinkedIn get chips

## Context and problem statement

The hero offered one button and two quiet links: "Read the résumé" and Brad's address ([D152](0152-contact-shows-in-the-hero-and-closes-each-page.md)). Brad found that plain text doesn't read as clickable, and asked for Brad's GitHub and LinkedIn there too. What should the hero's actions be?

## Decision drivers

- Each action looks like what it does, at 44 px, in both themes.
- The address can be copied from the first screen, with the contact component's own code ([D154](0154-the-copy-button-runs-in-the-sites-one-module.md)).
- Nothing loads from another host, and the CSP doesn't change.

## Considered options

The hero study's button sets, in the builder's ranked order:

1. Icons and profiles: real buttons with icons, a copy button joined to the address, and GitHub and LinkedIn chips with their preview cards (recommended)
2. A profile strip above the headline with icon buttons
3. A dock of four labeled tiles beside the main button
4. Today's button and two links

## Decision outcome

Chosen option 1, on Brad's cards of 2026-11-12 and at spec 036's Gate 1. It amends D152's quiet links.

- "See the work at Hopper" with a down arrow; on a role page, "See the mobile work at Hopper", "See the full-stack work at Hopper" or "See the AI work at Hopper".
- "Résumé" with a PDF tag, opening the page's PDF as before ([D141](0141-the-home-opens-the-full-stack-resume-pdf.md)); on a role page it names the role, as "Mobile résumé".
- The address as a button, with a copy button joined to it that reuses `email.client.ts` through its data attributes, so no new script. The icon turns to a check and the live region says what was copied; where the clipboard is refused, the address is selected and shown. With no script the copy button isn't shown. On a phone the button reads "Email", and its name keeps the address.
- Two chips: GitHub, with Brad's avatar from spec 016's committed snapshot ([D226](0226-brads-github-avatar-on-the-heros-chip.md)) and "@memorex386", and LinkedIn, with its logo and "in/brad-thome". Hovering or focusing either shows its spec 016 preview card; a phone's tap opens it as a sheet. A phone drops the handles, so both fit one row.
- They come after the tiles, the buttons first, on Brad's Gate 1 card.

### Consequences

- Good, because every action reads as a control, and the address can be copied from the hero, where before it took the contact section's Copy.
- Good, because the chips show where the links go, with their cards.
- Bad, because on a phone the address button, which reads "Email" there, comes after the tiles and the work and résumé buttons, just below the first screen, where D152 had the address itself. The hero study showed this, and the header keeps GitHub, LinkedIn and the résumé in view ([D227](0227-the-phone-header-keeps-the-profiles-and-the-resume.md)).

### Confirmation

Spec 036's tests check the buttons' words, links and heights on each page, the copy, the refused clipboard on a phone, the page with no script, the chips' pictures and cards, and that nothing loads from another host.

## More information

- Decided by: Brad Thome, on the hero study's cards (2026-11-12) and at spec 036's Gate 1 (2026-11-12).
- Spec: [spec 036](../../specs/036-hero-tiles/spec.md).
