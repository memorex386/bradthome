---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D206
---

# The role switch moves into the hero, as one quiet line, without the address

## Context and problem statement

[D134](0134-role-pages-light-the-hero-and-reorder-the-hopper-story.md) put the "Hiring for" switch in a row of pills between the header and the hero, with the page's address, such as `bradthome.com/mobile`, in mono beside it. On a phone, Brad found the row pushed the hero down, and the address repeated what the browser shows. Where should the switch go, and what should it say?

## Decision drivers

- The page should open on the header and the hero.
- The switch must still work with no script and keep the back button.
- T2's first-screen targets: the proof tiles end by 800 px on a laptop and 844 px on a phone.

## Considered options

The options are listed in the builder's ranked order.

1. One quiet line in the hero, "Tailor this page: Mobile · Full-stack · Applied AI", under the proof tiles (recommended)
2. The same line directly under the buttons, above the tiles
3. The row of pills under the header, as today

## Decision outcome

Chosen option 1. Brad moved the switch below the hero's buttons and dropped the address (Q5 and Q6, 2026-11-09), then picked its label and order on cards:

- The label is "Tailor this page", and the line lists the three roles only. There's no "Any role" link; the header's "Brad Thome" goes home.
- The current role is marked with `aria-current` and a soft accent fill. The other links are plain and borderless, each 44 px tall.
- No page shows the mono address. `RoleSwitch.astro` takes no address, and the gallery shows both looks.
- The line sits under the proof tiles. Directly under the buttons, with spec 022's phone "Ask about Brad" button, the phone's tiles ended at 989 px. With the tiles first, every target holds.

This amends D134's switch row and spec 014's layout. The role pages, their links and their highlights stay as they are.

### Consequences

- Good, because the first screen is the hero, and the tiles fit it at every size.
- Good, because the switch stays plain links, with no script.
- Bad, because a visitor reads the proof before finding the switch.
- Bad, because the line wraps on a narrow phone until slice A3 keeps it on one line.

### Confirmation

Spec 025's tests check the page's order, the switch's links and marks, the keyboard path, and that no page shows the address.

## More information

- Decided by: Brad Thome, on the career session's cards (Q5, Q6), at spec 025's Gate 1 (the label and "Any role"), and on a card during the build (the order), 2026-11-09.
- Amended in part by [D223](0223-the-role-tiles-are-the-switch.md), 2026-11-12: the tiles under "What are you hiring for?" are the switch, and the quiet "Tailor this page" line goes.
