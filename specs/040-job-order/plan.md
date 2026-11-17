# Plan 040: The job history in date order, with RealPage as a card

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1 on 2026-11-17. The "Show it" captures in [mocks/README.md](mocks/README.md) are this plan's first build, so the approach below is what they show.

## Approach

| Part            | Where                                                | How                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The weighting   | `content/jobs/realpage.yaml`                         | `display: card`. `cardsOf()` already sorts the featured job and the cards newest first by start month, so RealPage lands between Bleacher Report and BookShout with no change to the section's code, and the role pages, which render the same section, follow (D134).                                                                                                                                                                                      |
| RealPage's look | `components/home/experience.ts`                      | A `LOOKS.realpage` entry: the kicker "Real-estate apps", the claim `realpage-2` alone, and a "Tags" list of Kotlin, Java and RxJava, whose words are `realpage-3`'s, as Bottle Rocket's card shows one claim and its list (Brad's cards); one `RECEIPT_TITLES` entry made of `realpage-2`'s words. The card is the same `Experience.astro` markup as BookShout's and Bottle Rocket's, so its anchor, sparkle, reveal (D211) and pointer light come with it. |
| The heading     | `experience.ts`                                      | `HEADING` reads "Android for brands, a startup, real-estate apps and a sports media platform" (Brad's card): one line longer, 3 lines at 1440 and 4 at 375.                                                                                                                                                                                                                                                                                                 |
| The claims      | `content/claims.yaml`, from `pnpm content:export`    | The career session's notes drop `realpage-1`'s note and add `realpage-3` as a bullet tagged public under RealPage. Until that export lands, the branch carries Brad's approved words by hand, and the export must match them byte for byte (as spec 036 did). The notes folder's path is never written in the repo.                                                                                                                                         |
| The corpus      | `corpus/corpus.ts`                                   | `SITE_NOTES` drops `realpage-1`, since `factOf()` fails the build when a claim stops ending with its note. `receiptsOf()` already sends a card's claims to their `receipt-` anchors, so `realpage-2` moves to `#receipt-realpage-2`; `realpage-3`, `realpage-1` and `job-realpage` keep `#experience-realpage`, which is now the card.                                                                                                                      |
| The PDFs        | `styles/resume/print.css`                            | `resumeOf()` already prints a card job's claims as bullets, newest first (D142), so RealPage prints `realpage-2` with no code change. On Brad's card the page's top and bottom margins tighten to 36 and 40 px, the section headings' gaps to 12 and 6 px and the jobs' to 8 px, with the type and line height unchanged. The build checks two identical prints, spec 015's test two pages, and `pnpm site:pdf` runs veraPDF.                               |
| The evals       | `apps/evals/src/cases.ts`, `apps/evals/changed.json` | `facts-receipt-realpage-2`, titled "“Ask about this” on “Led Android across real-estate apps”", asking its sparkle's question and citing its claim; `facts-realpage-stack`, citing `realpage-3` and naming the three; and `facts-realpage` accepting `realpage-3`. A push to `evals/040-job-order` runs the changed run (D228), which asks these with the cases already new since the last full run, for cents; its `changed.json` is committed.            |

## Measured on this build

On a local preview of the production build on 2026-11-16, built in the pinned container, against v2.10.0's built heights (spec 039), with reduced motion:

| Page         | At 1440 × 900 | At 375 × 812 |
| ------------ | ------------- | ------------ |
| `/` v2.10.0  | 8,074         | 12,773       |
| `/` here     | 8,313         | 13,077       |
| `/mobile`    | 8,999         | 14,092       |
| `/fullstack` | 8,977         | 14,078       |
| `/ai`        | 8,900         | 13,958       |

The home grows by 239 px on a desktop and 304 px on a phone: RealPage's card in place of its line, and a heading one line longer. The Experience section is 1,958 px at 1440 and 2,985 px at 375.

The PDFs, printed in the pinned container, as the room under the last line of page 2 (the space Education would need is about 69 pt, its heading and its two lines):

| PDF        | Main           | RealPage's sentence, spacing as today | Sentence, tighter margins and gaps | Sentence, line height 1.32 and tighter gaps | Both lines, line height 1.3, tighter margins and gaps |
| ---------- | -------------- | ------------------------------------- | ---------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Mobile     | 21 pt, 2 pages | 3 pages                               | 13 pt, 2 pages                     | 13 pt, 2 pages                              | 14 pt, 2 pages                                        |
| Full-stack | 37 pt, 2 pages | 3 pages                               | 29 pt, 2 pages                     | 29 pt, 2 pages                              | 30 pt, 2 pages                                        |
| Applied AI | 17 pt, 2 pages | 3 pages                               | 43 pt, 2 pages                     | 42 pt, 2 pages                              | 43 pt, 2 pages                                        |

Tighter margins and gaps: the page's top and bottom margins 40 and 48 px to 36 and 40, the section headings' 16 and 8 px to 12 and 6, and the jobs' 10 px to 8, with the type and line height unchanged.

## Alternatives considered

- **Leave RealPage a line and move its line above BookShout's card:** date order without a card, but Brad asked for a card.
- **A card with no tag row:** one sentence alone, but Brad chose the tech row.
- **Tags from `realpage-2`'s own words:** it names no technology, so the row needs a claim that does.
- **The tech claim as its own sentence on the card, as the brief drafted:** a second line with its own sparkle, then the same three words as tags, like BookShout's card. Brad chose the sentence and the tags alone on the Gate 1 card, as "Sentence + tech row" reads; the PDFs would also have needed line height 1.3 (M3b, M6b).
- **Line height 1.32 in place of the page margins:** the same room, but the body's own leading tightens; Brad chose the margins and gaps.

## Risks

- **The PDFs' fit.** Each PDF had about a line to spare on main; RealPage's sentence takes two, so the margins and gaps tighten (Brad's card), and the mobile PDF keeps 13 pt under its last line. A later claim of a line could tip it again; spec 015's two-page check fails the tests when it does, and spec 040's names the tightest PDF's room.
- **The chat's links until a redeploy.** The deployed chat API bundles v2.8.0's corpus, so it sends RealPage's claims to `#experience-realpage` until a release and a redeploy, each on Brad's go-ahead. That anchor is now the card, so every such link still lands.
- **A changed run asks older cases too.** The cases new since the last full run (spec 036's three and spec 038's ten) are asked again with RealPage's. A flaky one fails the run; it's asked once more in plain view (D228), and a failure is reported to Brad, never rerun quietly.
- **Many baselines.** The home's and role pages' snapshots change from the Experience section down; each is redrawn in the pinned container, and the reviewer checks that no test was weakened. Specs 001–003 name none of these, so their locks hold.

## Tasks

| ID   | Task                                                                                                                                        | Covers             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| T001 | Gate 1: Brad's cards and approval; edit the answers into the spec and plan; send the tag claim's words to the career session                | all                |
| T002 | `tests/040/`: static tests of the look, order, words, corpus, cases and PDFs' model; e2e tests and snapshots of every state                 | every ID           |
| T003 | Amend the tests and baselines of specs 005, 012, 015, 017, 020, 030 and 038 that pin today's weighting, order or counts                     | FR-009             |
| T004 | Finish the build to the approved cards; re-export once the notes hold `realpage-3`, and check the bytes; measure the pages, PDFs and module | FR-001–FR-008      |
| T005 | The changed run from `evals/040-job-order`, and its `changed.json`                                                                          | FR-007, S4.3, S4.4 |
| T006 | D238, `docs/plan.md`'s slice 5.13, `docs/decisions/README.md`, and the notes in specs 005, 012, 015, 020 and 038                            | FR-010             |
| T007 | The full suite locally, then the review skill's reviewer; fix or answer each finding                                                        | all                |
| T008 | Brad's "push", then main's `ci`, `next` and push runs green, and the open code-scanning alerts listed                                       | Gate 2             |

## Preview and rollback

`next` shows the slice once it's on main. Undoing it is a revert of the slice's commits on main; bradthome.com doesn't change until a release, and v2.10.0's rollback stays v2.9.0.
