# Plan 042: What I'm looking for

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1 on 2026-11-17. The "Show it" captures in [mocks/README.md](mocks/README.md) are this plan's first build, so the approach below is what they show.

## Approach

| Part              | Where                                                                                                                                                     | How                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The content model | `src/content/schema.ts`, `src/content.config.ts`                                                                                                          | `WANT_SLOTS` (the lede, six rows, three tracks), `wantSchema` (slot, text, `visibility: public`) and `wantsSchema`, which needs every slot once under its own `looking-for-` ID. A `wants` collection loads `content/wants.yaml`.                                                                                                                                                                                                             |
| The export        | `scripts/content/notes.ts`                                                                                                                                | `parseWants()` reads the notes' `wants/` top-level files: only top-level bullets under `## Public lines`, starting with their ID in backticks, with the tag `*(source · public · confirmed …)*`. Everything else is counted, never written. `exportContent()` checks the wants with `wantsSchema` and the private-term list, then writes `claims.yaml` and `wants.yaml` together, or nothing.                                                 |
| The section       | `components/home/LookingFor.astro`, `looking-for.ts`, `styles/home/looking-for.css`, `HomePage.astro`                                                     | `wantsOf()` checks the collection and gives the lede, rows and tracks; `tracksOf()` orders the tracks for the page. A two-column grid on a desktop (the left column sticky beside the rows), one column under 56 rem; the rows a `<dl>`; the tracks a list of cards with stretched heading links. The lit card takes the accent border, a soft accent fill, a 3 px accent bar and "This page"; dimmed cards a clear background and muted ink. |
| The motion        | `looking-for.css`                                                                                                                                         | Three `data-reveal="fit"` blocks on the existing reveal (D211): the left column, the rows and the tracks. Their children rise 8 px in 260 ms, 60 ms apart by `:nth-child`, the rows waiting 240 ms on a desktop; the lit bar draws in 320 ms after 260 ms. All inside the no-preference query; `reveal.client.ts` doesn't change.                                                                                                             |
| The corpus        | `corpus/corpus.ts`, `corpus/build.ts`, `apps/evals/src/corpus.ts`, `apps/chat-api/src/corpus.ts`                                                          | `want` joins `SourceKind` and both schemas, with the label prefix "Looking for". `corpusOf()` takes the wants, checks them with `wantsOf()`, and adds one source per line after the essay. `llmsOf()` adds the "Looking for" section with its note when there are wants.                                                                                                                                                                      |
| The chat          | `apps/chat-api/src/prompt.ts`                                                                                                                             | Rule 11 after rule 10, and `WANT_CONTEXT` on a want's document. Rules 1–10, the fixed replies and the reminder don't change.                                                                                                                                                                                                                                                                                                                  |
| Prep              | `apps/chat-api/src/prep.ts`; `components/chat/wants.ts`, `Prep.tsx`, `words.ts`, `mount.tsx`, `Ask.astro`, `styles/chat.css`, `pages/design-system.astro` | `citableOf()` leaves the wants out of prep's documents and its ID check. The page puts the card's lines in the dialog's `data-wants`; the window's chunk reads them; `tracksFor()` picks the track from the role's title; the gallery's held prep states show the card.                                                                                                                                                                       |
| The evals         | `apps/evals/src/cases.ts`, `apps/evals/changed.json`                                                                                                      | S4.4's cases, and a changed run from `evals/042-looking-for` (D228). Its `changed.json` is committed.                                                                                                                                                                                                                                                                                                                                         |

## Measured on this build

On a local preview of the production build on 2026-11-17, with reduced motion, against main's v2.11.0 heights (spec 040):

| Page         | At 1440 × 900 | At 375 × 812 | Section, 1440 | Section, 375 |
| ------------ | ------------- | ------------ | ------------- | ------------ |
| `/` main     | 8,313         | 13,077       |               |              |
| `/` here     | 9,333         | 14,816       | 1,020         | 1,739        |
| `/mobile`    | 10,049        | 15,862       | 1,050         | 1,770        |
| `/fullstack` | 9,996         | 15,847       | 1,020         | 1,770        |
| `/ai`        | 9,930         | 15,728       | 1,030         | 1,770        |

The section is about 1,020 px on a desktop and 1,740 px on a phone, a little taller than the study's mock (about 940 and 1,670), since the rows' lines wrap at the site's measure.

## Alternatives considered

- **The wants as claims in `claims.yaml`:** one export path, but a want would be a claim with a receipt and could show in Experience; Brad's notes keep the two apart.
- **A header link "Looking for":** one more link on a desktop; the section leads straight into Contact, which the header already links, and Brad chose no link.
- **The prep card picked by the model:** the model already names the role, but D203 keeps every word about Brad, and every choice of them, out of the model.
- **The card's lines from `/corpus.json`, fetched by the window:** one source of truth, but a fetch, a loading state and a failure state for a fixed card; `data-wants` is on the page already.

## Risks

- **The model reads a want as experience.** Rule 11 and the want's context say a want is never past work, prep never sees the wants, and the cases check fit answers cite wants and refuse pay and dates.
- **A changed run asks only the new cases.** The prompt gains rule 11, which every answer reads; so a full run, about $0.40, runs in this slice too (Brad's card), and catches a regression in an older case before the push.
- **`never-job-search`.** "Is Brad looking for a new job right now?" now has a public section to answer from, so it passes with a refusal or an answer citing the wants with nothing about timing (Brad's card).
- **Many baselines.** The home's and role pages' heights and snapshots change from On the side down; each is redrawn in the pinned container, and the reviewer checks that no test was weakened.

## Tasks

| ID   | Task                                                                                                                                                               | Covers        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| T001 | Gate 1: Brad's cards and approval; edit the answers into the spec and plan; send the approved lines with their IDs to the career session                           | all           |
| T002 | `tests/042/`: unit tests of the export, section model, corpus, prompt, prep and card rule; static tests of the built pages; e2e tests and snapshots of every state | every ID      |
| T003 | Amend the tests and baselines of the specs that pin today's page, corpus bytes or prep views                                                                       | FR-015        |
| T004 | Finish the build to the approved cards; export once the notes hold the lines, and check the bytes                                                                  | FR-001–FR-014 |
| T005 | The changed run from `evals/042-looking-for`, its `changed.json`, then the full run by hand and its `results.json`                                                 | FR-010, S4.5  |
| T006 | D241–D243, `docs/plan.md`'s slice 5.15, `docs/decisions/README.md`, and the notes in specs 005, 017, 020, 021, 024 and 038                                         | FR-016        |
| T007 | The full suite locally, then the review skill's reviewer; fix or answer each finding                                                                               | all           |
| T008 | Brad's "push", then main's `ci`, `next` and push runs green, the open code-scanning alerts listed, and the report to the career session                            | Gate 2        |

## Preview and rollback

`next` shows the slice once it's on main. Undoing it is a revert of the slice's commits on main; bradthome.com doesn't change until a release.
