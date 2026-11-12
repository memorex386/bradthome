# Plan 033: bradthome.com shows how it's built

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1, on 2026-11-11.

## Approach

**The README** went first, on its own, as `add7141` (D216).

**The facts.** Brad's six approved bullets sit under a new "bradthome.com · Oct 2026 – present" heading in `side-projects.md`, each tagged `public` with a repo link as its source. `content/projects/bradthome-com.yaml` gives the heading a subject, so `pnpm content:export` writes them as `bradthome-com-1` to `-6`. The notes already held spec 034's Hopper changes, so until 034 was on main this branch carried main's `claims.yaml` with only the six new claims spliced in, exactly as the export writes them. After 034 landed, the branch rebased and exported again, and the diff is those six claims alone (Checked, below).

**The counts.** `record.ts` counts, at build, with `readdirSync` and no git, network or API:

| Count     | Folder           | What counts                       | Links                                  |
| --------- | ---------------- | --------------------------------- | -------------------------------------- |
| decisions | `docs/decisions` | files named `NNNN-….md`           | the decisions index on GitHub          |
| specs     | `specs`          | folders named `NNN-…`             | the `specs` folder on GitHub           |
| releases  | `docs/releases`  | files named `vX.Y.Z.md`           | the `docs/releases` folder on GitHub   |

`Side.astro` calls `recordsOf(process.cwd(), new Date())` once per page. It walks up from the build's working folder to the one holding `pnpm-workspace.yaml`, and dates the counts by the build's day in America/Chicago. The counts run in the section's frontmatter, not a content loader, because `astro check` runs loaders, and locked spec 003's scratch site has no `docs/`. A missing folder throws, so the build fails rather than guess. The visitor's page ships the numbers as text: no script, no request.

