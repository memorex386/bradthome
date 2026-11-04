# Plan for spec 005: Content model

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved with this plan at Gate 1 |
| Status | Approved |

## Approach

**One schema module.** `apps/site/src/content/schema.ts` holds the three schemas, built with `astro/zod` (Zod 4) and `z.strictObject`, so an unknown field fails (FR-002–FR-005, FR-007). It imports nothing from `astro:content`, so plain Node can load it: the export, the tests and `content.config.ts` all use the same file. A shared refinement rejects any string holding a Windows drive path (`[A-Za-z]:\`) or a home folder (`/Users/`, `/home/`) (FR-007). Months are `YYYY-MM`. Links are `https` URLs. A claim's `visibility` is `z.literal('public')` (S2.2).

**The collections.** `apps/site/src/content.config.ts` defines (FR-001):

- `jobs`: `glob({ pattern: '*.yaml', base: './content/jobs' })`
- `projects`: `glob({ pattern: '*.yaml', base: './content/projects' })`
- `claims`: `file('content/claims.yaml')`, an object keyed by claim ID, so the ID isn't a field the strict schema has to allow

The claims schema adds one check at build time: its `subject` must be the name of a file in `jobs/` or `projects/`, read from disk when the config loads (FR-006, S2.3). Astro's `reference()` doesn't check that an entry exists until a page reads it, and no page reads claims yet.

**Where the entries sit.** In `apps/site/content/`, beside `src` rather than in it. Spec 003's locked FR-006 test reads every file under `src` and allows no host but the site's own and the repo's, and evidence links name other hosts. They're data, not requests the page makes, so they sit outside `src` and that test stays as it is.

**The seeded entries.** Six jobs and two projects, each a few lines of YAML (FR-016, S3.1–S3.4, D109):

| File | Display | Dates | Notes |
| --- | --- | --- | --- |
| `jobs/hopper.yaml` | `story` | 2022-04 to 2026-10 | First in every role. The end is one line (D67) |
| `jobs/bleacher-report.yaml` | `featured` | 2019-09 to 2022-04 | Senior Android Developer |
| `jobs/realpage.yaml` | `line` | 2018-04 to 2019-09 | Lead Android Developer |
| `jobs/bookshout.yaml` | `card` | 2017-11 to 2018-03 | Senior Mobile Engineer |
| `jobs/bottle-rocket.yaml` | `card` | 2015-10 to 2017-11 | Android Developer |
| `jobs/enterprise-it.yaml` | `line` | 2008-11 to 2015-10 | Harley-Davidson and Infosys, summary "enterprise IT, 2008–2015" |
| `projects/vindecoded.yaml` | `card` | 2015-05 to present | Founder & Principal Engineer, https://vindecoded.com |
| `projects/sudoku-world.yaml` | `small` | none | https://sudokuworld.app |

Every entry appears under `mobile`, `fullstack` and `ai`, in reverse date order, with Hopper first. Slice 3.6 tunes the orders.

**The export.** `scripts/content/export.ts`, run as `pnpm content:export`, with its logic in `scripts/content/notes.ts` so the tests call it directly:

1. Resolve the folder from `--notes` or `BRADTHOME_NOTES`, and stop if neither names an existing folder (S1.5, FR-008).
2. List the folder's top-level `.md` files, sorted, skipping `README.md`. It never lists subfolders, so `raw/` is never opened (S1.7).
3. Parse each file line by line. Headings of level 1 and 2 set the context. A bullet starts at a line beginning `- ` and runs until the next such line, heading or unindented text, so nested lists and continuation lines stay with it (FR-010).
4. Split the tag `*(source · who)*` at the bullet's end on its last ` · `. Only `who` exactly `public` passes (FR-009, S1.1). Others are counted as `interview`, `private`, none or other.
5. Find the subject: the nearest level-2 heading, then level-1, whose name before ` · ` slugifies to the ID of a file in `jobs/` or `projects/`. A level-2 heading that isn't the subject becomes the `topic` (FR-011, S1.3).
6. Take `https` links out of the source as evidence, count `http` ones, and drop the rest of the source (FR-010, S1.2).
7. Number the claims within each subject and topic, build the YAML with the `yaml` package's fixed options, check every claim with the schema, and scan the text with `scripts/lib/terms.ts` (FR-012, FR-013, S1.4, S1.6).
8. Write to a temporary file beside `claims.yaml` and rename it over, so a failed run leaves the old file. Print the report (FR-014).

The script reads the notes only through its argument or environment variable, and no test or doc names a real path (FR-015).

**Checks.** The root tsconfig already includes `scripts/**`, and it follows the import into `schema.ts`, so `pnpm typecheck` and the Stop hook cover both. ESLint and Prettier already cover `apps/site` and `scripts/`, and `astro check` covers the config. The build in CI runs the content sync, so S2 holds on every pull request.

## What exists today

- Spec 003's skeleton in `apps/site`: one page, Astro 7.4.5, no content collections. Its locked tests read `apps/site/src` for hosts and motion.
- The notes, with three topic files and a `raw/` folder, in the format their README gives.
- `scripts/lib/terms.ts`, the private-term loader and line scanner the hooks use.
- The `yaml` package at the root, 2.9.1.

## Alternatives considered

| Option | Why not |
| --- | --- |
| The export in the private notes, opening its own pull request (D44 as first written) | Untested by CI, with a second copy of the schema (D108) |
| Jobs and projects parsed from the notes' headings | Headings carry no public tag, and the positioning isn't in the notes (D109) |
| One claim per file | A re-export touches dozens of files. One file is one diff |
| Claims as a list with an `id` field | The strict schema would have to allow `id`. Keying by ID keeps the entry to its fields |
| Astro's `reference()` for `subject` | It doesn't check the entry exists until a page reads it |
| Keeping each claim's source wording | Sources can hold file names and paths. Links are what visitors and the chat need |
| A hash of the text as the claim ID | Stable across inserts, but changes on every wording fix, and unreadable in a diff |

## Decisions

- [D108](../../docs/decisions/0108-the-content-export-script-lives-in-the-site-repo.md): the export lives in the repo.
- [D109](../../docs/decisions/0109-jobs-and-projects-are-written-by-hand-claims-are-exported.md): jobs and projects are hand-written; claims are exported.

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A non-public fact reaches the repo | Low | Exact-match tag check, the private-term scan before writing, the hooks and CI's privacy job on the commit, and Brad's review of the diff |
| A public bullet reads as a note about the site, not a fact | Medium | The pull request lists them, so Brad can reword or retag them in the notes |
| The notes' format drifts and the parser drops facts | Medium | Every drop is counted in the report. A bullet that loses its tag is dropped, never let through |
| Claim IDs shift after an insert | Medium | Nothing links to them yet. Slice 4.1 can switch to stable IDs if the chat needs them |
| Astro changes how it validates content | Low | S2's integration test runs the real `astro sync` |

## Tests to write

Not locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)). All in `tests/005/`, with made-up notes in `tests/005/fixtures/notes/` (FR-015).

| ID | Test file | Test name includes |
| --- | --- | --- |
| S1.1–S1.7, FR-008–FR-014, SC-001 | `unit/export.test.ts` | each ID, running the export over the fixture notes into a temp folder |
| S2.1–S2.4, FR-002–FR-007 | `unit/schema.test.ts` | each ID, over valid and planted entries |
| S2.1–S2.5, FR-001, FR-006, SC-002 | `integration/sync.test.ts` | each ID, running `astro sync` on a copy of the content with one fault at a time |
| S3.1–S3.4, FR-016 | `static/seed.test.ts` | each ID, reading the committed files |
| FR-015, SC-003 | `static/privacy.test.ts` | each ID, checking the repo holds no notes path, the script has no default, and the committed claims pass the schema and `pnpm terms` |
| SC-004 | `static/build.test.ts` | `SC-004`, checking that no page reads the collections yet |

## Tasks

- [ ] **T001** Write the tests above, before the code (all IDs).
- [ ] **T002** Add `schema.ts` and `content.config.ts` (FR-001–FR-007).
- [ ] **T003** Seed the jobs and projects (FR-016).
- [ ] **T004** Build `scripts/content/` and `pnpm content:export` until the export tests pass (FR-008–FR-014).
- [ ] **T005** Run the export over Brad's notes, check the output, and commit `claims.yaml` (SC-003).
- [ ] **T006** Docs: AGENTS.md's repo map, the plan's row, the decision index.
- [ ] **T007** Review with the pinned reviewer, and handle every finding.

## Preview and rollback

The page doesn't change, so the preview shows the same empty page. To roll back, revert the pull request: nothing outside the repo changes.

## Approval

- Gate 1: approved by Brad, with the spec, in the slice 2.3 session on 2026-11-03 ([recorded on the pull request](https://github.com/memorex386/bradthome/pull/26#issuecomment-6621633273)).
