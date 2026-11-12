# Spec 036: The hero's tiles, buttons and phone header

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                                                                                                                                             |
| Status          | Approved                                                                                                                                                                                                                                                                                                                                                                                         |
| Slice           | 5.10 The hero's tiles and buttons (Brad's "mix" from the hero study, 2026-11-12)                                                                                                                                                                                                                                                                                                                 |
| Branch          | `036-hero-tiles`                                                                                                                                                                                                                                                                                                                                                                                 |
| Gate 1          | Approved by Brad on 2026-11-12, on the session's cards, every option as recommended                                                                                                                                                                                                                                                                                                                                                                                |
| Mocks and flows | [mocks/README.md](mocks/README.md): every state, captured from this slice's own build                                                                                                                                                                                                                                                                                                            |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                                                                                                                                        |
| Decisions       | D223–D227, from this slice. D223 replaces [D205](../../docs/decisions/0205-proof-tiles-replace-the-highlight-chips.md)'s proof tiles and amends [D206](../../docs/decisions/0206-the-role-switch-moves-into-the-hero-without-the-address.md). D225 amends [D152](../../docs/decisions/0152-contact-shows-in-the-hero-and-closes-each-page.md). D226 amends [D164](../../docs/decisions/0164-no-photo-at-v2-0.md). D227 amends spec 009's FR-003 and [D209](../../docs/decisions/0209-a-sticky-header-that-marks-the-section.md). It builds on D6, D122, D134–D136, D141, D145, D150, D153, D154, D204, D212 and D213. |

## Summary

On 2026-11-12 Brad asked for four changes to the top of the home page: tiles that show Brad's experience and what it means for the next employer, and that answer hover and click; a role switch that's clearly something to use; buttons that aren't plain text links, with Brad's GitHub and LinkedIn pictures; and GitHub, LinkedIn and the résumé always in view at the top of a phone. From the hero study Brad picked the mix on cards: the tiles are the role switch, under "What are you hiring for?"; A's buttons with icons; GitHub and LinkedIn chips; and the icon header.

The three tiles are links to the role pages, so they need no script and keep the back button. Mobile and full-stack show live years, exact whole years with a "+", counted from the month each began: May 2015 and Sep 2016, so 11+ and 10+ today. The build writes each count for its own month, and a few bytes in the one module count again from the visitor's clock, so the years grow without a release. A role page marks its tile, opens its detail (what the years mean for a team, where they come from, three receipts, the role's work at Hopper and "Ask about this"), and links back to the home. The buttons follow the tiles, then the chips. On a phone the header keeps GitHub, LinkedIn and the résumé beside the menu.

## Scope

**In:**

- The hero: `components/home/Hero.astro`, a new `HeroDetail.astro`, `hero.ts`, `roles.ts`, a new `tiles.ts`, `years.ts` and `years.client.ts`, and `styles/home/hero.css` and `morph.css`.
- The header: `components/ds/Header.astro`, a new `Logo.astro` and `profiles.ts`, `Icon.astro`'s new icons, `PreviewLink.astro`'s label, and `styles/ds/components.css` and `tokens.css`.
- The content model: a hand-written `content/career/` subject for the career's own facts, so the export can write the two years claims, and the corpus and the evals' corpus reading it.
- Three eval cases, one per "Ask about this" question, and the fresh eval run they need.
- Amended tests and baselines in the specs whose hero, header or switch this changes, and new tests in `tests/036/`.
- `docs/plan.md`'s slice 5.10, and records D223–D227.

**Out:**

