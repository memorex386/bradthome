# Plan for spec 020: The corpus

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved 2026-11-07 |
| Status | Approved |

## Approach

The corpus is built from plain data by one pure function, `corpusOf` in `apps/site/src/corpus/corpus.ts`, so the tests run it on the real content with plain Node, and the build runs the same code. Two prerendered Astro endpoints, `pages/corpus.json.ts` and `pages/llms.txt.ts`, read the jobs, projects and claims collections and the essay's MDX source through `corpus/build.ts`, and write `dist/corpus.json` and `dist/llms.txt` (FR-001).

- **Public only (FR-002).** Astro's content step already refuses a claim that isn't marked `public` (spec 005). `corpusOf` parses each claim again with the same `claimSchema` and throws, so the corpus doesn't rest on one check.
- **Notes to the site (FR-003).** `SITE_NOTES` names each claim's closing note exactly, as `side.ts` does for `vindecoded-7` (spec 013): `bookshout-1`, `realpage-1` and `vindecoded-7`. `factOf` cuts it and throws if the claim stops ending with it. A claim with no entry that holds note words, such as "the site" or "never say", throws too.
- **Links (FR-005).** A claim links its receipt on the home when it has one. `corpusOf` finds those with the home's own `storyOf` and `cardsOf`, so the corpus and the page can't disagree. Anything else links its job's, project's or Hopper topic's place, with `anchorOf` from `experience.ts`. The essay's anchors follow github-slugger, which Astro's Markdown uses. The end-to-end and static tests check every link against the built HTML.
- **IDs (FR-004, FR-009).** Claims keep the export's IDs. Jobs and projects are `job-` or `project-` plus their file's name. The essay's sections have fixed IDs in `ESSAY_SECTIONS` (D181).
- **Formats (FR-006, FR-007).** The JSON's shape is in the spec, at `version` 1. `llmsOf` writes llmstxt.org's format from the same sources (D180).
- **Live (FR-010).** Nothing else changes, and v2.0.1 releases both files after main is green, on Brad's approval in `production` (D179).

## What exists today

- `apps/site/content/`: the job, project and education files, and `claims.yaml`, written by `pnpm content:export` (spec 005).
- `apps/site/src/content/schema.ts`: `claimSchema`, whose `visibility` is `z.literal('public')`.
- `apps/site/src/components/home/`: `hopper.ts`, `experience.ts` and `side.ts`, which lay the claims out and give each shown claim its `receipt-<id>` anchor.
- `apps/site/src/pages/vindecoded-agents.mdx`: the essay, with 13 level-2 sections.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Read the built HTML for the corpus, after the pages build | It would tie the corpus to markup, and Astro gives an endpoint no ordering against pages |
| Hash each source's words into its ID | The ID would change with every rewording, which the chat's citations and 4.4's frozen cases can't allow |
| Link every claim to its section only | Less precise. Most claims have a receipt that opens on the fact |
| Change the export to number claims by a fixed key | Out of scope (spec 005). The renumbering risk is an edge case, caught by S3.3 |
| An `llms-full.txt` beside `llms.txt` | D180 chose one file |

## Decisions

- D179, `docs/decisions/0179-the-corpus-ships-on-live-now.md`
- D180, `docs/decisions/0180-llms-txt-follows-llmstxt-org-with-every-source-inline.md`
- D181, `docs/decisions/0181-the-essay-goes-in-by-section.md`
- Tier 3, decided here: the JSON's fields and `version` 1; IDs `job-…`, `project-…` and `essay-…`; labels in the chat designs' "Kind · Name" form; the essay's author named in the JSON and in `llms.txt`'s preamble; the degree's facts only through its claim, `education-1`; and absolute links to bradthome.com from every build.

## Size

Estimated as characters over 4: `corpus.json` is about 11,000 tokens and `llms.txt` about 9,200. The sources' text alone is about 7,300. That's a little over the plan's 10,000-token figure, and still small at Haiku 5.5's prices. Slice 4.2 counts the real figure with the API's token counter when it builds the prompt.

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A re-export adds a note to the site that the word list misses | Low | The list covers the notes seen so far. The review of each re-export reads the corpus, and slice 4.4's never-say suite checks answers |
| A notes bullet added above others renumbers claim IDs | Medium | S3.3 fails when an ID disappears. 4.4's frozen cases catch an ID whose words moved |
| github-slugger's rules differ from `anchorOf` for a future heading | Low | The static and end-to-end tests check every anchor against the built page |
| The JSON grows past the cost figures | Low | SC-003 fails at 15,000 estimated tokens |

## Tests to write

| ID | Test file | Test name includes |
| --- | --- | --- |
| S1.1, S1.3, S1.4, S1.5, S2.2, S2.3, S3.1–S3.4, S4.1–S4.3, S5.2, FR-001–FR-007, FR-009, SC-002, SC-003 | `tests/020/unit/corpus.test.ts` | each ID |
| S1.2, FR-002, SC-002 | `tests/020/integration/sync.test.ts`, with a unit test of `corpusOf` | `S1.2` |
| S1.6, S2.1, S5.1, FR-005, FR-008, FR-010, SC-001, SC-004 | `tests/020/static/built.test.ts`, over the build when there is one | each ID |
| S2.1, S4.4, SC-001 | `tests/020/e2e/corpus.test.ts`, in the pinned container | each ID |

## Tasks

- [x] **T001** `corpus.ts`, `essay.ts`, `build.ts` and the two endpoints, drafted for "Show it" (FR-001–FR-009)
- [ ] **T002** The unit, integration and static tests, from the scenarios
- [ ] **T003** The end-to-end test, run with `pnpm test:visual tests/020`
- [ ] **T004** Build until every check passes, the full suite included
- [ ] **T005** Review with the pinned reviewer, and fix or answer each finding
- [ ] **T006** Plan and AGENTS.md updates: 4.1 done, the repo map's new folder
- [ ] **T007** Gate 2: Brad says push. Rebase on `origin/main`, push, and watch main's `ci`
- [ ] **T008** v2.0.1: a separate go-ahead on a card once main is green, then the release and its record (D179)

## Preview and rollback

There are no pull requests while D161 holds, so the `next` channel shows the files once the branch is on main. Rolling back is a revert commit on main, or, after v2.0.1, `pnpm release:rollback` to v2.0.0.

## Approval

- Gate 1: approved by Brad on a card in the slice 4.1 session, 2026-11-07
