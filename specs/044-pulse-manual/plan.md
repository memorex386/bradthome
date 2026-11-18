# Plan for spec 044: VINDecoded's PR count, refreshed by hand on Brad's PC

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

|        |                                                     |
| ------ | --------------------------------------------------- |
| Spec   | [spec.md](spec.md)                                  |
| Status | Approved with the spec at Gate 1, 2026-11-18 |
| Branch | `044-pulse-manual`, from `origin/main` at `b7b5cc4` |

## Approach

Remove the live GitHub side rather than switch it off: git history keeps spec 041's code for the day a live source comes back (D247). The count moves into the refresh, which already runs on a person's machine when it isn't scheduled, and which already writes `pulse.json`. It asks Brad's own `gh` for one number, so no token is made or kept anywhere.

## Where each part goes

| Part        | Files                                                                                                                                   | What changes                                                                                                                                                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The job     | `scripts/previews/refresh-lib.ts`, `refresh.ts`                                                                                         | `REPO_SETTING`, `mergedCountOf(run, now)` through `gh api --method=GET search/issues … --jq`, `pulseOf(old, fetcher, lookup, count, today)` with days that move on each check, `pulseReportOf`; no `/pulse` read, no `GITHUB_TOKEN`, no `GITHUB_OUTPUT` (S1.1–S1.6, FR-001, FR-002). |
| The API     | `apps/chat-api/src/pulse.ts`, `server.ts`, `log.ts`, `constants.ts`, `app.ts`, `firestore.ts`                                           | One source, `appstore`; the answer copies only the App Store's fields; `PULSE_SECRETS`, `mergedCountOf`, `MERGED_DAYS` and `MAX_PAGES` go (S2.1, S2.2, FR-003).                                                                                                                      |
| The deploy  | `scripts/chat-api/deploy.ts`                                                                                                            | No secret-version checks, `--set-secrets` with `ALTCHA_KEY` alone, and `RETIRED_ENV` fails the read-back if either old variable is on the service (S2.3).                                                                                                                            |
| The card    | `apps/site/src/components/home/side.ts`, `SidePulse.astro`, `pulse.client.ts`                                                           | `PULSE`'s words, `PulseBuild.counted`, the PR tile with its day and no dot, the client handling the App Store alone (S3.1–S3.4, S3.6, FR-004).                                                                                                                                       |
| `/privacy`  | `apps/site/src/components/privacy/privacy.ts`                                                                                           | The section's first two points and the note's date (S3.5, FR-005).                                                                                                                                                                                                                   |
| Removed     | `.github/workflows/previews.yml`, `scripts/previews/open-pr.ts`, `open-pr-lib.ts`, `tests/016/unit/open-pr.test.ts`                     | Deleted (S4.1, S4.2, FR-006).                                                                                                                                                                                                                                                        |
| The records | `docs/decisions/0247-…`, `README.md` index, D48's, D146's and D240's notes, `docs/plan.md`, `AGENTS.md`, `docs/release.md`, `README.md` | D247, slice 5.17, the workflows paragraph and the repo map, how to add the setting and run the job, and how a refresh reaches live (S1.7, S4.3, FR-009).                                                                                                                             |
| Other specs | `specs/002`, `016`, `021`, `041`                                                                                                        | Change notes, and spec 041's edge cases (FR-009).                                                                                                                                                                                                                                    |
| Tests       | `tests/044/`, `tests/041/`, `tests/016/`, `tests/021/`, baselines under `tests/snapshots/`                                              | New tests from this spec's scenarios; spec 041's tests of the GitHub source, the secrets, the weekly refresh and the two-source line retire or change with a note (FR-008, FR-009).                                                                                                  |

## Tests

- `tests/044/unit/job.test.ts`: `mergedCountOf` with a fake runner (the setting, `gh`'s arguments and answer, each failure, and that no error carries the setting's value or `gh`'s text), `pulseOf` and `pulseReportOf` (days, changes, failures, counts only).
- `tests/044/unit/api.test.ts`: `/pulse` answers the App Store alone, even with an old GitHub document in the store; the deploy mounts `ALTCHA_KEY` alone and fails on either old variable; no code names the old secrets or GitHub's API.
- `tests/044/static/records.test.ts`: the workflow and scripts are gone, no workflow refreshes the previews or runs on a new schedule, D247 and its links, the docs, the words as approved, and `/privacy`.
- `tests/044/e2e/card.test.ts`: the card built, live, with no script, the API down, and "How this works" open, at both sizes in both themes, read as text and as snapshots, with axe and layout shift.
- Spec 041's tests: the GitHub source's (S4.5, S4.6), the secrets' (S4.9), the weekly refresh's (S5.1, S5.2) and the one-source-down line's (S3.3) tests retire, each with a note naming D247; the rest read the new words.

## Risks

- **GitHub search's count:** search can lag minutes behind a merge, and flags an incomplete answer; the job refuses an incomplete one. The tile's day makes the lag immaterial.
- **The org's single sign-on:** if `gh`'s login isn't authorized for VINDecoded's org, the search answers 422 or 404; the job says so, and Brad authorizes `gh` once.
- **Baselines:** the PR tile's day changes with each refresh, so screenshots hide it as they hide the other built numbers (S5.5).

## Tasks

- [ ] **T001** The job, the API, the deploy, the card and `/privacy` (spike, done before Gate 1).
- [ ] **T002** Tests from the scenarios, and spec 041's, 016's and 021's tests.
- [ ] **T003** D247, the docs, and the other specs' notes.
- [ ] **T004** Baselines in the pinned container; the full suite.
- [ ] **T005** The review, and its findings.
- [ ] **T006** Gate 2: Brad's "push", then main's `ci`, `next` and "Push on main", and the open code-scanning alerts.