- The rest of the page: the Hopper story, Experience, On the side, the contact section and the footer keep their words and look. Only the header above them changes.
- The résumé PDFs, which stay as they are.
- A "Built for" line of brand names (Brad's Gate 1 card).
- A release. The slice lands on main and `next`; bradthome.com changes only through a release on Brad's go-ahead.
- Any CSP change, and any request to another host.

## User stories and acceptance scenarios

The state IDs in brackets are the captures in [mocks/README.md](mocks/README.md).

### Story 1: The tiles pick the role (P1)

A recruiter should see at once that the page can be tailored, and do it with one tap on what they're hiring for.

**Independent test:** open `/` and each role page with no script, read the tiles' links and marks, and follow each.

- **S1.1** Given `/`, then under the hero's two lines a heading "What are you hiring for?" names a navigation region of three tiles, in order Mobile, Full-stack and Applied AI, linking `/mobile`, `/fullstack` and `/ai`, with "Pick one to tailor the page" beside the heading; no tile carries `aria-current` (M1).
- **S1.2** Given a role page, then its own tile carries `aria-current="page"`, the accent fill and a checked mark, and the other two don't; beside the heading, "Show all roles" links `/` (M2–M4).
- **S1.3** Given any page, then the hero holds no "Tailor this page" line and no other role switch, and spec 025's three Hopper proof tiles are gone (D223, amending D206 and replacing D205).
- **S1.4** Given no script, then each tile and "Show all roles" is a plain link that loads its page, and the browser's back button returns (M6).
- **S1.5** Given a keyboard on `/`, when the visitor tabs past the lines, then focus moves through Mobile, Full-stack and Applied AI, then the buttons, each with a 2 px accent ring; each tile and link is at least 44 px tall.
- **S1.6** Given a desktop 1280 wide, then the tiles sit in one row of three; given a phone 390 or 320 wide, then they stack as rows of icon, words and mark, and nothing scrolls sideways.
- **S1.7** Given a switch between role pages in Chrome with motion allowed, then the checked mark slides from the old tile to the new one and the tiles relight in place, as spec 029's morph did for the switch; under reduced motion, with no script and in Firefox it's a plain page load.

### Story 2: The years count themselves (P1)

The figures must stay true without a release, and never round up.

**Independent test:** unit tests of the count for every month, and the page loaded under fixed clocks.

- **S2.1** Given the tiles, then Mobile shows its years since May 2015 and Full-stack since Sep 2016, as whole years with a "+": "11+" and "10+" in Nov 2026. Applied AI shows "Founding" and "engineer on Hopper's Fintech AI team", as D205's tile did.
- **S2.2** Given the build, then its HTML holds each count for the build's month in Dallas–Fort Worth's time, so it shows with no script and to crawlers.
- **S2.3** Given a visitor's clock, when the page loads, then the one module counts again in whole months: on Apr 30, 2027 Mobile reads 11+, and from May 1, 2027, 12+; on Aug 31, 2027 Full-stack reads 10+, and from Sep 1, 2027, 11+ (M8).
- **S2.4** Given a visitor whose clock is behind the build's month, then each count stays at the built one; it never goes lower (M8).
- **S2.5** Given each count's start month, then its tile's first claim says it, `years-of-experience-1` "May 2015" and `-2` "Sep 2016", and a claim that stops saying it fails the build.
- **S2.6** Given the build, then the one module grows by at most 384 bytes (Brad's Gate 1 card; the build measures 331), adds no scroll handler, and the CSP doesn't change.

### Story 3: A picked tile's detail (P1)

**Independent test:** open each role page at both sizes and read the detail.

- **S3.1** Given a role page on a desktop, then the detail sits under the tiles; on a phone, under the picked tile. The page holds both, and only one shows (M2–M4).
- **S3.2** Given the detail, then it shows the role and its years, then "For your team" and its line; then "Where the years come from" with the words of the role's years claim, a timeline of its jobs oldest first, VINDecoded as a dashed line "on the side" from the role's start month, and a legend naming each with its years. Applied AI has no start month in the record, so it shows "Where it comes from" in words, with no timeline.
- **S3.3** Given the detail, then "Proof" lists three of the role's public claims, each in its own words with its source, as `hero.ts` names them.
- **S3.4** Given the detail, then "See the <role> work at Hopper" links `#hopper`, and "Ask about this" opens Ask about Brad with the role's question in the box, unsent, as an "Ask me" receipt does (D213); with no script, or when the window can't load, it's a link to `#contact` (M9).
- **S3.5** Given each tile's line, each "For your team" line and Applied AI's "Where it comes from", then every term it names is held by one of its claims, and a missing claim fails the build.

### Story 4: Hover and focus (P2)

- **S4.1** Given a pointer device on `/` with motion allowed, when the pointer rests on a tile, then the tile lifts 2 px with a shadow and an accent border, its word and its "End to end" rows light as MA-5 lights them, its years bar's accent sweeps across, and "Tailor the page" slides in, over 150–650 ms (M5).
- **S4.2** Given keyboard focus on a tile, then the same tile, word and rows light, on any device (M5).
- **S4.3** Given reduced motion, then hover and focus change color at once and nothing moves; given a touch screen, then a tap follows the tile's link.
- **S4.4** Given the pointer over every tile, button and chip in turn, then layout shift stays 0.

### Story 5: The buttons and the chips (P1)

- **S5.1** Given `/`, then after the tiles come "See the work at Hopper" with a down arrow, linking `#hopper`; "Résumé" with a PDF tag, opening the full-stack PDF (D141); and the address as a button, with a copy button joined to it. On a role page the first two read "See the mobile work at Hopper" and "Mobile résumé", and the résumé opens that role's PDF (M1–M4).
- **S5.2** Given the copy button, when it's pressed, then the contact component's code copies the address (spec 017, D154): the icon turns to a check and the live region says what was copied. Where the clipboard is refused, the address is selected and shown. With no script the button isn't shown, and the address button rounds off (M6).
- **S5.3** Given a phone, then the address button reads "Email", and its accessible name holds both "Email" and the address.
- **S5.4** Given the chips, then GitHub's shows Brad's avatar from spec 016's committed snapshot, "GitHub" and "@memorex386", and LinkedIn's shows LinkedIn's logo, "LinkedIn" and "in/brad-thome"; each links its profile. On a desktop, hovering or focusing either shows its spec 016 preview card; on a phone a tap opens it as a sheet. A phone drops the handles, so both chips fit one row.
- **S5.5** Given the hero, then nothing loads from another host: the avatar is the site's own file, and the logos are drawn inline.

### Story 6: The header keeps the profiles and the résumé in view (P1)

- **S6.1** Given a phone from 320 to 640 wide on the home or a role page, then the header shows Brad's name, then GitHub's logo, LinkedIn's logo and a résumé PDF icon, each a 44 px link, beside the 44 px menu, at the top and while it's sticky; the menu holds the sections only (M7).
- **S6.2** Given a desktop, then the header shows the sections, then the same GitHub and LinkedIn logos and a "Résumé" button with its PDF tag.
- **S6.3** Given the header's résumé, then it opens the page's PDF, as the hero's does. The gallery, evals and privacy pages show GitHub and LinkedIn, and a résumé only where the page passes one.
- **S6.4** Given the header over the Hopper band, then its icons and résumé take the band's colors (M7).
- **S6.5** Given each icon, then its accessible name is "GitHub", "LinkedIn" or "Résumé PDF", its preview card still opens, and the logos are inline, so the CSP doesn't change and no request leaves the site.

### Story 7: The claims and the chat (P1)

- **S7.1** Given the export, then `years-of-experience-1` and `-2` hold Brad's approved words under the career's own subject, "Years of experience", each with its start month and no count that goes stale; the mobile claim leads with the jobs, with VINDecoded on the side (Brad's Gate 1 cards: the wording under Gate 1 below).
- **S7.2** Given the corpus, then each years claim is a source linking its tile on the home, `/#tile-mobile` and `/#tile-fullstack`.
- **S7.3** Given the eval suite, then each "Ask about this" question is a facts case requiring an answer that cites one of its role's claims, and a fresh run passes under D200 and D221 (Brad's Gate 1 card: about $0.35).

### Story 8: It still works for everyone (P1)

- **S8.1** Given `/` and each role page in both themes at desktop and phone sizes, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation, the detail and the chips included.
- **S8.2** Given reduced motion, then each state in [mocks/README.md](mocks/README.md) matches its committed snapshot in the pinned container, with the years held to the fixed clock's.
- **S8.3** Given no script, then the tiles, the detail, the buttons, the chips and the header are complete, and every link works.
- **S8.4** Given the hero's sequence, then MA-1–MA-4 play as spec 025 set them, but in this slice's order: the lines at 760 and 880 ms, the tiles at 1,000 ms, and the buttons and chips at 1,060 ms, each over 540 ms, done at 1,600 ms; layout shift stays 0.
- **S8.5** Given `/` at rest, then the tiles end by 800 px at 1280 × 800, by 844 px at 390 × 844 and by 812 px at 375 × 812. With the buttons and chips after them, the Hopper band starts at 1,081 px at 1440 × 900, so spec 025's 900 px target for the band is dropped (Brad's Gate 1 card: the buttons after the tiles).
- **S8.6** Given the build, then the résumé PDFs' words are unchanged.

## Edge cases

- The notes change a start month: the build fails until `hero.ts`'s `since` and the claim agree.
- A visitor in another time zone: the module counts from the visitor's own month, the build from Dallas–Fort Worth's; on the first of a month the two can differ for a few hours, and the higher count shows.
- A clock years ahead: the counts grow with it. A clock behind the build: they hold.
- The build runs on an anniversary: the built count already grows, and the module agrees.
- 320 px wide, or 200% zoom: the header's four icons touch, at 44 px each, and the tiles stack; nothing scrolls sideways.
- A browser without `:has()`: a tile's hover lights only the tile, not its word and rows.
- A browser without popovers: the chips and icons are plain links.
- The clipboard is refused on a phone, where the button reads "Email": the address shows, selected.
- The GitHub snapshot is missing: the chip shows GitHub's logo in place of the avatar.
- A role page opened at `/mobile#hopper`: the hero finishes at once, as spec 025's T8 does.

## Functional requirements

- **FR-001** The hero MUST show "What are you hiring for?" over three tiles that link the role pages, mark the current role's tile with `aria-current="page"`, and on a role page link "Show all roles" to `/`, with no "Tailor this page" line or proof tiles (D223).
- **FR-002** Mobile's and full-stack's tiles MUST show whole years with a "+", counted in whole months from the start month their first claim says, rendered by the build for its month and counted again by the one module from the visitor's clock, never below the built count (D224).
- **FR-003** Every tile line, "For your team" line and "Where it comes from" MUST name public claims that hold each of its terms, and a missing claim or start month MUST fail the build.
- **FR-004** A role page MUST show its tile's detail, under the tiles on a desktop and under the tile on a phone, with S3.2–S3.4's parts; "Ask about this" MUST hand its question to Ask about Brad as D213's links do, and stay a link to the contact section with no script.
- **FR-005** On `/`, a tile's hover and focus MUST light its word and rows (MA-5), lift it and sweep its years bar; color changes at once, and movement happens only with motion allowed (D122); layout shift MUST stay 0.
- **FR-006** The buttons MUST be buttons with icons, in S5.1's order and words, with the page's PDF, and the address's copy button MUST use the contact component's code in the one module (D154, D225).
- **FR-007** The hero MUST show GitHub and LinkedIn chips with spec 016's preview cards, GitHub's with Brad's avatar from the committed snapshot (D226).
- **FR-008** The header MUST keep GitHub, LinkedIn and the page's résumé as 44 px links in view on a phone, beside the menu, and show the same icons on a desktop, with the logos drawn inline (D227).
- **FR-009** The pages MUST meet WCAG 2.2 AA in both themes at both sizes, with 44 px targets and a visible focus ring on every link and button.
- **FR-010** The change MUST add no inline script, inline style, CSP change or request to another host, and the one module MUST grow by no more than S2.6's allowance.
- **FR-011** The years claims MUST come through `pnpm content:export` under a hand-written `career` subject, the corpus MUST link them to their tiles, and the evals MUST hold one facts case per "Ask about this" question, with a fresh run.
- **FR-012** The tests and baselines of specs 007, 009, 010, 014, 016, 017, 018, 020, 025, 027, 029 and 030 that read the hero, the header or the switch MUST be amended to match, `tests/036/` MUST cover every ID here, and `docs/plan.md` and the decision log MUST hold slice 5.10 and D223–D227.

## Success criteria

- **SC-001** For every month from May 2015 to Dec 2040, each tile's count equals its whole months since its start, over 12, rounded down, and no clock behind the build lowers a count.
- **SC-002** 0 pages show "Tailor this page", and each role page marks exactly 1 tile.
- **SC-003** The one module grows by no more than S2.6's allowance.
- **SC-004** axe finds 0 violations, layout shift is 0, and the hero and header make 0 requests to another host.
- **SC-005** At 320 px wide the header holds its four 44 px targets with no sideways scroll.
- **SC-006** The eval run with the three new cases passes under D200 and D221.

## Mocks and flows

The approved mock is the private hero study's "Mix" direction, which Brad picked on 2026-11-12. Nothing from it is copied here. [mocks/README.md](mocks/README.md) shows this slice's own build in every state the brief asks for.

## Decisions to record

- **D223** The role tiles are the switch: "What are you hiring for?" over three tiles that link the role pages (replaces D205's proof tiles, amends D206).
- **D224** The tiles' years count themselves: whole years with a "+" from the claims' start months, built for the build's month and counted again in the one module, never lower; the career's own facts get a content subject.
- **D225** The hero's buttons are buttons with icons, the address gets a copy button and reads "Email" on a phone, and GitHub and LinkedIn get chips (amends D152's quiet links).
- **D226** Brad's GitHub avatar shows on the hero's GitHub chip and its preview card only; the header uses GitHub's logo (amends D164).
- **D227** On a phone the header keeps GitHub, LinkedIn and the résumé beside the menu (amends spec 009's FR-003 and D209).

## Gate 1

Brad approved the spec and plan on 2026-11-12 on the session's cards, with the preview's states, choosing every recommended option:

- **The mobile claim:** "Mobile apps since May 2015: Android Developer at Bottle Rocket from Oct 2015, then BookShout, RealPage, Bleacher Report and Hopper, with VINDecoded's native Android app on the side from May 2015."
- **The full-stack claim:** "Web front ends and the services behind them since Sep 2016: first on the side, moving VINDecoded from native Android to a web app, then at Hopper."
- **The one module** may grow by at most 384 bytes for the years.
- **The eval run:** three facts cases, one per "Ask about this" question, and a fresh run from an `evals/` branch, about $0.35.
- **The order:** the buttons and chips after the tiles. The Hopper band starts lower at 1440 × 900, and spec 025's band target is dropped.
- **No "Built for" line.**
