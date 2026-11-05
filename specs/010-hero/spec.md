# Spec 010: The hero

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Status          | Approved                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Slice           | 3.2 Hero                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Branch          | `010-hero`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Mocks and flows | [mocks/README.md](mocks/README.md): the page itself, `/v2`, on this pull request's preview, with screenshots of each state                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Plan            | [plan.md](plan.md), approved with this spec at Gate 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Decisions       | [D124](../../docs/decisions/0124-the-heros-words-are-take-3-from-the-hero-study.md) to [D128](../../docs/decisions/0128-the-heros-buttons-link-a-stub-and-linkedin-until-their-slices.md), from this slice. It builds on [D35](../../docs/decisions/0035-purposeful-motion.md), [D58](../../docs/decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md), [D118](../../docs/decisions/0118-direction-a-with-cs-numbered-evidence-receipts.md)–[D122](../../docs/decisions/0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), and on specs 003, 005 and 009. |

## Summary

The redesigned home page starts with its hero, as Home v2 draws it. It has a role eyebrow, three words that land one at a time ("Mobile." "Full-stack." "Applied AI."), two lines, two buttons, three highlight chips and an "End to end" card. The words are Brad's choice from the hero study (D124), and the sequence plays at its Story pace, done by about 2.7 s (D125). Every word is readable from the first frame: the motion moves things and deepens their color, but never hides them (D126). With reduced motion, the hero shows at rest. Every fact in the chips and the card rests on a public claim from the content model. The new home is built at `/v2`, which previews and the `next` channel show and a release build leaves out, so live keeps v1 until v2.0 (D127). The buttons pointed to a stub Hopper section and to Brad's LinkedIn profile until slices 3.3 and 3.7 (D128); they now open the Hopper story and the résumé PDF (D141).

## Scope

**In:**

- The hero, `apps/site/src/components/home/Hero.astro`, its words and facts in `hero.ts`, and its styles and motion in `apps/site/src/styles/home/hero.css`.
- The page `/v2`: the design system's header, the hero, a stub `#hopper` section, and the footer.
- A release build that leaves out phase 3's pages, `/v2` and `/design-system` (D127).
- Lighthouse on `/v2`, with spec 003's budgets.
- Tests in `tests/010/`, with snapshot baselines from the pinned container.

**Out:**

- The rest of the home page: the Hopper story (3.3), experience (3.4) and side projects (3.5).
- The role pages `/mobile`, `/fullstack` and `/ai` (3.6). The hero takes a role, but nothing passes one yet.
- The résumé PDFs (3.7) and "Ask about Brad" (phase 4).
- Any change to v1's home, essay or 404 pages, or to their words or look (D121).
- Lighting each word's rows for a role, as the board does on a role link. That comes with the role pages in 3.6.
- Ending the sequence early on a click, key or scroll, and playing it once per visit rather than once per load. Both need script, and the site ships none.

## User stories and acceptance scenarios

