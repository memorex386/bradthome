# Plan for spec 011: The Hopper story

|        |                                                                     |
| ------ | ------------------------------------------------------------------- |
| Spec   | [spec.md](spec.md), approved with this plan at Gate 1 on 2026-11-04 |
| Status | Approved                                                            |

## Approach

The section is content-driven: it reads the Hopper claims and lays them out by topic, so Brad's notes arrive as an export with no code change (D129).

- **Data and layout rules (FR-002–FR-005, S2.1–S2.5, S3.1–S3.3).** `components/home/hopper.ts` holds the heading, each known topic's kicker, heading and tags, each receipt's title and the receipt's fixed labels. Its `storyOf()` sorts the claims by order, puts "Role and dates" under the heading, drops the "Stack" note, gathers "Quote" claims for the end, groups the rest by topic in order of first appearance, and numbers every claim from 1 in that order. A claim with evidence is proof, and one without asks. It's a pure function, so the static tests plant claims, topics and quotes without touching the content.
- **The section (FR-001, FR-006, S1.1–S1.3).** `Hopper.astro` reads `getCollection('claims')` filtered to Hopper and `getEntry('jobs', 'hopper')`, throws when either is missing, and renders the band: the eyebrow from the job's dates, the heading, the role claims, then an ordered list of topic cards. `HopperClaim.astro` renders one claim with spec 009's `Claim`, `ReceiptMarker` and `Receipt`, so the notes sit in the margin from 64rem and in line below. `v2.astro` swaps the stub for `<Hopper />`, and hero.css loses the stub's rule.
- **Styles (FR-006, FR-007, S4.4).** `styles/home/hopper.css` lays out the band, the cards and the quote, and gives a note's links the page accent rather than the band's, since a note is a light surface in the light theme. It has no motion. v1's `tokens.css` already keeps `components/home` and `styles/home` out of its sources.
- **The hero's button (S4.2).** It already links `#hopper`. Only `hero.ts`'s comment changes.
- **Docs (FR-009).** D129, the plan's 3.2 and 3.3 rows, and the change log.

## Tests

`tests/011/`, written from the scenarios, not locked:

- `static/hopper.test.ts`: `storyOf()` on the real claims (order, numbering, ask state, the Stack note left out) and on planted claims (a new claim, topic, quote and evidence link); every tag and receipt title against its claims' words; the receipt's fixed labels; the eyebrow's dates; no motion, script or inline style in the section's files; the plan and decision log.
- `e2e/hopper.test.ts`: every paragraph in the built section against `claims.yaml`; the order and headings at both sizes; notes in the margin or in line; opening by marker, click, Enter and Space; the keyboard path and rings; the hero's button and header link reaching the section; no sideways scroll at 320; layout shift 0; the contrast of every pair.
- `e2e/a11y.test.ts`: axe in eight states.
- `e2e/visual.test.ts`: four section baselines, two open notes and two focus states, made with `pnpm test:visual tests/011 --update` in the pinned container.
- Spec 005's SC-004 test and spec 010's S4.2 tests, updated as the spec says.

## What exists today

- `components/ds/`: `Claim`, `Receipt`, `ReceiptMarker`, `Card` styles, `Chips` and `Eyebrow`, from spec 009, used as they are.
- `pages/v2.astro` and the hero, from spec 010.
- `content/claims.yaml` and `content/jobs/hopper.yaml`, from spec 005. Lighthouse already collects `/v2` and holds its CLS at 0.

## Alternatives considered

| Option                                                          | Why not                                                                                                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The board's two-column grid of cards                            | The notes need a margin column. In a half-width card they'd crowd the claim, or always sit in line, which loses the C résumé's look on a desktop. |
| Write each topic's claims into the page by ID, as the hero does | A new claim or topic would need a code change, against D129.                                                                                      |
| A new "quote" field in the content schema                       | It changes spec 005's schema and export. A claim with the topic "Quote" needs neither.                                                            |
| Show the "Stack" claim as a sentence                            | It reads as a note about the other bullets, not a claim a visitor would read.                                                                     |

## Risks

- **A topic renamed in the notes** loses its kicker and tags. It still shows, and the static test that pins the five topics fails, so the change is seen.
- **Spec 003's link checks** read every anchor in the build. The ask-me link is a `mailto:` to bradthome.com, which they already allow on the gallery.
- **Snapshots** come only from the pinned container, and `pnpm test:visual` breaks cost-guard's types until `pnpm install` runs again (from spec 009's notes).

## Tasks

- T001 D129, the plan rows, and the spec, plan and mocks for Gate 1.
- T002 Tests in `tests/011/` from the scenarios, and spec 005 and 010's changed tests.
- T003 `hopper.ts`, `Hopper.astro`, `HopperClaim.astro`, `hopper.css` and `/v2`, until the tests pass.
- T004 Snapshot baselines in the pinned container.
- T005 Review with the pinned reviewer, then fix or answer each finding.
- T006 The pull request, marked ready, with the preview and the facts left out for Brad.
