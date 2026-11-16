---
status: accepted
date: 2026-11-16
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D233
---

# VINDecoded's and Sudoku World's cards show their App Store icons

## Context and problem statement

The weekly previews refresh (spec 016) commits VINDecoded's and Sudoku World's App Store icons as 112 px WebP files, but they showed only inside the hover cards (D143). At rest the side cards showed "VD" letters and a grid glyph, and bradthome.com's card a code glyph. Should the cards show the apps' real icons?

## Decision drivers

- Pictures that are Brad's own work, already on the site and kept current.
- Nothing loads from another host, and no new script (D145, D226).
- The cards keep working when a snapshot is missing.

## Considered options

1. The apps' App Store icons in place of their badges, from the snapshots, and the site's own icon on bradthome.com's card (recommended)
2. The icons and the apps' screens
3. Today's badges

## Decision outcome

Chosen option 1, on Brad's card in the pictures study's first round (2026-11-16), and approved with spec 039 at its Gate 1 the same day.

- VINDecoded's card shows its App Store icon at 52 px and Sudoku World's at 44 px, read from `content/previews/snapshots.json`, so the weekly refresh keeps them current, rounded as a phone rounds them, with a 1 px edge in the rule's color in both themes, and empty alt text, since the name sits beside each.
- With no snapshot, a card shows today's badge, as the hero's chip shows GitHub's logo without its snapshot (D226).
- bradthome.com's card shows the site icon (D236), its own file.
- The hover cards don't change. App screens stay out: they would make VINDecoded the loudest thing on the page (D132).

### Consequences

- Good, because the side projects show as their stores show them, for about 4 KB.
- Bad, because a new icon arrives with the refresh's pull request, so a snapshot test changes with it.

### Confirmation

Spec 039's tests check each card's picture is its snapshot's file, its size, edge and alt text, the badge with no snapshot, and bradthome.com's icon.

## More information

- Decided by: Brad Thome, on the pictures study's cards (2026-11-16) and at spec 039's Gate 1 (2026-11-16).
- Spec: [spec 039](../../specs/039-pictures/spec.md).
