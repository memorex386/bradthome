# Spec 013: On the side

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                    |
| Status          | Approved                                                                                                                                                                                                                                                                |
| Slice           | 3.5 Side projects                                                                                                                                                                                                                                                       |
| Branch          | `013-side-projects`                                                                                                                                                                                                                                                     |
| Mocks and flows | [mocks/README.md](mocks/README.md): the section itself, on `/v2#side` on this pull request's preview, with each state listed                                                                                                                                            |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                               |
| Decisions       | [D132](../../docs/decisions/0132-vindecoded-is-a-side-project-on-a-lean-card.md) and [D133](../../docs/decisions/0133-the-side-projects-public-pages-are-their-evidence.md), from this slice. It builds on D118–D131, on spec 005's content model and on specs 009–012. |

## Summary

The new home's "On the side" section follows Experience on `/v2`, as Home v2 draws it (D118). It opens with the eyebrow "On the side" and the heading "What I build on the side", in the hero's voice. Then come two cards, as the project files' `display` asks: VINDecoded's full card and Sudoku World's small card. VINDecoded is a side project that does well, never the page's headline (D132). Its card is lean: the platform, the downloads as two stats with their claim, and the case study's counts with their date, then links to vindecoded.com and the case study. Sudoku World's card shows the game and how it's built, and links sudokuworld.app. Every claim carries spec 009's numbered receipt, numbered on from Experience's, and the projects' public pages are their evidence (D133). The section has no motion of its own, ships no script, and shows only at `/v2`, which a release build leaves out (D127).

## Scope

**In:**

- The section: `apps/site/src/components/home/Side.astro`, `side.ts` and `SideClaim.astro`, and `apps/site/src/styles/home/side.css`.
- `/v2`: the section after Experience, and an "On the side" link in the header.
- Evidence for the projects' claims (D133), added to the notes' sources and exported. No claim's text changes.
- Tests in `tests/013/`, with snapshot baselines from the pinned container, and spec 010's whole-page baselines made again.

**Out:**

- Facts with no public claim: the board's draft sentence about where Brad tries ideas first, "Puzzle game", and any count or rating beyond the claims.
- Public claims the lean card leaves off (D132): `vindecoded-1`, `-4`, `-5` and `-6`, and `sudoku-world-3`. They stay in the content for the role pages (3.6) and résumé PDFs (3.7).
- Any project that isn't public. The section reads only the project files, and names nothing else.
- Role pages, contact (3.9), and any change to v1's pages or the design system's components.
- Motion.

## User stories and acceptance scenarios

