# Plan for spec 012: Experience and the timeline

|        |                                                              |
| ------ | ------------------------------------------------------------ |
| Spec   | [spec.md](spec.md), approved with it at Gate 1 on 2026-11-05 |
| Status | Approved                                                     |

## Approach

The section is content-driven: the job files' `display` sets each job's room (D130), and the words are the claims, so a change in weighting or wording is a content change.

- **Content (FR-007, S3.5).** `content/schema.ts` gains `educationSchema` and `SUBJECT_FOLDERS`, which adds `education` to the folders a claim's subject can name. `content.config.ts` gains the `education` collection. `content/education/education.yaml` is written by hand, and `pnpm content:export` then writes the degree's public bullet as `education-1`; nothing else in `claims.yaml` changes.
- **Data and layout rules (FR-002–FR-006, S1.2–S1.4, S2.1–S2.3, S3.3–S3.4, S4.1).** `components/home/experience.ts` holds the eyebrow, heading and labels, each card job's look (kicker, claim IDs, tags, stats) and the receipts' titles. Pure functions do the rest: `cardsOf()` builds the featured card and cards newest first, numbering claims on from a given number and throwing on a missing look or claim; `barsOf()` places each job's bar; `datesOf()`, `yearsOf()` and `lineDatesOf()` format dates with spec 011's `monthOf()`; `anchorOf()` names each row's target. The static tests call them with planted jobs and claims.
- **The section (FR-001, FR-008, S1.1, S1.5).** `Experience.astro` reads the jobs, claims and education from the collections, counts the Hopper story's receipts with `storyOf()` so its own number on, and renders the eyebrow, heading, timeline, featured card (with spec 009's `Stats`), cards (with `Chips`) and the dated lines. Each claim is spec 011's `HopperClaim.astro`, so its receipt works as Hopper's do. `v2.astro` adds it after `<Hopper />`, and the header gains "Experience".
- **Styles (FR-008, FR-009, S5.4).** `styles/home/experience.css` lays out the timeline rows (a grid from 48rem, stacked below), the SVG bars' fills, the cards and the lines. It has no motion, and v1's `tokens.css` already keeps `components/home` and `styles/home` out of its sources.
- **Docs (FR-011).** D130, D131, the plan's 3.3 and 3.4 rows, and the decision log.

## Tests

`tests/012/`, written from the scenarios, not locked:

- `static/experience.test.ts`: `cardsOf()` on the real content (weighting, order, numbering 13–18, the proof claim) and on planted jobs and claims (a missing look or claim throws, a second featured job, a `present` end); `barsOf()` and the date helpers; every label, stat, tag and receipt title against its claims' words; the notes and left-off claims absent from `experience.ts`'s claim lists; the education schema, file and claim; no motion, script or inline style in the section's files; the plan and decision log.
- `e2e/experience.test.ts`: every paragraph and line in the built section against `claims.yaml` and the job files; the order, headings and weighting at both sizes; the timeline's rows, dates, links and hidden bars; notes in the margin or in line; opening by marker, click, Enter and Space; the keyboard path and rings; the header link; no sideways scroll at 320; layout shift 0; the contrast of every pair.
- `e2e/a11y.test.ts`: axe in eight states.
- `e2e/visual.test.ts`: four section baselines, two open notes and two focus states, made with `pnpm test:visual tests/012 --update` in the pinned container, and spec 010's remade with `pnpm test:visual tests/010 --update`.
- Spec 005's SC-004 test, updated as the spec says.

## What exists today

- `components/ds/`: `Claim`, `Receipt`, `ReceiptMarker`, `Stats`, `Chips`, `Eyebrow` and the card styles, from spec 009.
- `components/home/HopperClaim.astro`, `hopper.ts`'s `storyOf()` and `monthOf()`, from spec 011.
- `content/jobs/` with each job's `display`, and `content/claims.yaml`, from spec 005. Lighthouse already holds `/v2`'s CLS at 0.

## Alternatives considered

| Option                                             | Why not                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| The board's single bar chart, desktop only, hidden | It hides the timeline from phones and screen readers, and puts Hopper at the end rather than the top.           |
| Bars placed with inline styles or `define:vars`    | The Content-Security-Policy hashes styles, so an inline style per bar fails. SVG attributes aren't CSS.         |
| Show every public claim about each job             | Against D130's weighting: RealPage and enterprise IT get one line, and Bottle Rocket shows its range of brands. |
| Restart the receipt numbers at 1 in this section   | Two receipts numbered 1 on one page would confuse a screen reader and a reader following the numbers.           |
| Education as a hand-written line with no claim     | Against D129's rule. D131 puts it in the model instead.                                                         |

## Risks

- **A claim renumbered by an export** fails the build, since the looks name claim IDs. That's deliberate: the change is seen.
- **Spec 010's whole-page baselines** change with every new section, and are remade here, as spec 011 did.
- **Snapshots** come only from the pinned container, and `pnpm test:visual` breaks cost-guard's types until `pnpm install` runs again (spec 009's notes).

## Tasks

- T001 D130, D131, the plan rows, the education content and export, and the spec, plan and mocks for Gate 1.
- T002 Tests in `tests/012/` from the scenarios, and spec 005's changed test.
- T003 `experience.ts`, `Experience.astro`, `experience.css` and `/v2`, until the tests pass.
- T004 Snapshot baselines in the pinned container, and spec 010's remade.
- T005 Review with the pinned reviewer, then fix or answer each finding.
- T006 The pull request, marked ready, with the preview and the facts left out for Brad.
