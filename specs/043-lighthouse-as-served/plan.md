# Plan 043: Lighthouse measures the home as Firebase serves it

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

|        |                                              |
| ------ | -------------------------------------------- |
| Spec   | [spec.md](spec.md), approved 2026-11-18      |
| Status | Approved with the spec at Gate 1, 2026-11-18 |

## Approach

| Part            | Where                                                                                                 | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The server      | new `scripts/site/serve.ts`                                                                           | Node's `http` and `zlib`. Pure helpers, exported for the unit tests: `encodingFor(acceptEncoding, contentType)` picks `br`, `gzip` or none (FR-002, FR-003); `fileFor(root, url)` resolves a request to a file inside the root or nothing (FR-003, S1.4). Brotli runs at quality 11 with the text mode hint, gzip at level 9, and each compressed file is kept in memory. Run as `node scripts/site/serve.ts`, it listens on 127.0.0.1:4180 and prints `serving apps/site/dist on http://127.0.0.1:4180` (FR-001). |
| Lighthouse CI   | `lighthouserc.json`                                                                                   | `staticDistDir` gives way to `startServerCommand` and `startServerReadyPattern`; the URLs are `http://127.0.0.1:4180/index.html` and `/vindecoded-agents.html`, the address the server listens on, since Chrome may try `localhost` on IPv6 first (the review's finding); LCP's assertion is 2,000 (FR-004). `site-report.ts` doesn't change: `lighthousePage()` already reads the path alone, so a miss still names `/` or `/vindecoded-agents`.                                                                  |
| The byte budget | new `tests/043/integration/budget.test.ts`                                                            | Builds into `node_modules/.cache` as spec 022's test does, compresses `index.html` with brotli at quality 11, and fails over 14,000 bytes with "the home's HTML is N bytes with brotli, over the 14,000-byte budget (D246). Fix: slim the home's HTML, or ask Brad to move the budget." (FR-005, S3.1, SC-003).                                                                                                                                                                                                    |
| Spec 003        | `specs/003-skeleton-and-pipeline/spec.md`, `tests/003/static/lighthouse.test.ts`, `tests.lock`        | FR-012 reads 2.0 s again with a pointer to this spec, a change note says why, the test reads 2000, and `pnpm lock 003` renews the lock (S2.2, FR-006).                                                                                                                                                                                                                                                                                                                                                             |
| The pins        | `tests/006/static/essay.test.ts`, `tests/007/static/home.test.ts`, `tests/010/static/release.test.ts` | Their URL pins read the port. They check the same two pages; nothing is weakened.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| The records     | `docs/decisions/0245-…`, `0246-…`, `0030-…`, `README.md`, `docs/plan.md`, `AGENTS.md`                 | D245 and D246, D30's note, slice 5.16, and the ci / lighthouse line (FR-006).                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## What exists today

- `lighthouserc.json` uses `staticDistDir`, so Lighthouse CI serves `apps/site/dist` itself, gzip only, and its LCP assertion is 2,100 since spec 041.
- `scripts/ci/site-report.ts`'s `lighthouse()` runs `lhci collect`, `assert` and `upload` with that config, and adds spec 010's page budgets.
- `playwright.config.ts` serves the e2e tests from the Firebase Hosting emulator on port 5000, which stays as it is.

## Measured before the build

On main `b7b5cc4`, 2026-11-18, three phone runs each, the same Lighthouse CI and Chromium:

| Served by                                      | Home's HTML on the wire | LCP          |
| ---------------------------------------------- | ----------------------- | ------------ |
| Lighthouse CI's static server (gzip)           | 16,149 bytes            | 2.03 s       |
| The same build, brotli at quality 11           | 13,345 bytes            | 1.94–1.95 s  |
| The same build, gzip, three stylesheets as one | about 16 KB             | 2.03 s       |
| bradthome.com (v2.12), to Chrome               | 13,099 bytes            | not measured |
| The Firebase emulator                          | 15,766 bytes            | not measured |

Most of the rest is the hero's motion: the LCP element, the third word, rises in after 0.6 s.

## Measured on this build

On this branch, 2026-11-18, on Brad's Windows machine, with `pnpm site:lighthouse` as CI runs it:

- **SC-001:** two runs of five. The home's LCP was 1,995, 1,935, 1,935, 1,935 and 1,935 ms, then 2,000, 1,935, 1,935, 1,935 and 1,935 ms: a median of 1,935 ms both times, against the 2,000 ms budget. A third run, after the review's fix loads `127.0.0.1`, read 2,002, 1,935, 1,935, 1,935 and 1,935 ms: a median of 1,935 ms again. The essay's was 1,560 ms in every run. CLS was 0 on both pages, and the essay's TBT was 0.
- **S2.3, open until main's run:** both local runs failed on the home's TBT alone, at medians of 157 and 152 ms against 150. Part of that is the change: the home now paints about 100 ms sooner, so more of the one module's long task falls inside the window TBT counts. The old gzip setup on the same build measured 92–133 ms here. Part is this machine: the task takes 120–160 ms here, where main's CI run of `b7b5cc4` measured it at about 80 ms, with TBT 0–21 ms. An 80 ms task counts at most 30 ms of TBT, so CI should stay far under 150 ms. The third run met every budget, with the home's TBT at 0, 102, 103, 134 and 138 ms, a median of 103. Main's lighthouse job after the push is S2.3's evidence, recorded here when it runs.
- **SC-002:** the server sends the home as 13,092 bytes with brotli, and Lighthouse records 13,303 with the headers. bradthome.com sends Chrome the same content as 13,099. The essay is 12,690 bytes against production's 12,692.
- **S3.2, planted:** 2.2 KB of random text appended to `pages/index.astro` took the home to 14,748 bytes with brotli. The budget test failed with "the home's HTML is 14,748 bytes with brotli, over the 14,000-byte budget (D246)" and its fix.
- **S2.4, planted:** the same padded build went out as 14,959 bytes, past the first round trip. The home's LCP was 2,085 ms, a median over five, and `pnpm site:lighthouse` failed with "largest-contentful-paint 2.1 s, budget 2.0 s" under `/`. The padding was then removed.

## Alternatives considered

| Option                                      | Why not                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slim the HTML under gzip's round trip       | About 2.3 KB of trims for a 2.1 KB gap, changing the sparkles' markup (D230) and spec 039's diagrams, and gone with the next section. Brad's card |
| Serve Lighthouse from the Firebase emulator | It serves brotli at a low quality, 15,766 bytes, still past the first round trip, and production's 13,099 is what visitors get                    |
| Port 80, keeping the URLs without a port    | Needs root on Linux and is often taken on Windows                                                                                                 |
| Start the server from `site-report.ts`      | Hides it from `lighthouserc.json`, so a hand run of `lhci collect` wouldn't match CI                                                              |

## Decisions

- `docs/decisions/0245-lighthouse-ci-serves-the-build-as-firebase-does.md` (D245).
- `docs/decisions/0246-a-byte-budget-for-the-homes-html.md` (D246).
- D30's note, amended.

## Risks

| Risk                                                                | Likelihood | Mitigation                                                                                                                          |
| ------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| CI's container measures above 2.0 s where this machine reads 1.95 s | Low        | The brief's measurements matched CI before; main's run after the push is SC-001's evidence, and a red main is fixed forward at once |
| The margin is about 50 ms                                           | Medium     | Lantern's runs vary by a few ms; the byte budget catches the HTML growing, the main cause                                           |
| The byte budget's build makes the tests slower                      | Low        | One more build of about 10 s in the integration project, as spec 022's                                                              |
| Production changes how it compresses                                | Low        | D245 records the measurement and its date; the edge is re-measured with `curl` when the budget moves                                |

## Tests to write

| ID                       | Test file                                                     | Test name includes                                          |
| ------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------- |
| S1.1–S1.4, FR-001–FR-003 | `tests/043/unit/serve.test.ts`                                | each ID                                                     |
| S1.5, S2.1, FR-004       | `tests/043/static/config.test.ts`                             | each ID                                                     |
| S2.2, FR-006             | `tests/043/static/docs.test.ts`                               | each ID                                                     |
| S3.1, FR-005, SC-003     | `tests/043/integration/budget.test.ts`                        | each ID                                                     |
| S1.1, S1.3, SC-002       | `tests/043/integration/budget.test.ts`, serving its own build | each ID                                                     |
| S2.3, S2.4, S3.2, SC-001 | the local runs below, and main's lighthouse job               | recorded here, and named in `tests/043/static/docs.test.ts` |

## Tasks

- [x] **T001** Write the tests above, from the scenarios.
- [x] **T002** Write `scripts/site/serve.ts` (FR-001–FR-003).
- [x] **T003** Point `lighthouserc.json` at it, LCP at 2,000, and update the three URL pins (FR-004).
- [x] **T004** Spec 003's FR-012, note, test and lock; D30's note; D245, D246 and the index; slice 5.16; AGENTS.md (FR-006).
- [x] **T005** Run `pnpm site:lighthouse` twice, ten runs, and the two planted failures, and record them here (S2.3, S2.4, S3.2, SC-001).
- [ ] **T006** Every check, the review, then Brad's push.

## Review

The reviewer subagent, in a fresh context, read commit `4bfb1a3` against this spec on 2026-11-18 and found two things. Both are fixed:

- **S1.5, FR-001:** the server listened on `127.0.0.1` alone while Lighthouse loaded `localhost`, which Chrome may try on IPv6 first, so a process there could have been measured in its place. The URLs and the ready line now name `127.0.0.1`, to which Chrome still sends `br` (checked the same day), and specs 006's, 007's and 010's pins follow.
- **S2.3, SC-001:** the plan put the local TBT misses down to this machine alone, and the records test counted S2.3 as covered without a run that passed every budget. The plan now says the change moves part of the module's task into TBT's window, and keeps S2.3 open until main's lighthouse job is recorded. The test checks the recorded LCP medians, and that S2.3 says it's open or records main's run.

## Preview and rollback

Nothing a visitor sees changes, so there's no preview to look at. Main's lighthouse job is the evidence. To roll back, revert the commit; the budget goes back to 2.1 s with it, on Brad's card.

## Approval

- Gate 1: approved by Brad on 2026-11-18, on the session's card, with the spec.