The IDs in brackets, such as (P1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: The side projects read as side projects (P1)

A recruiter who has read Brad's career should see what Brad builds outside work, after the jobs, without mistaking it for the main story.

**Why this priority:** it's Brad's framing (D132).

**Independent test:** open `/v2#side` at both sizes, with reduced motion on.

- **S1.1** Given a desktop 1280 pixels wide, when `/v2` loads, then after `#experience` a section `#side` shows, in order: the eyebrow "On the side" in capitals; a level-2 heading "What I build on the side"; VINDecoded's card; then Sudoku World's card (P1, P2).
- **S1.2** Given VINDecoded's project file, whose `display` is `card`, then its card has a level-3 heading "VINDecoded", the kicker "Vehicle research · since 2015", the stats "1M+" (Android downloads · 4.5 stars) and "400K+" (iOS downloads · 4.7 stars), the claims `vindecoded-2`, `-3` and `-7` in order, and the links "vindecoded.com" to its `url` and "Read the case study" to `/vindecoded-agents`.
- **S1.3** Given Sudoku World's project file, whose `display` is `small`, then its card is the small card: a smaller level-3 heading "Sudoku World", the kicker "Game · web, Android and iOS", no stats, the claims `sudoku-world-1` and `-2` in order, and the link "sudokuworld.app" to its `url`.
- **S1.4** Given the page, then VINDecoded is never its headline: no level-1 or level-2 heading or eyebrow names VINDecoded or Sudoku World (the hero's "Where I work" tags still list VINDecoded beside Hopper, as spec 010 has them), both cards sit in `#side` after `#experience`, and no text on `/v2` reads "one engineer", "one person" or "a team of AI agents".
- **S1.5** Given a phone 390 pixels wide, or 320, then the same parts stack in the same order, the stats sit under the name, and the page never scrolls sideways (P3, P4).
- **S1.6** Given the section, then it has no animation or transition of its own and runs no script. Its layout shifts add up to 0 as the page loads, and Lighthouse's median Cumulative Layout Shift for `/v2` stays at 0.

### Story 2: Every sentence is a public claim or a project file (P1)

**Why this priority:** the repo and site are public (D129).

**Independent test:** read the built section's text against `content/claims.yaml` and `content/projects/`.

- **S2.1** Given the built `/v2`, then the text of every claim in `#side`, less its receipt marker, equals the text of the public claim it names, with its lines as a paragraph and a list. Every other piece of text is a heading, the eyebrow, a kicker, a stat, a link's label, a receipt's title or fixed label, or a project file's name or site.
- **S2.2** Given `vindecoded-7`, then its counts show only after its lead, "The case study's counts, measured on 10/28:", with "83% of them from agent branches" as the claim words it. Its closing rule for the site never shows, and no text in the section says all 1,235 PRs went through the newer workflow.
- **S2.3** Given the claims the lean card leaves off, then none of their text shows in the section. No claim about Hopper or any job shows in it.
- **S2.4** Given each kicker, stat label and receipt title, then every word in it appears in a claim of its card, but for "since" and the project file's start year.
- **S2.5** Given the section's code, then it throws, and the page fails to build, when a project has no look, a look names a claim that isn't there, a stat names a claim its card doesn't show, or `vindecoded-7` stops ending with its rule.

### Story 3: Every claim carries its receipt (P1)

- **S3.1** Given each claim on a card, then it ends with one receipt marker and has one note with the same number and a short title. The numbers run on from the Experience section's, 19 to 23 today, so no number shows twice on the page.
- **S3.2** Given a claim with evidence, then its marker is filled and named "Receipt N, proof", and its note links "See the source" to each link, numbered when there are two: `vindecoded-2` to vindecoded.com, `vindecoded-3` to its Google Play and App Store listings, `vindecoded-7` to the case study, and `sudoku-world-1` to sudokuworld.app (R1).
- **S3.3** Given `sudoku-world-2`, which has no link, then its marker is outlined and named "Receipt 23, ask Brad", and its note reads "Ask me", "No public link yet." and links "Ask Brad about it" to brad@bradthome.com (R2).
- **S3.4** Given a desktop 1280 pixels wide, then each note sits in the margin to the right of its claim. Given a phone, then it sits in line under the claim (P1, P3).
- **S3.5** Given a closed note, when the visitor follows its marker, or clicks its summary, or focuses its summary and presses Enter or Space, then it opens, and pressing again closes it.
- **S3.6** Given every link in the section, then it's an `https` link, a `mailto:` to brad@bradthome.com, or `/vindecoded-agents`, which the build holds.

### Story 4: It works with a keyboard and a screen reader (P1)

- **S4.1** Given a keyboard, when the visitor tabs on from Experience, then focus moves through the section in reading order: for each claim its marker, then its note's summary, then, when the note is open, its links; then the card's links. Each shows a 2-pixel accent ring with at least 3:1 contrast against what's around it (F1, F2).
- **S4.2** Given the header's "On the side" link, when the visitor follows it, then the URL ends `#side`, and the section's heading is in view.
- **S4.3** Given `/v2` in either theme at either size, with every note closed and with every note open, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S4.4** Given every text pair the section uses, in both themes, then it meets 4.5:1: ink, second ink, muted text and accent on a card, the stats' text on their tiles, the badge's letters on the badge, and the note's text, kind and link on the note.
- **S4.5** Given reduced motion, then the section at phone 390×844 and desktop 1280×800, in light and dark, matches its committed snapshot with no pixel tolerance, in the pinned container. So do one open note on each size and the focus states (P1–P4, R1, R2, F1, F2).

### Story 5: Live stays v1 (P1)

- **S5.1** Given a build with `BRADTHOME_RELEASE=1`, then it holds no `v2.html`, so the section never reaches live. v1's pages, words and stylesheet don't change, and specs 003, 006, 007, 009, 011 and 012's snapshots match without new baselines. Spec 010's whole-page baselines are made again, since they show the page under the hero and the header's new link.

## Edge cases

- A new project file with no look in `side.ts`: the build fails (S2.5), so the gap is seen rather than shown half-built.
- A project with no `start`: its kicker has no "since".
- A claim with two evidence links: its note links "See the source 1" and "See the source 2".
- A re-export that rewords `vindecoded-7`'s rule: the build fails until `side.ts` names the new rule (S2.5).
- 200% zoom, or 320 pixels wide: the stats wrap under the name, and the notes stack under their claims (S1.5).

## Functional requirements

- **FR-001** `/v2` MUST show the section, `#side`, after Experience, and the header MUST link it.
- **FR-002** The section MUST read every project from the content collection, full cards before small ones, and lay each out by its `display`.
- **FR-003** Every sentence MUST be a public claim's text as written, less a closing rule for the site, or a project file's words. Headings, kickers, stats, link labels, receipt titles and the claims each card shows MUST live in `side.ts`, with labels made of their claims' words.
- **FR-004** VINDecoded MUST show as a side project (D132): a card in this section, never a headline, with the lean claims, and no text calling Brad "one engineer" or "a team of AI agents".
- **FR-005** The case study's counts MUST show only with their date and the claim's wording, and its closing rule MUST never show.
- **FR-006** Each claim MUST carry spec 009's receipt, numbered on from the Experience section's: proof with its links when it has evidence, ask-me otherwise.
- **FR-007** The projects' claims MUST carry their public pages as evidence (D133), written by the export.
- **FR-008** The section MUST use the design system's components and tokens, with its own rules in `styles/home/side.css`, and MUST add no animation, transition, script, inline style or request to another host.
- **FR-009** The section MUST meet WCAG 2.2 AA in both themes at both sizes, notes open or closed, with a visible focus ring on every control.
- **FR-010** The end-to-end tests MUST cover the section's order, framing, receipts, links, keyboard path, axe, contrast, layout shift and snapshots, in the pinned container.
- **FR-011** `docs/plan.md` MUST show slice 3.5's state, and the decision log MUST hold D132 and D133.

## Success criteria

- **SC-001** 0 sentences in the section aren't a public claim's text or a project file's words, and 0 show the closing rule.
- **SC-002** 1 full card and 1 small card, matching the project files' `display`, in that order, after Experience.
- **SC-003** 5 claims show, each with 1 receipt, numbered 19 to 23; 4 are proof.
- **SC-004** axe finds 0 violations in each of the section's eight checked states.
- **SC-005** The page's layout shifts add up to 0, and Lighthouse's median Cumulative Layout Shift on `/v2` is 0.

## Mocks and flows

[mocks/README.md](mocks/README.md) lists the states, and links `/v2#side` on this pull request's preview.

## Key entities

- **The section:** `components/home/Side.astro`, `side.ts` and `SideClaim.astro`, styled by `styles/home/side.css`.
- **The content:** `content/projects/*.yaml` and the claims about them in `content/claims.yaml`.

## Assumptions

- The export keeps claim IDs stable, as it numbers them in the notes' order. A renumbered claim fails the build (S2.5), so it's seen.
- The case study stays at `/vindecoded-agents`, on live and in every build.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D118 and D129–D133:

- The heading is the board's "What I build on the side", in the hero's first-person voice (D124). It's a heading, so it needs no claim.
- VINDecoded's kicker is "Vehicle research", the claim's words, with "since 2015" from the project file. The board's "Puzzle game" for Sudoku World becomes "Game", since no claim says "puzzle".
- The project file's role, "Founder & Principal Engineer", isn't shown, as the board doesn't show it, so the card reads as a side project.
- A claim written as a lead and a list, as `vindecoded-7` is, shows as a paragraph and a list, with its marker at the end of the last item. `SideClaim.astro` does that rather than changing spec 011's `HopperClaim.astro`.
- `vindecoded-7`'s closing rule is cut by `side.ts`, which names it exactly and fails the build if it moves, so it never shows by accident.
- Each card is full width, as in specs 011 and 012, so each claim keeps its note in the margin. Sudoku World's small card has a smaller badge and heading and no stats, rather than a narrower column.
- VINDecoded's badge is its initials on the dark band's colors; Sudoku World's is a grid in the accent. Both are hidden from screen readers.
- The receipts number on from Experience's, so each number is used once on the page.
- The header link reads "On the side", the eyebrow's words.

## Facts left out for Brad

The board has facts or words that no public claim backs. Each needs a public bullet in the notes, then an export:

- The board's draft sentence that VINDecoded is where Brad tries ideas first, such as native Bluetooth, AI chat and photo scans.
- "Puzzle game" as Sudoku World's kind.

## Changes to other specs

Specs 001–003 stay locked as they are.

- **Spec 005:** D133 adds evidence to six project claims, and SC-004's test lists the side projects section as a reader of the collections. Its change log says so.
- **Spec 010:** its whole-page baselines and desktop focus baseline are made again, since the page under the hero changes, and S4.1's keyboard path includes the header's new "On the side" link. Its change log says so.

## Changes since approval

- Changed on 2026-11-05, in slice 3.6: the page moves from `v2.astro` into the shared `HomePage.astro`, which `/v2` and the role pages render (spec 014). The static tests read the shared page for the section's place, and check that only it imports the section and that a release build leaves out `/v2` and the role pages. The switch under the header moves the section down, so its baselines are made again. Brad approved it with spec 014 at its Gate 1.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/013/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: approved by Brad in the session on 2026-11-05, with the plan and mocks ([recorded on #42](https://github.com/memorex386/bradthome/pull/42#issuecomment-6662839530)).
- Changed in spec 016 (slice 3.8), on 2026-11-05: FR-008's "no script" now allows the link previews' one first-party module and nothing else, and the end-to-end script check changed with it. Brad chose this on a choice card in the slice 3.8 session ([D147](../../docs/decisions/0147-link-previews-ship-one-small-script.md)).