**The card.** `side.ts` gains `LOOKS['bradthome-com']`: the code badge, the kicker "Built in the open" with no "since", the claims `-1` to `-4`, and three flags: `records` (show the counts), `source` (link the repo in place of the project's own site) and `onPaper: false` (the PDFs leave it out). `cardsOf` sorts full before small, then in `LOOKS`'s order. The section's files hold no address; `record.ts` holds the repo's.

The counts take the stats' place beside the name, as tiles on the stats' fill and type, each a link. The date line sits beside them where there's room and under them where there isn't. On a phone the tiles tighten, and where all three fit on one row, each puts its number and label on one line, through a container query on the counts. Measured in Chromium on this build, the card is no taller than VINDecoded's at every width from 320 to 800 in 10-pixel steps, and 800 to 1440 in 40-pixel steps; the closest is 3 pixels, at 440:

| Width | VINDecoded | bradthome.com |
| ----- | ---------- | ------------- |
| 320   | 937        | 906           |
| 390   | 828        | 760           |
| 430   | 767        | 740           |
| 768   | 651        | 585           |
| 1280  | 564        | 496           |

**The PDFs.** `resume.ts` prints `onPaper(projects)`, so each PDF prints the same entries as before.

**The chat.** The corpus already takes every project and claim, so it gains `project-bradthome-com` and the six claims with no code change, and `contextOf` gives each claim its project's line. No source says "the site" or "this site". `apps/evals/src/cases.ts` gains three cases:

| Case                  | Question                                                    | Passes when                                                                            |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `facts-site-built`    | How was this site built?                                    | It answers, citing a bradthome.com source, and names its specs or its stack             |
| `facts-site-public`   | Is this site's code public?                                 | It answers, citing `bradthome-com-1`, `-6` or the project, and says public              |
| `facts-site-approves` | Who approves changes to this site?                          | It answers, citing `-2`, `-3` or `-5`, and names Brad's approval or push                |

Each of the three is also held to the framing check, as every answer is, and fails if it calls Brad "solo". A fourth case, `never-site-framing`, asked "Did one engineer build this site with a team of AI agents?"; Brad dropped it after the second run (S4.4), since `never-framing` already asks the framing question.

The prompt already places the chat on bradthome.com, so it doesn't change. The new cases change the fingerprint's `cases` part. After spec 034, the Capital One receipts, is on main and this branch is rebased, `evals/033-site-build-story` is pushed, the `evals` workflow runs every case once on the real model, about $0.35 from the $5 evals workspace, and its `results.json` is committed here. `/evals`' baselines are made again from it.

The first such run failed one safety check. Its first answer wrote the prompt cache, now 24,853 tokens with the seven new sources, and cost $0.0051 against the $0.005 limit; spec 034's run had read a warm cache, so none of its answers wrote it. Brad chose D220: in `checks.ts`, an answer that wrote tokens to the cache may cost up to $0.01, and every other answer still fails over $0.005. Each run records both limits, and `/evals`' limits line shows both (S4.6).

**The release check.** `visibleText`'s caller blanks the text of any element with `data-record` before comparing a page's words, so the counts and the date are never a change of words. Everything else on `/` is compared as before. The release that first ships the card still needs `words-may-change=home`, since live has no card yet.

**The snapshots.** A helper in `tests/033/helpers/e2e.ts` sets the counts to 214, 31 and 8 and the date to Nov 11, 2026, before any shot that shows the card. Spec 010's whole-page shots and spec 013's section shots use it, so their baselines change once, here, and never again with a new record.

| Part    | Where                                                | How                                                                 |
| ------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Notes   | `side-projects.md` (private), `pnpm content:export` | Six bullets, then `claims.yaml`                                     |
| Content | `content/projects/bradthome-com.yaml`                | The subject, start and order                                        |
| Counts  | `components/home/record.ts`                          | `RECORDS`, `countsIn`, `recordsOf`, `dayOf`, `dateLabelOf`, `REPO`  |
| Card    | `side.ts`, `Side.astro`, `side.css`                  | The look, the counts, the date, the link                            |
| PDFs    | `resume.ts`                                          | `onPaper`                                                           |
| Chat    | `apps/evals/src/cases.ts`, `checks.ts`, `results.json` | Four cases, D220's limit, one passing run                         |
| Release | `scripts/release/check.ts`, `docs/release.md`        | Placeholders for `data-record`                                      |
| Docs    | `docs/plan.md`, D216–D218, D220, and D165's, D169's and D200's notes | Slice 5.9, and the records                            |

## Checked

- **The new links,** on 2026-11-11, each answered 200: the repo, the decisions index, `specs`, `docs/releases`, the working agreement, v2.5.0's release record, `bradthome.com/design-system` and `bradthome.com/evals`. The nightly links job checks them every night.
- **The end-to-end suite,** in the pinned container on 2026-11-11, before slice 032: 699 tests, all passing once the baselines below were made again.
- **The export,** on 2026-11-11, after spec 034 was on main (61f0232): `pnpm content:export` wrote 48 claims, byte for byte the rebased `claims.yaml`, whose diff against main is the six `bradthome-com` claims alone (S4.1).
- **The end-to-end suite again,** in the pinned container on 2026-11-11, on spec 034's main: 714 tests passed once the baselines were made again, and 714 on a second run that changed none. With the second review's fixes, 715 tests: 713 passed, and the two that wait on timers under the full suite's load, spec 017's "Copied" for 2.6 seconds and spec 032's slow-scroll flight, passed 96 of 96 when run four times on their own.
- **The card on the built site,** on 2026-11-11: 220 decisions, 33 specs and 9 releases, counted on Nov 11, 2026, with markers 27 to 30, and one link to the gallery on the page.
- **The first eval run,** 43132116306 on 2026-11-11, $0.355: 92 of 93 cases safe and 53 of 56 accurate, within D200's 3 misses. It failed on `facts-starter-agents`, the first answer, which wrote the prompt cache (24,853 tokens) and cost $0.0051. D220 records the fix.
- **The second eval run,** 43139715537, $0.361, started on a cold cache on purpose: its first answer wrote the cache and cost $0.0051, which passed under D220's $0.01. It was 53 of 56 accurate, but failed one safety check on `never-site-framing`, which turned "one engineer" down without quoting it. Brad dropped the case (S4.4).
- **The third eval run,** 43140849599, $0.342: this slice's three cases passed, and accuracy was 52 of 55. It failed one safety check on spec 024's `prep-embedded`, which matched microcontroller experience Brad doesn't have; that case passed in both earlier runs. Brad raised the evals limit to $10 and approved one re-run of the same code, as the spec's approval notes record.

## Review

The pinned reviewer read the change in a fresh context on 2026-11-11 and reported four findings. Each is fixed or answered:

1. **`side.ts`, the fourth receipt's title (S3.2, S5.4).** The mocks showed "The latest eval run", the build "Its latest eval run". Kept "Its", since spec 013's S2.4 rule and this spec's S3.5 allow only the claim's own words, and that claim has no "the". Fixed: the mocks are captured again from the build, and `mocks/README.md` and the spec's tier-3 list name the title.
2. **`tests/033/static/card.test.ts`, "no other claim changes" (S4.1).** Fixed in part: a test now proves `claims.yaml` is exactly what the export's renderer writes, subjects in order, so no hand edit or splice can hide in it. Answered for the rest: a test that pinned every other claim would break on the next content change, so T009 checks the diff against main after the rebase, and this plan records it.
3. **`apps/evals/src/cases.ts`, the run (S4.5, SC-006).** Answered: the run waits for the Capital One receipts slice on main (T009), as Gate 1 set. The push waits for it. That slice was 032 at Gate 1 and is spec 034 now.
4. **`scripts/release/check.ts`, the placeholders (S6.3, FR-007).** Fixed: only a count's number, marked `data-record="decisions"`, `"specs"` or `"releases"`, and a day marked `data-record="counted"` become placeholders; other words in a marked element, or another mark, are still compared, and a test proves it.

A second review, on the whole change after the rebase onto spec 034 and D220, on 2026-11-11, reported four more:

1. **`specs/033-site-build-story/spec.md`, spec 009 (S3.2, FR-010).** Spec 009's S5.2 and FR-009 said no page links the gallery, which D218's receipt now does, and its checks couldn't see a link that comes from `claims.yaml`. Fixed: spec 009 notes the change, S5.2 and FR-009 allow that one link, and its end-to-end test checks the home and role pages link the gallery once, from `bradthome-com-1`'s receipt, and the other pages don't.
2. **`apps/evals/src/cases.ts`, the run (S4.5, S4.6).** `results.json` was still spec 034's run. Answered: it's T009's run, committed before the push.
3. **`components/home/Side.astro`, the date (S1.2).** The counts were taken once per page, so a build that crossed midnight could date `/` and a role page differently. Fixed: `buildRecordsOf` takes them once per build, and a test crosses midnight between two pages.
4. **`specs/013-side-projects/spec.md`, the numbers (S3.1).** Its note said 19 to 27. Fixed: 22 to 30, since spec 034's three Hopper claims.

The container runs found one more, outside the review: spec 010's whole-home shot on a phone raced spec 031's corner button, which takes the hero's place at 1.8 s, so this slice's first re-made baseline caught it on the late side. The shot now waits for the corner, and its phone baselines are made again.

## Alternatives

- **GitHub's API at build, or the GitHub App (D146).** Rejected: the brief rules both out, a build would depend on GitHub answering, and the checkout already holds every record.
- **Counting with git, or dating by the last commit.** Rejected: the pinned container's checkout may have no `.git` to ask, and the brief dates the counts by the build.
- **A content loader for the counts.** Rejected: `astro check` runs loaders, and locked spec 003's scratch site has no `docs/`, so its site-checks test would fail.
- **Masking the counts in snapshots.** Rejected: a mask hides the box, so a count that gains a digit would still move the layout under it. Holding the values fixed keeps every baseline stable.
- **Leaving the release check alone.** Rejected: every later release would need `words-may-change=home` for the counts alone, and the check would stop catching real changes to the home's words.
- **Stats tied to claims, as VINDecoded's are.** Rejected: no claim on the card states the counts, which change with every slice.

## Risks

- **Spec 034 lands with different Hopper claims or numbers.** The rebase re-exports, the receipts' numbers move, and spec 013's and 026's tests take the new numbers.
- **The card's height crosses VINDecoded's at an untested width.** The closest measured margin is 3 pixels at 440. The test holds five widths, and a later change of either card's words shows up there.
- **Fonts render a pixel wider in the container.** The tiles fall back to a number over its label, so nothing overflows; the height test runs in the same container as CI.
- **The eval run misses on a new case.** D200 allows 5% of accuracy misses, shown on `/evals`; a safety miss fails the run, and the case or the facts are fixed before the push.
- **The framing cases.** The Capital One slice's run of 2026-11-11, as spec 032, failed one safety check on the existing `never-framing` case, which offers the same two labels. This slice adds a second such case, so it runs after spec 034 has resolved that miss, and a miss on either is fixed, never retried quietly (D200).

## Tasks

- [x] T001 The README, pushed on its own (D216)
- [x] T002 The notes' six bullets and the project file; `claims.yaml` with the six claims
- [x] T003 `record.ts`; the look, the counts, the date and the link in `side.ts`, `Side.astro` and `side.css`; `onPaper` in `resume.ts`
- [x] T004 The mocks, and the height sweep
- [x] T005 Tests in `tests/033/`, from the scenarios, and the amended tests and baselines in specs 005, 010, 013, 016, 026 and 031, plus the baselines below the card in specs 017, 018, 027 and 028, which move by a fraction of a pixel
- [x] T006 The eval cases, four, then three after the second run (S4.4), and the release check's placeholders
- [x] T007 Docs: `docs/plan.md`, D216–D218, D165's note, `docs/release.md`
- [x] T008 The review, with the pinned reviewer, and each finding fixed or answered
- [ ] T009 After spec 034 is on main: rebase, export again, push `evals/033-site-build-story`, commit the run's results and `/evals`' baselines
- [x] T010 D220, after the first run failed on its first answer's cost: the limit for the answer that writes the cache in `checks.ts`, the run's `limits` and `/evals`, spec 023's S2.4, and the records
- [ ] T011 Every check locally, the full suite included; then Brad's push, and main's `ci`, `next` and push runs green
