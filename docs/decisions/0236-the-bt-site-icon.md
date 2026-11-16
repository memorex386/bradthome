---
status: accepted
date: 2026-11-16
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D236
---

# The site icon is "bt_" in JetBrains Mono, with a home-screen icon

## Context and problem statement

The favicon was three white bars on blue, and it read as "IT". It shows in browser tabs, bookmarks and history, and it would be bradthome.com's badge on its own card (D233). There was no home-screen icon. Brad asked for a better one. Which?

## Decision drivers

- Readable at 16 px in a light and a dark browser tab.
- A tab can't load the site's fonts, so letters must be drawn as shapes, under a font license that allows it.
- The release check reads `/favicon.svg` (spec 008).

## Considered options

The pictures study's round 2 icons, in the builder's ranked order:

1. "BT." on ink: both initials and the hero's blue dot (recommended)
2. "BT" on blue
3. "B." on paper
4. "bt_" in mono: the eyebrows' code font with a cursor

## Decision outcome

Chosen option 4, on Brad's card in the pictures study's second round (2026-11-16), and approved with spec 039 at its Gate 1 the same day.

- `/favicon.svg` is lowercase "bt" in JetBrains Mono Bold, light (#e8eaed) on the band's near-black (#0e1116) with a faint light edge, and a blue (#8ea8ff) cursor bar after it, in a 32-unit rounded square. Its letters are paths, taken from Fontsource's JetBrains Mono at weight 700 with fontTools.
- JetBrains Mono is under the SIL Open Font License 1.1, which says its terms don't reach documents made with the font, so a mark drawn from its letters is free to use, and the font itself isn't shipped.
- `/apple-touch-icon.png` is the same mark at 180 px on a full square, since iOS rounds it, linked from both layouts. `pnpm touch-icon` draws it from the favicon, and a test fails while the two disagree.
- bradthome.com's card shows the favicon itself (D233).

### Consequences

- Good, because the icon reads as a developer's mark, matches the eyebrows' font, and is Brad's initials rather than "IT".
- Bad, because at 16 px the letters are about 5 px tall, so the cursor bar does much of the work.

### Confirmation

Spec 039's tests check the favicon's shapes, colors and path, the touch icon's size, square corners and match with the favicon, and both layouts' links.

## More information

- Decided by: Brad Thome, on the pictures study's round 2 card (2026-11-16) and at spec 039's Gate 1 (2026-11-16).
- Spec: [spec 039](../../specs/039-pictures/spec.md).
