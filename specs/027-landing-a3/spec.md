# Spec 027: A frame that knows where you are (landing A3)

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                  |
| Status          | Approved                                                                                                                                                                              |
| Slice           | 5.3 A frame that knows where you are (direction A's slice A3)                                                                                                                         |
| Branch          | `027-landing-a3`                                                                                                                                                                      |
| Gate 1          | Approved by Brad on 2026-11-10, on the session's cards, every option as recommended                                                                                                   |
| Mocks and flows | [mocks/README.md](mocks/README.md): the states this slice touches, the motion it's checked against, and a spike's measurements                                                        |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                             |
| Decisions       | D209 and D210, from this slice. They amend spec 009's FR-003 (the header and footer) and build on D122, D126, D147, D154, D204, D206, D208 and specs 009, 014, 016, 018, 025 and 026. |

## Summary

Today the header scrolls away with the hero, so a reader halfway down the page has no way back to the sections and no sign of where they are. On 2026-11-09 Brad chose the landing study's direction A, whose frame does three things. The header stays at the top of the home and role pages, condenses once the page scrolls, takes the dark band's colors while Hopper is under it, and slides a 2 px rule under the section being read (T4). The quiet role switch under the hero stays on one line on a phone, scrolling sideways if it must (T5). The footer says "Built in the open: specs, tests and decisions on GitHub", linking the public repo (T6). With them come four small motions: a jump's heading underline (MA-16), the link previews opening from their link (MA-18), and the phone menu dropping open (MA-21).

The look and motion are CSS. A short script in the one module tells the CSS where the reader is, from IntersectionObservers, with no scroll handler. It adds about 1 KB to the module.

## Scope

**In:**

- `components/ds/Header.astro`: a `sticky` prop, an inner row, the section rule and the 8 px mark. `components/ds/header.client.ts`, in the one module.
- The header's, the quiet switch's and the frame's motion CSS in `styles/ds/components.css`, and MA-18 in `styles/previews.css`.
- `components/home/HomePage.astro`: the sticky header and the footer's line, on `/` and each role page.
- The gallery, `/design-system`, keeps its header as it is (not sticky), so its specimens stay put.
- `components/ds/Footer.astro`: a `built` prop that puts T6's line in place of the page's note.
- Amended tests and baselines in specs 009, 010, 011, 012, 013, 014, 016, 017, 018, 025 and 026, and new tests in `tests/027/`.
- `docs/plan.md`'s slice 5.3, and records D209 and D210.

**Out:**

- The study's reading-progress line along the header's bottom edge: it isn't one of A3's items.
- Section reveals (MA-9–MA-11, MA-13, MA-14, MA-17) and the cards' hover light: A4.
- The role switch's morph (MA-15): A5.
- The evals, privacy and gallery pages' headers and footers, which keep their own notes.
- Any new claim, figure or framing, any CSP change, and a release.

## User stories and acceptance scenarios

The IDs in brackets are the study's states and the brief's items, listed in [mocks/README.md](mocks/README.md).

### Story 1: The header stays with the reader (P1)

A recruiter reading Experience on a phone should reach Contact, or GitHub, without scrolling back to the top.

**Independent test:** scroll `/` to several depths and read the header's place, attributes and computed styles.

- **S1.1** Given `/` or a role page at any scroll depth, at 1280 × 800, 1440 × 900 and 390 × 844, then the header's top is at 0 and its links work (T4, S16).
- **S1.2** Given the page at the top, then the header is 72 px tall with no background or hairline, as today. Given it scrolled past 8 px, then the header's bar is 60 px tall, on the page's color at 86% with a background blur and a 1 px hairline, and Brad's name is at 0.94 scale (MA-6).
- **S1.3** Given motion allowed in a browser with scroll-driven animations, then the bar, the row and the name follow the scroll between 0 and 64 px; in other browsers they change over 240 ms once the page passes 8 px. Given reduced motion, then the bar and hairline switch at 8 px at once and the name doesn't scale (MA-6, S05).
- **S1.4** Given the header condensing, then nothing under it moves: the header's box stays 72 px tall and layout shift stays 0 (FR-007).
- **S1.5** Given `/#hopper` or a reload partway down, then the header is already condensed and marks its section (S06).
- **S1.6** Given no script, then the header still stays at the top, on its full 72 px bar from the first frame, with motion allowed or reduced, and no section marked (S12).

### Story 2: The header takes the band's colors (P1)

- **S2.1** Given the Hopper band under the header, then the header's bar takes the band's color at 82% and its hairline the band's rule, and the name, section links and menu button take the band's ink; once the band has passed, they return (MA-7).
- **S2.2** Given motion allowed, then the colors change over 240 ms; given reduced motion, at once.
- **S2.3** Given either state, in both themes, then the header's text meets 4.5:1 on its bar (FR-006).

### Story 3: The header marks the section being read (P1)

- **S3.1** Given the page scrolled so a section's top has passed 40% of the screen, and the next one's hasn't, then that section's header link, and its phone menu link, carry `aria-current="location"`, and no other does; above Hopper, none does (MA-8).
- **S3.2** Given a desktop, then a 2 px accent rule sits under the marked link, as wide as the link; when the mark moves it slides and resizes in 320 ms, and under reduced motion it jumps. Over the band it's the band's accent.
- **S3.3** Given the phone menu open, then the marked section's link is underlined, as the menu's current link is today.
- **S3.4** Given the page scrolled to its end, then Contact is marked.

### Story 4: A jump says where it landed (P2)

- **S4.1** Given motion allowed, when the visitor follows an in-page link to a section (the header's links, the hero's "See the work at Hopper"), then the page scrolls smoothly, the section's heading lands below the header, and an accent underline draws under the heading, holds and retracts over 1,100 ms (MA-16).
- **S4.2** Given reduced motion, then the jump is instant, the heading still lands below the header, and no underline shows.

### Story 5: Overlays open from where they were asked for (P2)

- **S5.1** Given motion allowed, when a link preview opens (spec 016, by hover, focus or tap), then it rises 4 px from 0.96 scale and fades in over 200 ms, from its link's corner, and closes over 120 ms; a phone's sheet rises from the bottom. Under reduced motion it opens and closes at once (MA-18, S08).
- **S5.2** Given motion allowed, when the phone menu opens, then its panel drops 6 px and fades in over 200 ms; under reduced motion it appears at once (MA-21, S11).
- **S5.3** Given the gallery's held-open preview cards, then they show at rest, unmoved.

### Story 6: The phone's role switch stays on one line (P1)

- **S6.1** Given `/` and each role page at 390 × 844 and 320 × 640, then "Tailor this page:" and its three roles sit on one line, and where the line is wider than the screen it scrolls sideways; the page itself never scrolls sideways (T5).
- **S6.2** Given each role link, then its target is at least 44 px tall and 24 px wide, with a visible focus ring that isn't clipped.
- **S6.3** Given a role page with no script, then the current role carries its own soft fill (it already does, from spec 025).

### Story 7: The footer says how the site is built (P1)

- **S7.1** Given `/` and each role page, then the footer reads "Built in the open: specs, tests and decisions on GitHub", the last six words linking `https://github.com/memorex386/bradthome`, followed by "How the chat is tested" and "Privacy" as today (T6).
- **S7.2** Given the footer's links, then each keeps its 24 px target, and the text meets 4.5:1 in both themes.

### Story 8: It still works for everyone (P1)

- **S8.1** Given `/`, a role page and `/design-system`, in both themes at desktop and phone sizes, at the top, mid-page and over the band, with the phone menu open, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S8.2** Given reduced motion, then the header at 0, just past 8 and at 64 px, over the band, the phone switch and the footer, at 1280 × 800 and 390 × 844 in light and dark, match their committed snapshots in the pinned container (S01, S02, S03, S05, S16).
- **S8.3** Given the page loading and scrolling, with its fonts arriving, then layout shift stays 0 (S13), and Lighthouse's CI thresholds hold.
- **S8.4** Given the page, then the frame adds no `scroll`, `scrollend` or `wheel` listener, and its script uses IntersectionObserver (the brief's motion rules). Spec 016's previews keep their one passive scroll listener per preview link, which Brad left as it is on a card during the tests stage (2026-11-10): the check is scoped to the frame.
- **S8.5** Given the build, then the one module grows by at most 1,280 bytes (Brad's Gate 1 card), and the CSP and the inline scripts and styles don't change.
- **S8.6** Given any in-page target (a section, a card, a timeline row's card, a receipt row), then a jump to it never leaves it behind the header.

## Edge cases

- A page shorter than the screen plus 8 px never condenses; the role pages and `/` are all far longer.
- A visitor who resizes the window: the rule moves to its link's new place on the resize event, which is not a scroll handler.
- Fonts arriving after the first mark: the rule is placed again once they've loaded.
- A browser without `@starting-style` or `transition-behavior`: the preview opens at once, as today.
- A browser without `animation-timeline`: the header uses the 240 ms transitions (S1.3).
- The floating "Ask about Brad" button keeps its place; the header sits above the page and below the chat's window and the previews, which are in the top layer.

## Functional requirements

- **FR-001** The home and role pages' header MUST stay at the top, condense as MA-6 sets, take the band's colors as MA-7 sets, and mark the section being read as MA-8 sets (T4).
- **FR-002** Its state MUST come from IntersectionObservers in the one module, with no scroll handler; with no script the header MUST still stay at the top on its bar.
- **FR-003** In-page jumps MUST land below the header and, with motion allowed, scroll smoothly and underline their heading as MA-16 sets.
- **FR-004** Link previews and the phone menu MUST open and close as MA-18 and MA-21 set, in CSS only.
- **FR-005** The quiet role switch MUST stay on one line on phones, scrolling sideways if it must, with 44 px targets (T5).
- **FR-006** The home and role pages' footer MUST carry T6's line and link, and keep its other links. Every new color pair MUST meet 4.5:1 in both themes.
- **FR-007** Layout shift MUST stay 0, and every motion MUST sit inside `prefers-reduced-motion: no-preference`, with everything at its end under reduce.
- **FR-008** The one module MUST grow by no more than 1,280 bytes, with no CSP change.
- **FR-009** Specs 009–014, 016–018, 025 and 026's tests and baselines MUST be amended to match, and `tests/027/` MUST cover every ID here.
- **FR-010** `docs/plan.md` MUST show slice 5.3's state, and the decision log MUST hold D209 and D210.

## Success criteria

- **SC-001** At 0, 8 and 64 px, the bar measures 72, about 70 and 60 px tall, and its opacity 0, about 0.1 and 1, on Chrome; the name 1 and 0.94.
- **SC-002** Each section is marked in turn on `/` at both sizes, and Contact at the end.
- **SC-003** The phone switch is one line at 390 and 320 px, with 44 px targets.
- **SC-004** axe finds 0 violations, layout shift is 0, and the frame adds no scroll listener.
- **SC-005** The one module grows by at most 1,280 bytes, and the CSP is unchanged.

## Mocks and flows

The approved mock is the private landing study's "A · Refined" view, which Brad reviewed on 2026-11-09. Nothing from it is copied here. [mocks/README.md](mocks/README.md) lists the states this slice touches, the motion table it's checked against, and the spike's measurements. Screenshots of the spike at 1280 and 390 go to Brad with the Gate 1 cards.

## Decisions to record

- **D209** The frame: a sticky header that condenses, takes the band's colors and marks the section, with its jump, preview and menu motion, and the phone switch on one line (T4, T5; MA-6–MA-8, MA-16, MA-18, MA-21). It amends spec 009's FR-003 for the home and role pages.
- **D210** The footer links the public repo: "Built in the open: specs, tests and decisions on GitHub" (T6, the study's stated default).

On Brad's Gate 1 cards (2026-11-10): the one module may grow by at most 1,280 bytes for the header's script (1,068 measured), and the footer's line goes on the home and role pages only.

Tier 3, decided in this spec: under reduced motion the condensed bar switches at once and the name doesn't scale; the header's box keeps its 72 px and only its bar shrinks, so nothing moves; the band switches the header when its top is within the screen's top 3–4%, about the header's middle; the rule shows on a desktop, and the phone menu marks its link with the existing underline; a section's jump underline also plays when a page loads at its hash; the footer keeps "How the chat is tested"; the evals, privacy and gallery pages keep their headers and footers; a preview opens from its link's top-left corner, or the sheet's bottom.
