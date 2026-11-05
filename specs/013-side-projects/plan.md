# Plan for spec 013: On the side

|        |                                                    |
| ------ | -------------------------------------------------- |
| Spec   | [spec.md](spec.md), for approval with it at Gate 1 |
| Status | Draft                                              |

## Approach

The section is content-driven, like spec 012's: the project files' `display` sets each card's size, and the words are the claims, so a change in weighting or wording is a content change.

- **Content (FR-007).** Each public link from D133 is added to its bullet's source in the notes, and `pnpm content:export` writes it as evidence. Only `evidence` lines change in `claims.yaml`.
- **Data and layout rules (FR-002–FR-006, S1.2–S1.3, S2.2–S2.5, S3.1).** `components/home/side.ts` holds the eyebrow, heading, case study link, each project's look (badge, kicker, claim IDs, stats), the receipts' titles, and `SITE_RULES`, the closing rule `vindecoded-7` carries. Pure functions do the rest: `cardsOf()` orders the cards full before small and numbers the claims on from a given number, throwing on a missing look or claim or a stat whose claim isn't shown; `visibleText()` cuts a claim's closing rule, throwing if it's gone; `blocksOf()` splits a claim's text into paragraphs and lists; `sinceOf()` and `hostOf()` make the kicker's year and a link's label. The static tests call them with planted projects and claims.
- **The section (FR-001, FR-008, S1.1, S1.5).** `Side.astro` reads the projects and claims, counts the Hopper story's and Experience's receipts with `storyOf()` and spec 012's `cardsOf()` so its own number on, and renders the eyebrow, heading and cards, with spec 009's `Stats`. Each claim is `SideClaim.astro`, which renders a claim's blocks and its receipt as spec 011's `HopperClaim.astro` does. `v2.astro` adds it after `<Experience />`, and the header gains "On the side".
- **Styles (FR-008, FR-009, S4.4).** `styles/home/side.css` lays out the cards, the badges, the stats beside the name (wrapping under it on a phone), the claim lists and the links, each link with a 24-pixel target. It has no motion.
- **Docs (FR-011).** D132, D133, the plan's 3.4 and 3.5 rows, and the decision log.

## Tests

`tests/013/`, written from the scenarios, not locked:

- `static/side.test.ts`: `cardsOf()` on the real content (order, claims, numbering 19–23, proof and ask) and on planted projects and claims (a missing look, claim or stat claim throws; a project with no start); `visibleText()` and the rule; `blocksOf()`; every kicker, stat label and receipt title against its claims' words; the left-off claims absent from the looks; the evidence D133 adds; no motion, script or inline style in the section's files; the plan and decision log.
- `e2e/side.test.ts`: every claim in the built section against `claims.yaml`, and every other text against the labels and project files; the rule and the framing words absent from `/v2`; the order, headings, stats and links at both sizes; notes in the margin or in line; opening by marker, click, Enter and Space; the keyboard path and rings; the header link; no sideways scroll at 320; layout shift 0; the contrast of every pair.
- `e2e/a11y.test.ts`: axe in eight states.
- `e2e/visual.test.ts`: four section baselines, two open notes and two focus states, made with `pnpm test:visual tests/013 --update` in the pinned container, and spec 010's remade with `pnpm test:visual tests/010 --update`.
- Spec 010's S4.1 keyboard test, with the header's new link.

## What exists today

- `components/ds/`: `Claim`, `Receipt`, `ReceiptMarker`, `Stats`, `Eyebrow` and the card styles, from spec 009.
- `components/home/hopper.ts`'s `storyOf()` and `RECEIPT`, and `experience.ts`'s `cardsOf()`, from specs 011 and 012.
- `content/projects/` with each project's `display`, and `content/claims.yaml`, from spec 005.

## Alternatives considered

| Option                                                | Why not                                                                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| The board's two cards side by side                    | A half-width card can't keep each claim's note in the margin, and the small card would look the full one's equal. |
| Print `vindecoded-7` as written                       | Its last sentence is a rule for the site, not words for a visitor (D132).                                         |
| Show the counts as stats, apart from their lead       | The counts would lose their date and the claim's wording.                                                         |
| Reuse `HopperClaim.astro` and flatten lists to a line | A list run into one paragraph misreads, and changing spec 011's file would move its tests.                        |
| Restart the receipt numbers at 1                      | Two receipts numbered 1 on one page would confuse a screen reader and a reader following the numbers.             |

## Risks

- **A claim renumbered or reworded by an export** fails the build, since the looks name claim IDs and the rule is matched exactly. That's deliberate.
- **Spec 010's whole-page baselines** change with every new section, and are remade here, as specs 011 and 012 did.
- **Snapshots** come only from the pinned container, and `pnpm test:visual` breaks cost-guard's types until `pnpm install` runs again.

## Tasks

- T001 D132, D133, the plan rows, the evidence export, and the spec, plan and mocks for Gate 1.
- T002 Tests in `tests/013/` from the scenarios, and spec 010's changed test.
- T003 `side.ts`, `Side.astro`, `SideClaim.astro`, `side.css` and `/v2`, until the tests pass.
- T004 Snapshot baselines in the pinned container, and spec 010's remade.
- T005 Review with the pinned reviewer, then fix or answer each finding.
- T006 The pull request, marked ready, with the preview and the facts left out for Brad.
