---
status: accepted
date: 2026-11-12
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D223
---

# The role tiles are the switch: "What are you hiring for?" over three tiles that link the role pages

## Context and problem statement

Since spec 025 the hero held three proof tiles, each a Hopper figure ([D205](0205-proof-tiles-replace-the-highlight-chips.md)), and under them a quiet line, "Tailor this page: Mobile · Full-stack · Applied AI" ([D206](0206-the-role-switch-moves-into-the-hero-without-the-address.md)). On 2026-11-12 Brad found that the tiles prove Hopper facts without saying what Brad brings, that they do nothing on hover or click, and that the line doesn't read as something to use. What should the top of the hero offer?

## Decision drivers

- A recruiter sees at once that the page can be tailored, and does it in one tap.
- The tiles say what Brad brings: the years of each kind of work, and what they mean for a team.
- Every word rests on a public claim; the switch works with no script and keeps the back button.
- The tiles stay in a laptop's and a phone's first screen.

## Considered options

The hero study's directions, in the builder's ranked order:

1. The mix: B's tiles are the switch, under "What are you hiring for?", with A's buttons and the icon header (recommended)
2. A: today's layout, every part made clickable, with years tiles that open a panel and a sliding switch
3. B: the tiles are the switch, with a profile strip
4. C: tabs over a career timeline from 2008, with a dock of buttons
5. Today's proof tiles and quiet line

## Decision outcome

Chosen option 1, which Brad picked on cards on 2026-11-12 and approved at spec 036's Gate 1 the same day. It replaces D205's proof tiles and amends D206.

- Under the hero's lines, the heading "What are you hiring for?" names a navigation region of three tiles: Mobile and Full-stack with their live years ([D224](0224-the-tiles-years-count-themselves.md)), and Applied AI with "Founding", "engineer on Hopper's Fintech AI team", D205's third tile.
- Each tile is a link to its role page, so it needs no script and keeps the back button. The home marks none and says "Pick one to tailor the page"; a role page marks its own tile with `aria-current="page"`, a fill and a check, and links "Show all roles" to the home. The quiet "Tailor this page" line and spec 025's other two proof tiles go.
- A role page opens its tile's detail: under the tiles on a desktop, under the tile on a phone. It holds "For your team", "Where the years come from" (the role's years claim, a timeline of its jobs with VINDecoded as a dashed line "on the side", and a legend), three receipts in their claims' own words, "See the <role> work at Hopper", and "Ask about this", which puts the role's question in Ask about Brad's box as an "Ask me" receipt does ([D213](0213-ask-me-opens-the-chat.md)). Applied AI has no start date in the record, so it says where its work comes from in words, with no timeline.
- On the home, hovering or focusing a tile lights its headline word and "End to end" rows (MA-5), lifts it and sweeps its years bar; color changes at once, and movement happens only with motion allowed ([D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md)).
- The role pages' morph ([D212](0212-role-pages-morph.md)) slides the picked tile's check in place of the switch's mark.
- Each "Ask about this" question is a facts case in the evals, and the evals ran again, about $0.35, on Brad's Gate 1 card.
- On Brad's Gate 1 cards: the buttons and chips come after the tiles, and there's no "Built for" line of brand names.

### Consequences

- Good, because the biggest thing on the first screen is now the choice of role, and it says what each role brings.
- Good, because the switch is still plain links: no script, the back button, and shareable pages.
- Bad, because the hero is taller: with the buttons and chips after the tiles, the Hopper band starts at 1,081 px at 1440 × 900 (881 before), so spec 025's 900 px target for it goes.
- Bad, because a visitor who doesn't pick sees only the tiles' short lines; the detail opens on a role page.

### Confirmation

Spec 036's tests check the tiles' links, marks and words against their claims, the detail at both sizes, hover and focus, the keyboard's path, the page with no script, the morph's names, axe and the snapshots.

## More information

- Decided by: Brad Thome, on the hero study's cards (2026-11-12) and at spec 036's Gate 1 (2026-11-12).
- Spec: [spec 036](../../specs/036-hero-tiles/spec.md).
