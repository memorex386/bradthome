# Spec 012: Experience and the timeline

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Track           | Full                                                                                                                                                                                                                                                   |
| Status          | Approved                                                                                                                                                                                                                                               |
| Slice           | 3.4 Experience                                                                                                                                                                                                                                         |
| Branch          | `012-experience`                                                                                                                                                                                                                                       |
| Mocks and flows | [mocks/README.md](mocks/README.md): the section itself, on `/v2#experience` on this pull request's preview, with screenshots of each state                                                                                                             |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                              |
| Decisions       | [D130](../../docs/decisions/0130-experience-weights-each-job-by-its-display.md) and [D131](../../docs/decisions/0131-education-joins-the-content-model.md), from this slice. It builds on D118–D129, on spec 005's content model and on specs 009–011. |

## Summary

The new home's Experience section follows the Hopper story on `/v2`, on the page's light surface, as Home v2 draws it (D118). It opens with the eyebrow "Experience · Before Hopper" and a heading, then a timeline of every job, newest first, each with its dates from its job file and a bar on a shared span of years; Hopper's row is at the top and links the Hopper section. Then come the jobs, each with the room its job file's `display` sets (D130): Bleacher Report's featured card, with its stats and its three public claims; the Bottle Rocket and BookShout cards; and one dated line each for RealPage and the enterprise IT years. The degree closes the section as a line labeled "Education", from a public claim, now that education is in the content model (D131). Every claim on a card carries spec 009's numbered receipt, numbered on from the Hopper story's. The section has no motion of its own, ships no script, and shows only at `/v2`, which a release build leaves out (D127).

## Scope

**In:**

- The section: `apps/site/src/components/home/Experience.astro` and `experience.ts`, reusing spec 011's `HopperClaim.astro` for each claim and its receipt, and `apps/site/src/styles/home/experience.css`.
- `/v2`: the section after the Hopper story, and an "Experience" link in the header.
- Education in the content model (D131): `content/education/education.yaml`, the `education` collection, its folder in `subjectsIn()`, and the exported claim `education-1`.
- Tests in `tests/012/`, with snapshot baselines from the pinned container, and spec 010's whole-page baselines made again.

**Out:**

- Facts with no public claim: the board's locations, Bleacher Report highlights or numbers beyond the claims, and the app's 2019 award, which predates Brad's start there and never appears.
- Public claims the weighting leaves off the home page: `bottle-rocket-1`, `-3`, `-4`, `bookshout-1` (a note), `realpage-1` and `-2`, and `enterprise-it-1` to `-3`. They stay in the content for the résumé PDFs (3.7).
- Role pages that reorder the jobs (3.6), side projects (3.5), and any change to v1's pages or the design system's components.
- Motion.

## User stories and acceptance scenarios