The IDs in brackets, such as (H1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: The hero reads from the first frame (P1)

A recruiter should see who Brad is, which roles Brad fits, and what Brad builds, without waiting for the motion.

**Why this priority:** it's the first screen of the new site.

**Independent test:** open `/v2` on a desktop and a phone, and freeze its animations at their start.

- **S1.1** Given a desktop 1280 pixels wide, when `/v2` loads, then the hero shows, in order: the eyebrow "Senior mobile & full-stack engineer · Dallas–Fort Worth" in capitals; a heading with "Mobile.", "Full-stack." and "Applied AI.", one per line, each dot in the accent color; the lines "I build Android, iOS and web products end to end." and "Fast with AI agents, careful with production."; the buttons "See the work at Hopper" and "Read the résumé"; and the chips "Hopper · Fintech AI", "Capital One Travel" and "10+ partner products". The "End to end" card sits to the right, with rows for Android, iOS, Web, Services and AI (H1, H2).
- **S1.2** Given a phone 390 pixels wide, then the same parts stack in the same order, the card below the chips, and the page never scrolls sideways (H3, H4).
- **S1.3** Given the motion is on, when the page's first frame paints, then every word, line, button, chip and row is already in place and opaque, with no blur. Each word's color in that frame meets 4.5:1 on the page in both themes (Q1).
- **S1.4** Given a screen reader, then the heading reads "Mobile. Full-stack. Applied AI.", the chips are a list named "Highlights", and the card is a complementary region named "End to end".

### Story 2: The sequence plays at the Story pace (P1)

Brad chose the Story pace (D125), and the words keep the hero study's order and timing (D126).

**Why this priority:** it's the page's one orchestrated moment (D35).

**Independent test:** read each animation's delay and duration in the browser, and step through them.

- **S2.1** Given the motion is on, then the words start at 0, 520 and 1,040 ms, and each rises 0.12 em from the muted gray into ink over 650 ms (Q1, Q2).
- **S2.2** Given the motion is on, then each row of the card lights in the accent for 1.1 s, starting 120 ms after its word, and the three dots turn from gray to the accent at 1,810 ms, over 500 ms (Q2).
- **S2.3** Given the motion is on, then the lines rise 10 pixels starting at 1,495 and 1,755 ms, the buttons at 2,015 ms and the chips at 2,115 ms, each over 560 ms, so everything is at rest by 2,700 ms (Q3, Q4).
- **S2.4** Given the motion is on, then every animation in the hero plays once, never loops, and none is running after 2,700 ms. The page runs no script.
- **S2.5** Given the motion is on, when the sequence plays, then nothing shifts the layout. The page's layout shifts add up to 0 in the browser, and Lighthouse's median Cumulative Layout Shift for `/v2` stays at 0.

### Story 3: With reduced motion, the hero shows at rest (P1)

**Why this priority:** D35 and D122.

**Independent test:** load `/v2` with reduced motion on, and compare it with the sequence's end.

- **S3.1** Given reduced motion is on, when `/v2` loads, then no element on the page has an animation or a transition, and the hero looks as it does once the sequence ends (H1–H4).
- **S3.2** Given reduced motion is on, then the page at phone 390×844 and desktop 1280×800, in light and dark, matches its committed snapshot with no pixel tolerance, in the pinned container. So does each button with keyboard focus (H1–H4, F1, F2).

### Story 4: The buttons work with a keyboard (P1)

**Why this priority:** they're the hero's only actions.

**Independent test:** tab through `/v2` and follow each button.

- **S4.1** Given a keyboard on a desktop, when the visitor presses Tab, then focus moves to "Skip to the content", then the header's name, its Hopper link, GitHub and LinkedIn, then "See the work at Hopper" and "Read the résumé". Each shows a ring at least 2 pixels wide in the accent color (F1, F2).
- **S4.2** Given the buttons, then "See the work at Hopper" links `#hopper`, a section on the page headed "The work at Hopper", and "Read the résumé" opens the full-stack résumé PDF on `/v2` and the role's PDF on a role page (D141; it linked LinkedIn until slice 3.7, D128). Each is at least 44 pixels tall.
- **S4.3** Given `/v2` in either theme at either size, at rest and in its first frame with the motion on, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.

### Story 5: Every fact rests on a public claim (P1)

Brad's rule: a chip or a row with no public claim behind it is listed for Brad, not invented.

**Why this priority:** the repo is public, and a claim on the site must be one Brad has made public.

**Independent test:** read `hero.ts` against `content/claims.yaml`.

- **S5.1** Given each chip and each row of the "End to end" card, then it names one or more claims in `content/claims.yaml`, each marked public, and every word it lists as its terms appears in one of those claims. A chip or row that names a missing claim stops the build.
- **S5.2** Given the hero with a role, mobile, full-stack or applied AI, then its eyebrow reads "Senior mobile engineer", "Senior full-stack engineer" or "Senior engineer · Applied AI", each followed by "· Dallas–Fort Worth". No route passes a role yet.

### Story 6: Live stays v1 (P1)

Main must stay releasable (D120), and the redesign stays off live until v2.0 (D127).

**Why this priority:** a v1.x release must not ship the redesign early.

**Independent test:** build the site with and without the release flag, and read what each holds.

- **S6.1** Given the release workflow, then its build step, and only that step, sets `BRADTHOME_RELEASE=1`. Given a build with that flag, then it holds no `v2.html` or `design-system.html`. Given a build without it, then it holds both.
- **S6.2** Given this branch, then specs 003, 006, 007 and 009's tests pass and their snapshots match without new baselines. v1's pages still load `Base.BKbT8vcy.css`, and no page links `/v2`.
- **S6.3** Given `/v2`, then it carries no `noindex` meta tag, since previews and `next` send `X-Robots-Tag: noindex` on every page and live never serves it. Lighthouse checks it with spec 003's budgets, SEO included.

## Edge cases

- A screen narrower than 320 pixels, or 200% zoom: the words wrap within their lines and the card stacks below. Covered by S1.2 at 320.
- Fonts that load after the first frame: the design system's size-adjusted fallbacks hold the lines, so the swap doesn't shift the layout. Covered by S2.5.
- A visitor who scrolls or tabs during the sequence: it keeps playing, and everything stays readable and usable, since nothing is hidden or disabled. Covered by S1.3 and S4.1.
- A browser that ignores `prefers-reduced-motion`: it plays the sequence, which hides nothing. Covered by S1.3.
- A claim renamed or removed by a later export: the build fails and names the hero's fact. Covered by S5.1.

## Functional requirements

- **FR-001** The site MUST serve the new home at `/v2`, on `DesignBase.astro`, with the design system's header and footer, the hero and a stub `#hopper` section. No page MUST link it.
- **FR-002** `components/home/Hero.astro` MUST take an optional role and show that role's eyebrow, as S5.2 says.
- **FR-003** The hero MUST show D124's words and lines exactly, with the words as real text in one heading.
- **FR-004** Every animation MUST sit in `styles/home/hero.css`, inside one `@media (prefers-reduced-motion: no-preference)` block. It MUST animate only color, background color, border color and transform, MUST play once and MUST NOT loop. Its timings MUST be D125's.
- **FR-005** The page MUST ship no script, request no other host and carry no inline style attribute.
- **FR-006** The buttons MUST link as D128 says, and each MUST be at least 44 pixels tall with a 2-pixel accent focus ring.
- **FR-007** Every chip and row MUST name its public claims and the terms they hold, in `hero.ts`, and the page MUST fail to build when a named claim is missing.
- **FR-008** A build with `BRADTHOME_RELEASE=1` MUST leave out `/v2` and `/design-system`, and the release workflow's build step MUST set it (D127).
- **FR-009** `lighthouserc.json` MUST collect `/v2` beside the home page and the essay, under spec 003's budgets.
- **FR-010** v1's pages, words, stylesheet and snapshots MUST NOT change, and v1's `tokens.css` MUST keep the hero's files out of its Tailwind sources.
- **FR-011** The end-to-end tests MUST cover `/v2` for axe, keyboard order, focus rings, timings, layout shift, reduced motion and snapshots, in the pinned container.
- **FR-012** `docs/plan.md`, `docs/release.md` and AGENTS.md MUST name `/v2` and the release flag.

## Success criteria

- **SC-001** The layout shifts during the whole sequence add up to 0 in the browser, and Lighthouse's median Cumulative Layout Shift on `/v2` is 0.
- **SC-002** axe finds 0 violations in each of `/v2`'s eight checked states: two sizes and two themes, each at rest and in the first frame.
- **SC-003** The last animation ends at 2,700 ms or sooner, and the words' gaps and lengths are within 1 ms of D125's.
- **SC-004** In the first frame, 0 of the hero's text elements have an opacity under 1 or a filter.
- **SC-005** 0 chips or rows rest on no public claim.

## Mocks and flows

[mocks/README.md](mocks/README.md) lists the states with screenshots, and links `/v2` on this pull request's preview, where Brad can replay the sequence on a phone by reloading.

## Key entities

- **The hero:** `apps/site/src/components/home/Hero.astro` and `hero.ts`, styled by `apps/site/src/styles/home/hero.css`.
- **The page:** `apps/site/src/pages/v2.astro`.
- **The release flag:** `scripts/site/release-pages.ts`, added to `astro.config.mjs`, and set in `.github/workflows/release.yml`.

## Assumptions

- Previews and `next` keep sending `X-Robots-Tag: noindex` on every path (specs 003 and 009).
- Lighthouse's emulated phone plays the sequence, since it doesn't ask for reduced motion.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D118 and D124–D128:

- The page is `/v2`, a name that says what it is and that no later page needs.
- The hero's motion and layout live outside the design system's files, in `components/home/` and `styles/home/`, since spec 009 caps the design system's own motion at 240 ms. They use its tokens, `--duration-intro` included.
- The dots start gray with their words, and all three turn blue together at the board's settle time, 1,810 ms. That's the "then the dot" beat in the sequence.
- The card's header reads "End to end" and "Where I work", as on the board, and is a level-2 heading so the region has a name.
- The card's rows keep the board's layers but only the facts the claims back. iOS reads "Native apps, server-driven UI" at Hopper and VINDecoded, since no public claim names Swift. React, TypeScript and Node are credited to VINDecoded, where the claims put them. The AI row's agent workflows come from VINDecoded's claim.
- The header shows the page's one section, Hopper, and no résumé button until 3.7.
- The stub section says the Hopper story comes next. It shows only on previews and `next`.

## Facts left out for Brad

The board has facts that no public claim backs yet. Each needs a public bullet in the notes, then an export, before it can show:

- The chip "10+ years shipping". The jobs' dates imply it, but no claim says it.
- "Swift" in the iOS row.
- React and TypeScript, and Node, at Hopper. The claims name them only at VINDecoded.

## Changes to other specs

Specs 001–003 stay locked as they are. Two unlocked tests change, each noted in its spec:

- **Spec 005:** SC-004's test lets the hero look up claims with `getEntry('claims', id)`, beside the home page's one entry.
- **Spec 007:** S4.2's test reads the home page and the essay as Lighthouse's first two pages, rather than its only two, since `/v2` joins them.

## Changes since approval

- Changed on 2026-11-04, in slice 3.3: the stub `#hopper` section is now the Hopper story (spec 011). S4.2's tests follow "See the work at Hopper" to its heading, "Fintech products for Hopper and its partners", and S3.2's whole-page baselines are made again, since the page under the hero changed. Brad approves it with spec 011 at its Gate 1.
- Changed on 2026-11-05, in slice 3.4: the Experience section follows the Hopper story (spec 012), and the header gains an "Experience" link after "Hopper". S4.1's keyboard path includes it, and S3.2's whole-page baselines and the desktop focus baseline are made again. Brad approved it with spec 012 at its Gate 1.
- Changed on 2026-11-05, in slice 3.5: the "On the side" section follows Experience (spec 013), and the header gains an "On the side" link after "Experience". S4.1's keyboard path includes it, and S3.2's whole-page baselines and the desktop focus baseline are made again. Brad approved it with spec 013 at its Gate 1.
- Changed on 2026-11-05, in slice 3.6: the page moves from `v2.astro` into the shared `HomePage.astro`, which `/v2` and the role pages render (spec 014). The hero takes the role, and lights its word and rows on a role page; `/v2` is unchanged. The "Hiring for" switch sits under the header, so S4.1's keyboard path passes through its four links, the static tests read the shared page, the release test lists the role pages, and S3.2's whole-page and focus baselines are made again. `/v2` gains a canonical link to `https://bradthome.com/` (D135). Brad approved it with spec 014 at its Gate 1.
- Changed on 2026-11-05, in slice 3.7: "Read the résumé" opens the page's résumé PDF, and on `/v2` the full-stack PDF, in place of LinkedIn (spec 015, D141). `ACTIONS.resume` keeps only the label, and S4.2's tests check the PDF link. Brad approved it with spec 015 at its Gate 1.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/010/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: approved by Brad in the session on 2026-11-04, with the plan and mocks ([recorded on #39](https://github.com/memorex386/bradthome/pull/39#issuecomment-6645279447))
- Changed in spec 016 (slice 3.8), on 2026-11-05: FR-005's "no script" now allows the link previews' one first-party module and nothing else, and the end-to-end script check changed with it. Brad chose this on a choice card in the slice 3.8 session ([D147](../../docs/decisions/0147-link-previews-ship-one-small-script.md)).
