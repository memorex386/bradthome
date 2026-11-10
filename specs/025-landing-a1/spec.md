# Spec 025: The first screen (landing A1)

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Status          | Approved                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Slice           | 5.1 The first screen (direction A's slice A1)                                                                                                                                                                                                                                                                                                                                                                                                              |
| Branch          | `025-landing-a1`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Gate 1          | Approved by Brad on 2026-11-09, on the session's cards, every option as recommended                                                                                                                                                                                                                                                                                                                                                                        |
| Mocks and flows | [mocks/README.md](mocks/README.md): the states this slice touches, and the motion table it's checked against                                                                                                                                                                                                                                                                                                                                               |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                                                                                                                                                                                                  |
| Decisions       | [D204](../../docs/decisions/0204-the-hero-plays-at-the-brisk-pace.md)–[D207](../../docs/decisions/0207-direction-a-runs-as-phase-5.md), from this slice. D204 amends [D125](../../docs/decisions/0125-the-hero-plays-at-the-story-pace.md)'s pace, and D206 amends [D134](../../docs/decisions/0134-role-pages-light-the-hero-and-reorder-the-hopper-story.md)'s switch row. It builds on D118, D122, D124, D126 and specs 009, 010, 014, 016–018 and 022. |

## Summary

On 2026-11-09 Brad chose direction A for the landing page: today's home, refined, with a motion system and a set of quality fixes. This slice is its first screen. The hero plays at the Brisk pace, done at 1.6 s instead of 2.7 s (amending D125). Three proof tiles, each a figure from a public claim, replace the highlight chips and link their Hopper topics. The first screen is tighter, so the chips end inside a laptop's first screen and the Hopper band's edge shows on a 1440 × 900 screen. A word and its "End to end" rows light together on hover, and the hero's buttons and tiles lift on hover and press. A page loaded away from the top, such as `/#hopper`, finishes the hero at once. The "Hiring for" switch leaves the top of the page for one quiet line in the hero, under the tiles, and the mono `bradthome.com` address beside it goes, since the browser already shows it.

## Scope

**In:**

- The hero, in `components/home/Hero.astro`, `hero.ts` and `styles/home/hero.css`: the Brisk sequence (MA-1–MA-4), the hover links between words and rows (MA-5), hover and press on the hero's buttons and tiles (MA-19), the proof tiles (T1) and the tighter spacing (T2).
- A few lines in the site's one module that finish the hero's animations when the page loads away from the top (T8).
- The role switch's new place and quiet look (T10): `HomePage.astro`, `roles.ts`, `styles/home/roles.css`, and spec 009's `RoleSwitch.astro` and its gallery entry, without the address.
- Amended tests and baselines in specs 009, 010, 014, 017 and 018, and new tests in `tests/025/`.
- `docs/plan.md`'s phase 5, and records D204–D207.

**Out:**

- Every later slice of direction A: the receipts drawer (A2), the sticky header and footer (A3), section reveals (A4), role-page morphs (A5) and "Ask me" (A6). The phone switch's sideways scroll and the current role's own fill without script (T5) are A3's.
- "Ask about Brad"'s timing (MA-20, A6). Its button keeps its place and look.
- Any new claim, figure or framing. The tiles use only words their claims hold.
- A release. A1 lands on main and `next`; live changes only through a release on Brad's go-ahead.
- Any CSP change.

## User stories and acceptance scenarios

The IDs in brackets are the study's states and this brief's items, listed in [mocks/README.md](mocks/README.md).

### Story 1: The hero lands at the Brisk pace (P1)

A recruiter opening the site should have the whole first screen settled in under two seconds, with every word readable from the first frame.

**Independent test:** read `document.getAnimations()` on `/` with motion allowed, and capture frames at 0, 300, 700, 1,100 and 1,600 ms.

- **S1.1** Given `/` with motion allowed, then the three words each run two animations from 0, 300 and 600 ms, over 520 ms: a rise of 0.14 em on the spring `cubic-bezier(0.3, 1.32, 0.52, 1)`, and a color change from muted to the word's own color on the ease-out `cubic-bezier(0.2, 0.7, 0.2, 1)` (MA-1).
- **S1.2** Given the same load, then each word's dot pops in place from 286, 586 and 886 ms over 520 ms: scale 0.45, then 1.3 at 55%, then 1, from muted to its own color (MA-2).
- **S1.3** Given the same load, then each "End to end" row runs from 140 ms after its role's word (140, 440 and 740 ms) over 700 ms: a sheen crosses the row, and its border and layer name turn the accent color from 30% to 55%, then settle (MA-3). The sheen is a translated pseudo-element.
- **S1.4** Given the same load, then the lines rise 10 px from 760 and 880 ms, the buttons from 1,000 ms, and the proof tiles and the role switch under them from 1,060 ms, each over 540 ms on the ease-out, so the last ends at 1,600 ms (MA-4).
- **S1.5** Given each animation's start, delay and duration, then each matches S1.1–S1.4 within 10 ms, plays once, and none is running after 1,700 ms. No animation lasts past 1,600 ms.
- **S1.6** Given the first frame in either theme, then every word, line, button, link, tile and row is opaque, unblurred and visible, and every word meets 4.5:1 against the page (D126). Only transform and color change.
- **S1.7** Given reduced motion, then nothing on the page animates or transitions, and the hero shows at rest: the words in ink on `/`, and the role's word and rows lit on a role page (S05).
- **S1.8** Given the sequence at either size, then the page's layout shifts add up to 0.

### Story 2: Proof on the first screen (P1)

- **S2.1** Given `/`, then under the hero's actions a list named "Highlights" holds three tiles, in order: "5" with "more partners adopted the reusable capability from Capital One Travel's purchase flow"; "10+" with "partner products, including Frontier and Spirit"; and "Founding" with "engineer on Hopper's Fintech AI team" (T1).
- **S2.2** Given each tile, then it names its claims, `hopper-disruption-assistance-1`, `hopper-disruption-assistance-3` and `hopper-role-and-dates-2`, and every word of its figure and label that isn't a joining word is held by its claim's text or subject. A missing claim fails the build.
- **S2.3** Given each tile, then it's a link to its Hopper topic: the first two to `#hopper-disruption-assistance`, the third to `#hopper-fintech-ai`, and each target exists on `/` and every role page.
- **S2.4** Given a desktop 1280 wide, then the three tiles sit in one row; given a phone 390 or 320 wide, then they stack as rows, each with its figure beside its label, and nothing scrolls sideways.
- **S2.5** Given each tile, then it's at least 44 px tall, shows a 2 px accent focus ring, and meets 4.5:1 for its label and 3:1 for its figure in both themes.

### Story 3: A tighter first screen (P1)

- **S3.1** Given the hero, then its top padding is `clamp(1.25rem, 2.4vw, 2.25rem)`, its bottom padding `clamp(2rem, 3vw, 2.75rem)`, and its text column's gap 1.25 rem (T2).
- **S3.2** Given `/` at 1280 × 800, then the proof tiles end by 800 px from the top of the page; at 390 × 844, by 844 px; and at 1440 × 900, the Hopper band's top edge is within the first 900 px. Each is measured at rest, in both themes, with the switch in its new place, on `/` and each role page.

### Story 4: The hero answers the pointer (P2)

- **S4.1** Given a pointer device with motion allowed, when the pointer rests on a word, then the word turns the accent color and its role's rows take the accent border and layer name and move in 3 px, over 150–240 ms; when the pointer rests on a row, then its word and its role's rows light the same way (MA-5).
- **S4.2** Given the same, when the pointer rests on the "See the work at Hopper" button or a proof tile, then it lifts 1 px and the button's arrow moves 3 px; when pressed, it scales to 0.98 (MA-19).
- **S4.3** Given reduced motion, then hover changes color only, at once, and nothing moves. Given a touch screen with no hover, then nothing lights on tap.

### Story 5: A deep link lands on a settled page (P1)

- **S5.1** Given `/#hopper`, `/#experience`, `/#contact` or a role page with a hash, with motion allowed, when it loads, then within 300 ms of the module running, no animation is running and the hero is at rest (T8, S06).
- **S5.2** Given a page reloaded scrolled down, with no hash, then the hero is likewise finished once the page has loaded.
- **S5.3** Given `/#hopper`, when the visitor goes back to `/` or scrolls to the top, then nothing in the hero replays.
- **S5.4** Given no script, then the hero is complete at rest at once under reduced motion, and with motion allowed it plays its CSS sequence as before; nothing depends on the script to show.

### Story 6: The role switch under the hero, with no address (P1)

- **S6.1** Given `/` or a role page, then the page opens on the header and then the hero; no switch sits between them. Under the hero's buttons and its proof tiles, a navigation region named "Tailor this page" shows one line: "Tailor this page:", then "Mobile", "Full-stack" and "Applied AI", linking `/mobile`, `/fullstack` and `/ai`. There's no "Any role" link; the header's "Brad Thome" goes home (T10, Q5, Brad's label card at Gate 1, 2026-11-09).
- **S6.2** Given a role page, then its own link carries `aria-current="page"` and the marked look; given `/`, then none does. The line reads quieter than the buttons: small text, no borders, muted except the current role.
- **S6.3** Given `/`, a role page or the design-system gallery, then no page shows the mono address, `bradthome.com` or `bradthome.com/mobile` and so on, beside the switch (Q6). `RoleSwitch.astro` takes no address.
- **S6.4** Given a keyboard, when the visitor tabs from the last proof tile, then focus moves through the switch's links in order, each with a 2 px accent ring. Each link is at least 44 px tall.
- **S6.5** Given `/`, when the visitor follows "Applied AI", then `/ai` loads with its eyebrow, lit word and rows, and Hopper order; when the visitor goes back, `/` shows again. The role pages keep their highlights at rest (S04).
- **S6.6** Given a phone 390 or 320 wide, then the line wraps if it must and the page never scrolls sideways. (Staying on one line with sideways scroll is A3's T5.)

### Story 7: It still works for everyone (P1)

- **S7.1** Given `/` and each role page in either theme at desktop and phone sizes, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S7.2** Given reduced motion, then the first screen of `/` and each role page at 1280 × 800, 1440 × 900 and 390 × 844, in light and dark, matches its committed snapshot in the pinned container (S01, S02, S03, S04).
- **S7.3** Given the page with no script, then the hero, tiles and switch are complete and every link works (S12). Given the fonts still loading, then the layout doesn't shift when they arrive (S13).
- **S7.4** Given Lighthouse's CI runs, then every threshold holds and `/`'s Cumulative Layout Shift stays 0.

## Edge cases

- A claim behind a tile is renamed or dropped by an export: the build fails, as the chips did.
- A Hopper topic is renamed: the tile's link would dangle, so spec 025's static test fails (S2.3), and so does CI's offline link check of the build's anchors.
- 200% zoom, or 320 px wide: the tiles stack and the switch wraps; nothing scrolls sideways.
- A visitor tabs into the hero mid-sequence: focus rings show at once, since they don't animate.
- The hash names no element, such as `/#nothing`: the hero still finishes at once; harmless.
- A browser without `:has()`: hover lights only the hovered word, and rows don't follow. Everything else holds.

## Functional requirements

- **FR-001** The hero MUST play MA-1–MA-4 at the Brisk timings, all inside `prefers-reduced-motion: no-preference`, ending at 1,600 ms (D204, amending D125).
- **FR-002** The hero MUST be readable from the first frame: no opacity, blur or visibility change on content, only transform and color, and layout shift 0 (D126).
- **FR-003** The sheen MUST be a translated pseudo-element; no animation may change layout or paint-heavy properties beyond color.
- **FR-004** The hero MUST show three proof tiles from `hero.ts`, each naming its claims and its words' terms, each linking its Hopper topic, replacing the highlight chips (D205). A missing claim MUST fail the build.
- **FR-005** The hero MUST use T2's padding and gap, and meet S3.2's positions.
- **FR-006** On pointer devices, a word and its rows MUST light together on hover (MA-5), and the hero's buttons and tiles MUST lift and press (MA-19), with movement only when motion is allowed.
- **FR-007** The one module MUST finish the hero's animations when a page loads with a hash or scrolled away from the top, adding at most 512 bytes to the module, with no scroll handler (D204).
- **FR-008** The role switch MUST sit in the hero under its buttons and proof tiles as one quiet line, on `/` and every role page, with the label and links Brad chose; no page may show the mono address, and `RoleSwitch.astro` MUST take no address (D206, amending D134 and spec 014's layout).
- **FR-009** The pages MUST meet WCAG 2.2 AA in both themes at both sizes, with 44 px targets and a visible focus ring on every link.
- **FR-010** The change MUST add no inline script, inline style, CSP change or request to another host.
- **FR-011** Specs 009, 010, 014, 017 and 018's tests and baselines MUST be amended to match, and `tests/025/` MUST cover every ID here.
- **FR-012** `docs/plan.md` MUST show phase 5 and slice 5.1's state, and the decision log MUST hold D204–D207.

## Success criteria

- **SC-001** Every hero animation matches the motion table within 10 ms, and the last ends at 1,600 ms.
- **SC-002** The proof tiles end by 800 px at 1280 × 800 and by 844 px at 390 × 844, and the Hopper band starts within 900 px at 1440 × 900.
- **SC-003** 0 animations are running 300 ms after the module runs on `/#hopper`.
- **SC-004** 0 pages show the mono address, and 0 pages show a switch between the header and the hero.
- **SC-005** Layout shift is 0 on `/` and each role page, and axe finds 0 violations.
- **SC-006** The one module grows by at most 512 bytes.

## Mocks and flows

The approved mock is the private landing study's "A · Refined" view at the Brisk pace, which Brad reviewed on 2026-11-09. Nothing from it is copied here. [mocks/README.md](mocks/README.md) lists the states this slice touches and how each is checked; the switch's new place, which the study doesn't draw, is shown on Brad's label card and then on `next`.

## Decisions to record

- **D204** The hero's pace is Brisk, 1.6 s, and a page loaded away from the top finishes it at once (amends D125; T8's script budget).
- **D205** Proof tiles from three claims replace the highlight chips.
- **D206** The role switch moves into the hero, under the buttons and the proof tiles, as one quiet line, and the mono address goes (amends D134's switch row and spec 014's layout).

## Changes since Gate 1

- **2026-11-09, Brad's card during the build:** the switch sits under the proof tiles, not directly under the buttons. Measured on the build, the switch directly under the buttons, with spec 022's phone "Ask about Brad" button, put the phone's tiles at 989 px against S3.2's 844 px. With the tiles first, every S3.2 target holds. S1.4, S6.1, S6.4 and FR-008 changed to match.
- **D207** Direction A's slices run as phase 5, A1–A6 as slices 5.1–5.6.