The IDs in brackets, such as (E1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: The career reads in order, weighted (P1)

A recruiter who has read the Hopper story should see the rest of Brad's career at a glance, with the strongest role given the most room.

**Why this priority:** it's the section's purpose (D130).

**Independent test:** open `/v2#experience` at both sizes, with reduced motion on.

- **S1.1** Given a desktop 1280 pixels wide, when `/v2` loads, then after `#hopper` a section `#experience` shows, in order: the eyebrow "Experience · Before Hopper" in capitals; a level-2 heading "Android for brands, a startup and a sports media platform"; the timeline; Bleacher Report's featured card; the BookShout card, then the Bottle Rocket card; and a list of dated lines for RealPage, the enterprise IT years and education (E1, E2).
- **S1.2** Given the jobs in `content/jobs/`, then the job whose `display` is `featured` has the featured card, with a level-3 heading "Bleacher Report · Senior Android Developer", the kicker "Sports media · Sep 2019 – Apr 2022", the stats "10M+" (B/R's app installs on Google Play) and "Promoted" (Senior Android Developer, Dec 2020), and the claims `bleacher-report-1` to `-3` in order.
- **S1.3** Given each `card` job, newest first, then it has a card with a level-3 heading "Company · Title", a kicker of its label and dates, its claims and its tags: BookShout, "Startup bet", `bookshout-2` and `-3`, with Kotlin, Architecture Components and RxJava 2; Bottle Rocket, "Brands", `bottle-rocket-2`, with Coca-Cola Freestyle, AskPETMD, Starwood SPG and Chewy.
- **S1.4** Given each `line` job, newest first, then it has one dated line and no description or receipt: "Apr 2018 – Sep 2019" and "RealPage · Lead Android Developer"; and, since the enterprise job's summary gives only years, "2008 – 2015" and "Harley-Davidson and Infosys · Enterprise IT".
- **S1.5** Given a phone 390 pixels wide, or 320, then the same parts stack in the same order, and the page never scrolls sideways (E3, E4).
- **S1.6** Given the section, then it has no animation or transition of its own and runs no script. Its layout shifts add up to 0 as the page loads, and Lighthouse's median Cumulative Layout Shift for `/v2` stays at 0.

### Story 2: The timeline shows every job (P1)

**Why this priority:** it's the one-glance view of the career.

**Independent test:** read the timeline against `content/jobs/`.

- **S2.1** Given the timeline, then it's an ordered list named "Timeline, newest first", with one row per job file, newest start first: Hopper, Bleacher Report, RealPage, BookShout, Bottle Rocket, then Harley-Davidson and Infosys. Each row shows the job's dates as "Mon YYYY – Mon YYYY", its company and its title, all from its job file.
- **S2.2** Given each row, then it's one link: Hopper's goes to `#hopper`, and every other row goes to its job's card or line in the section, which exists.
- **S2.3** Given each row's bar, then it's hidden from screen readers, and its start and width are the job's months as a share of the years from the first job's year to the end of the year of the latest month any job file names; a job that ends `present` runs to the end. Hopper's bar is the accent, the featured job's the ink, the cards' the second ink and the lines' the muted gray.

### Story 3: Every sentence is a public claim or a job file (P1)

Brad's rule: every sentence on the page comes from a public claim or the job files, or is a heading or label (D129, D130).

**Why this priority:** the repo and site are public.

**Independent test:** read the built section's text against `content/claims.yaml` and `content/jobs/`.

- **S3.1** Given the built `/v2`, then every paragraph in `#experience`, less its receipt marker, equals the text of a public claim about that card's job, and the education line equals the `education-1` claim's text. Every other piece of text is a heading, the eyebrow, a kicker, a stat, a tag, a receipt's title or fixed label, or a job file's company, title or dates.
- **S3.2** Given the claims that read as notes to the site, `bookshout-1` and `realpage-1`, and every claim the weighting leaves off, then none of their text shows. No claim about Hopper, VINDecoded or Sudoku World shows in the section.
- **S3.3** Given each kicker label, stat, tag, tag list's name and receipt title, then every word in it appears in a claim of its job, or its receipt's claim, except "bet" in BookShout's "Startup bet", Brad's chosen label (D130), and "tags", spec 011's fixed name for a card's list.
- **S3.4** Given the section's code, then it throws, and the page fails to build, when a featured or card job has no look, a look names a claim that isn't there, or the education file or its claim is missing.
- **S3.5** Given `content/education/education.yaml`, then it holds the school, degree and year, the schema refuses an unknown field, and a claim can name `education` as its subject.

### Story 4: Every claim carries its receipt (P1)

> Amended by [spec 026](../026-landing-a2/spec.md) ([D208](../../docs/decisions/0208-one-receipts-drawer-per-card.md), 2026-11-10): each card gathers its receipts in one drawer, beside its tags or alone, so S4.1–S4.5 read "row in its card's drawer" for "note", and a proof row links its source by its host.

- **S4.1** Given each claim on a card, then it ends with one receipt marker and has one note with the same number and a short title. The numbers run on from the Hopper story's, 13 to 18 today, so no number shows twice on the page.
- **S4.2** Given `bleacher-report-3`, which links its Play listing, then its marker is filled and named "Receipt 15, proof", and its note links "See the source" to the listing (R1).
- **S4.3** Given a claim with no link, then its marker is outlined and named "Receipt N, ask Brad", and its note reads "Ask me", "No public link yet." and links "Ask Brad about it" to brad@bradthome.com (R2).
- **S4.4** Given each card, then its drawer follows its claims: beside its tags on a desktop, or a full-width bar on Bleacher Report's card, which has none (E1, E3).
- **S4.5** Given a closed note, when the visitor follows its marker, or clicks its summary, or focuses its summary and presses Enter or Space, then it opens, and pressing again closes it.

### Story 5: It works with a keyboard and a screen reader (P1)

- **S5.1** Given a keyboard, when the visitor tabs on from the Hopper story, then focus moves through the section in reading order: the timeline's rows, then for each claim its marker, then its note's summary, then, when the note is open, its link. Each shows a 2-pixel accent ring with at least 3:1 contrast against what's around it (F1, F2).
- **S5.2** Given the header's "Experience" link, when the visitor follows it, then the URL ends `#experience`, and the section's heading is in view.
- **S5.3** Given `/v2` in either theme at either size, with every note closed and with every note open, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S5.4** Given every text pair the section uses, in both themes, then it meets 4.5:1: ink, second ink and muted text and accent on the page and on a card, the stats' text on their tiles, and the note's text, kind and link on the note.
- **S5.5** Given reduced motion, then the section at phone 390×844 and desktop 1280×800, in light and dark, matches its committed snapshot with no pixel tolerance, in the pinned container. So do one open note on each size and the focus states (E1–E4, R1, R2, F1, F2).

### Story 6: Live stays v1 (P1)

- **S6.1** Given a build with `BRADTHOME_RELEASE=1`, then it holds no `v2.html`, so the section never reaches live. v1's pages, words and stylesheet don't change, and specs 003, 006, 007, 009 and 011's snapshots match without new baselines. Spec 010's whole-page baselines are made again, since they show the page under the hero.

## Edge cases

- A job whose end is `present`: its dates read "Present", and its bar runs to the timeline's end.
- A new `card` job with no look in `experience.ts`: the build fails (S3.4), so the gap is seen rather than shown half-built.
- A second `featured` job: it gets a featured card too, newest first.
- 200% zoom, or 320 pixels wide: the timeline's bars sit under each row's text, and the notes stack under their claims (S1.5).

## Functional requirements

- **FR-001** `/v2` MUST show the Experience section, `#experience`, after the Hopper story, and the header MUST link it.
- **FR-002** The section MUST read every job from the content collection and lay each out by its `display`: featured, card or line. A `story` job MUST show only in the timeline.
- **FR-003** Every sentence MUST be a public claim's text as written, or a job file's words. Headings, kickers, stats, tags, receipt titles and the claims each card shows MUST live in `experience.ts`, and its labels MUST use only words from their claims, but for D130's "Startup bet".
- **FR-004** No claim that reads as a note to the site, and no claim of another subject, MUST show.
- **FR-005** The timeline MUST list every job newest first, with its dates, company and title from its job file, each row linking its place on the page, and Hopper's linking `#hopper`.
- **FR-006** Each claim on a card MUST carry spec 009's receipt, numbered on from the Hopper story's: proof with its links when it has evidence, ask-me otherwise.
- **FR-007** Education MUST be in the content model (D131), and the section MUST show its claim as written on a line labeled "Education".
- **FR-008** The section MUST use the design system's components and tokens, with its own rules in `styles/home/experience.css`, and MUST add no animation, transition, script, inline style or request to another host.
- **FR-009** The section MUST meet WCAG 2.2 AA in both themes at both sizes, notes open or closed, with a visible focus ring on every control.
- **FR-010** The end-to-end tests MUST cover the section's order, weighting, timeline, receipts, keyboard path, axe, contrast, layout shift and snapshots, in the pinned container.
- **FR-011** `docs/plan.md` MUST show slice 3.4's state, and the decision log MUST hold D130 and D131.

## Success criteria

- **SC-001** 0 sentences in the section aren't a public claim's text or a job file's words.
- **SC-002** 6 of 6 jobs show in the timeline, in order, with dates that match their job files.
- **SC-003** 1 featured card, 2 cards and 2 job lines, matching the job files' `display`, plus 1 education line.
- **SC-004** 6 claims show on cards, each with 1 receipt, numbered 13 to 18; 1 is proof.
- **SC-005** axe finds 0 violations in each of the section's eight checked states.
- **SC-006** The page's layout shifts add up to 0, and Lighthouse's median Cumulative Layout Shift on `/v2` is 0.

## Mocks and flows

[mocks/README.md](mocks/README.md) lists the states with screenshots, and links `/v2#experience` on this pull request's preview.

## Key entities

- **The section:** `components/home/Experience.astro` and `experience.ts`, with spec 011's `HopperClaim.astro`, styled by `styles/home/experience.css`.
- **The content:** `content/jobs/*.yaml`, `content/education/education.yaml` and the claims about them in `content/claims.yaml`.

## Assumptions

- The export keeps claim IDs stable, as it numbers them in the notes' order. A renumbered claim fails the build (S3.4), so it's seen.
- Brad's Bleacher Report highlights, if they come, arrive as public claims, and showing one is a one-line change to the card's look.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D118, D129, D130 and D131:

- The heading is new, since the board's draft, "…a top sports app", rests on no claim. Its words are the claims': "brands" (Bottle Rocket), "startup" (BookShout) and "sports media platform" (Bleacher Report).
- Bottle Rocket's kicker is "Brands", not the board's "Agency", which no claim says.
- The timeline is a list of rows, newest first, each with its own bar, rather than the board's single desktop-only bar chart, so it's a real list on a phone and for a screen reader, with Hopper at the top. The bars are SVG, so they need no inline style under the Content-Security-Policy.
- Each card is full width rather than the board's grid, so each claim keeps its note in the margin, as in spec 011.
- Bleacher Report's card has the accent edge in place of a tint. Its stats' labels are claim words. The 10M+ stat's caveat is in the claim right below it.
- Bottle Rocket shows only `bottle-rocket-2`, the range of brands, with the brands as tags, as D130 weights it.
- The receipts number on from Hopper's, so each number is used once on the page.
- The education line shows the claim as written, labeled "Education", rather than splitting it into a year and words. It has no receipt, like the job lines.
- `HopperClaim.astro` is reused as it is, rather than renamed, to keep spec 011's files unchanged.

## Facts left out for Brad

The board has facts that no public claim backs. Each needs a public bullet in the notes, then an export:

- The locations: Remote, Addison, Plano and Richardson, TX.
- The "Agency" and "Startup" labels as facts, beyond Brad's "Startup bet".
- Any Bleacher Report highlight or number beyond the three claims, and any evidence link for the other claims.
- The board's enterprise IT wording, "from the help desk to technology analyst", which the one-line weighting leaves out on purpose.

## Changes to other specs

Specs 001–003 stay locked as they are.

- **Spec 005:** D131 adds the `education` collection and folder to its schema. SC-004's test lists the Experience section as a reader of the collections.
- **Spec 010:** its whole-page baselines and desktop focus baseline are made again, since the page under the hero changes, and S4.1's keyboard path includes the header's new "Experience" link. Its change log says so.

## Changes since approval

- Changed on 2026-11-05, in slice 3.6: the page moves from `v2.astro` into the shared `HomePage.astro`, which `/v2` and the role pages render (spec 014). The static tests read the shared page for the section's place, and check that only it imports the section and that a release build leaves out `/v2` and the role pages. The switch under the header moves the section down, so its baselines are made again. Brad approved it with spec 014 at its Gate 1.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/012/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: approved by Brad in the session on 2026-11-05, with the plan and mocks ([recorded on #41](https://github.com/memorex386/bradthome/pull/41#issuecomment-6661515374)).
- Changed in spec 016 (slice 3.8), on 2026-11-05: FR-008's "no script" now allows the link previews' one first-party module and nothing else, and the end-to-end script check changed with it. Brad chose this on a choice card in the slice 3.8 session ([D147](../../docs/decisions/0147-link-previews-ship-one-small-script.md)).
- Changed in spec 019 (slice 3.11), on 2026-11-06: v2.0 retires the release flag (D127) and moves the new home from `/v2` to `/` ([D162](../../docs/decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)). This spec's tests that expected a release build to leave phase 3 out, or named `/v2`, now expect the release build to be the same build as every other and read `/`.
