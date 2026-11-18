# Spec 044: VINDecoded's PR count, refreshed by hand on Brad's PC

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Track           | Full                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Status          | Approved                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Slice           | 5.17 The pulse's PR count, counted by hand (Brad's choice of 2026-11-18, after v2.12.0 went live with spec 041)                                                                                                                                                                                                                                                                                                                                                          |
| Branch          | `044-pulse-manual`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Gate 1          | Brad's cards of 2026-11-18: the words "As drafted"; a refresh-only release takes the "Short path" (D248); "You set it" for the repo setting; and "Approve" for the spec and plan, with the first real refresh committed with the slice                                                                                                                                                                                                                                   |
| Mocks and flows | [mocks/README.md](mocks/README.md): the card before and after `/pulse` answers, and the job's output from a real run on Brad's PC                                                                                                                                                                                                                                                                                                                                        |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                                                                                                                                                                                                                |
| Decisions       | D247, the link previews and the PR count are refreshed by hand on Brad's PC, amending [D48](../../docs/decisions/0048-the-test-and-quality-batch.md), [D146](../../docs/decisions/0146-a-github-app-opens-the-previews-refresh-pull-request.md) and [D240](../../docs/decisions/0240-live-numbers-from-the-sites-own-api.md). D248, a refresh-only release takes a short path. They build on D143, D150, D175, D183, D185, D239 and D244, and on specs 016, 021 and 041. |

## Summary

Spec 041 made VINDecoded's card a live pulse: the chat API's `/pulse` reads Apple's public listing, and was to count the PRs merged in VINDecoded's private repo with a read-only token kept in Secret Manager, while a weekly GitHub workflow refreshed the numbers the card is built with and opened a pull request through a GitHub App. Neither the token nor the App was ever made, so live `/pulse` answers the App Store alone, the card says "GitHub as of Nov 17", and the Monday workflow fails whenever a preview changes.

On 2026-11-18 Brad chose to drop the live GitHub side for now: no stored token and no App. The App Store stays live through `/pulse`. The PR count, and every link preview, are refreshed by one command Brad runs on this PC, through Brad's own signed-in `gh`, and reach bradthome.com with a push and a release. The weekly workflow goes. A live GitHub source can come back later as its own change; git history keeps spec 041's code.

## Scope

**In:**

- The PC job: `pnpm previews:refresh` in `scripts/previews/refresh.ts` and `refresh-lib.ts`, which counts the merged PRs through `gh` and reads the repo from a git setting on this PC.
- The API: `apps/chat-api/src/pulse.ts`, `server.ts`, `log.ts`, `constants.ts` (`PULSE_SECRETS` goes), and `scripts/chat-api/deploy.ts`'s secret checks and mounts.
- The card: `PULSE` and `pulseBuildOf` in `components/home/side.ts`, `SidePulse.astro` and `pulse.client.ts`.
- `/privacy`'s "VINDecoded’s live numbers" section.
- Removed: `.github/workflows/previews.yml`, `scripts/previews/open-pr.ts`, `open-pr-lib.ts` and `tests/016/unit/open-pr.test.ts`.
- Record D247, slice 5.17 in `docs/plan.md`, `AGENTS.md`, `docs/release.md`, notes in specs 002, 016, 021 and 041, new tests in `tests/044/`, and the tests and baselines of specs 016, 021 and 041 that pin the token, the weekly job or the live GitHub line.

**Out:**

- The deploy and a release. `/pulse` changes on Cloud Run only with `pnpm chat-api:deploy` on Brad's own yes, after the push (D185), and a release needs Brad's separate go-ahead.
- Deleting the two empty secrets `pulse-github-token` and `pulse-github-repo`. The career session deletes them once no deployed code reads them.
- The chat, its corpus and its evals: none of the card's own words is in `/corpus.json` or `/llms.txt` (spec 020 exports claims and the essay), and evals stay off (D244).
- Sudoku World's and bradthome.com's cards, and the order of the page.

## User stories and acceptance scenarios

"Today" in a scenario is the fake clock the tests set: 2026-11-18 at 15:12 UTC. The state IDs in brackets are the captures in [mocks/README.md](mocks/README.md).

### Story 1: One command on Brad's PC refreshes everything (P1)

Brad, or a session on this PC, runs one command and gets fresh link previews and a fresh PR count, with no token to make, store or renew.

**Independent test:** `tests/044/` runs the job's library with a fake command runner and recorded answers; nothing reaches GitHub or Apple.

- **S1.1** Given `pnpm previews:refresh`, then it refreshes the GitHub and App Store link previews as before (spec 016), writes VINDecoded's latest iOS release and the PRs merged in the 30 days before now to `content/previews/pulse.json`, prints what changed, and leaves the files for a normal push (M5).
- **S1.2** Given the count, then it comes from one read-only `gh api` search of the merged pull requests in the repo, run through this PC's own signed-in `gh`, with `gh`'s `--jq` trimming GitHub's answer to the count and an "incomplete" flag before it reaches the script; the job never reads, prints, asks for or stores a token.
- **S1.3** Given the repo, then its `owner/name` comes only from the git setting `bradthome.pulseRepo` on this PC, which never enters the repo; the job's output, its errors, `pulse.json` and every committed file hold no repo owner or name, PR title or branch name.
- **S1.4** Given the setting missing or not `owner/name`, `gh` missing or not signed in, GitHub refusing, or an incomplete or unreadable answer, then the job keeps the last count and its day, says why in its own words (never `gh`'s, which could name the repo), still refreshes everything else, and exits 1, the way a failed source does today.
- **S1.5** Given a part that's checked, then it takes today's day, since the day says when the numbers were last true: the count is "in the 30 days to" its day, and the release is "as of" its day. A part that fails keeps its last day.
- **S1.6** Given the job's output, then it is counts, versions and days only: one line per changed or failed link preview, one line for the release and one for the count, each saying whether it changed, and a last line saying the files wait for a push and a release, or that nothing changed (M5).
- **S1.7** Given the docs, then `docs/release.md` says how to add the setting (`git config --global bradthome.pulseRepo <owner>/<name>`), how to run the job, and how a refresh reaches bradthome.com: a push after Brad's "push", then a release on Brad's go-ahead, since the numbers are built in.
- **S1.8** Given a release whose only changes since the last tag are the refresh's files (`apps/site/content/previews/` and `apps/site/public/previews/`), then `docs/release.md` gives it a short path: the next patch version with no version card and no rehearsal on preview channels, but still the tag, `release.yml` with `words-may-change=home`, the pre-release check, Brad's approval in `production` and a short record ([D248](../../docs/decisions/0248-a-refresh-only-release-takes-a-short-path.md)).

### Story 2: The API answers the App Store only (P1)

**Independent test:** `tests/044/` runs the app with a memory store and a fake of Apple.

- **S2.1** Given `GET /pulse` with an allowed origin, then it answers `{ appStore: { version, released, rating, ratings, fetched } }` as before (spec 041's S4.1–S4.4 and S4.7), and the answer never has a `github` key, even when the store still holds an old GitHub document.
- **S2.2** Given the API's code, then nothing reads a GitHub token or repo, calls `api.github.com`, or names `PULSE_GITHUB_TOKEN`, `PULSE_GITHUB_REPO`, `pulse-github-token` or `pulse-github-repo`; the log line's source is `appstore` alone.
- **S2.3** Given `pnpm chat-api:deploy`, then it asks for no pulse secret, mounts only `ALTCHA_KEY`, and fails its read-back if the service still holds `PULSE_GITHUB_TOKEN` or `PULSE_GITHUB_REPO` in any form. Since `--set-secrets` and `--set-env-vars` replace what the service had, the next deploy drops anything spec 041 mounted.

### Story 3: The card says what's true (P1)

**Independent test:** the e2e tests route the API's address to a fake, set the clock, and read the card.

- **S3.1** Given the card, then the "Merged PRs" tile shows the built count and the sub-line "In the 30 days to" the day it was counted, with no dot, whatever `/pulse` answers (M1, M2).
- **S3.2** Given `/pulse` answering, then the release tile, the iOS stars and the release tile's dot swap in as before, and the line reads "Live from the App Store · updated 12 min ago" (M2).
- **S3.3** Given the API down, refusing or unreadable, or no script, then every built number stays with no dot and no error, and the line reads "From the App Store · as of" the day the release was checked (M1, M3).
- **S3.4** Given "How this works" open, then its note and three steps say what's true: Apple live through the site's API, at most hourly; the PR count counted on Brad's own computer and built in with its day (M4).
- **S3.5** Given `/privacy`, then "VINDecoded’s live numbers" says the browser asks the site's service for the latest iOS release and rating, that the service reads Apple's public listing at most hourly and Apple never sees the visit, that the PR count is built into the page so nothing is fetched for it, and that nothing about the visit is kept; the note's date moves to the day it changed.
- **S3.6** Given every word on the card that isn't a claim's, then it is one of `PULSE`'s, exactly as Brad approved at Gate 1, or a number, a day, an age or a store's name; none names GitHub as a live source, a token, or the repo.

### Story 4: The weekly workflow is gone (P1)

- **S4.1** Given `.github/workflows/`, then no `previews.yml` exists, no workflow runs `pnpm previews:refresh` or asks a GitHub App's token, and nothing runs on a schedule but `nightly` and `setup`.
- **S4.2** Given the repo, then `scripts/previews/open-pr.ts`, `open-pr-lib.ts` and their test are gone, and nothing imports them.
- **S4.3** Given D247, then it records why: the App was never made, Brad chose no stored token and no App, and the PC job refreshes the previews and the count; D48, D146 and D240 point to it, and specs 016's and 041's edge cases, `docs/plan.md`, `AGENTS.md` and `docs/release.md` no longer name the weekly job or the App as current.

### Story 5: Everything else holds (P1)

- **S5.1** Given the build, then the CSP doesn't change, there's no new script, and the one module shrinks.
- **S5.2** Given `/` and each role page in both themes at both sizes, with the card live, built and with "How this works" open, then axe finds no WCAG 2.2 AA violation, and every target is 24 px or more.
- **S5.3** Given reduced motion, no script, the reveal and the swap, then nothing moves, and layout shift stays 0.
- **S5.4** Given the home and each role page, then the card is the same on each, the page's order doesn't change, and no analytics event is added (D156).
- **S5.5** Given the pinned container with reduced motion, then the card on the home at phone and desktop in light and dark, live, built and with "How this works" open, each matches its committed snapshot with no pixel tolerance. Every screenshot hides the built numbers and their days, which each refresh changes, so a refresh never moves a baseline; the tests read them as text.
- **S5.6** Given specs 001–003, then none of their locked tests changes, and spec 002's workflow loop passes with `previews.yml` gone.

## Edge cases

- **The setting names a repo `gh` can't see:** GitHub answers 422 or 404; the job says "GitHub answered 422", never the query, and keeps the last count.
- **`gh`'s login lacks the org's single sign-on:** the same; Brad authorizes `gh` for the org once in GitHub's settings.
- **The search index lags:** GitHub's search may miss a pull request merged in the last minutes; the count is as of the day, so a lag of minutes doesn't change what the tile says.
- **Nothing changed:** the release and count are unchanged, but their days move to today, so `pulse.json` still changes; the job says each part is unchanged, so Brad can skip the push.
- **A run on another machine, or in CI:** with no setting, the count stays and the job exits 1; the link previews and the release still refresh.
- **Firestore still holds spec 041's `pulse/github` document:** the API never reads it, and it holds only a `tried` time; leaving it changes nothing.
- **The deployed API still runs spec 041's code until the next deploy:** with no secret values it answers the App Store alone, the same as after it, so the card reads true either way.

## Functional requirements

- **FR-001** `pnpm previews:refresh` MUST refresh the link previews and `pulse.json`'s release and count, as S1.1–S1.6 set, with no token read, asked for or stored.
- **FR-002** The repo's `owner/name` MUST come only from the git setting `bradthome.pulseRepo` on the PC, and MUST NOT appear in any committed file, commit message, the job's output or errors, `pulse.json`, the API's answer or a log.
- **FR-003** `GET /pulse` MUST answer the App Store's numbers alone, and no code MAY read the pulse's GitHub secrets or call GitHub from the API; the deploy MUST mount no pulse secret and MUST fail if the service holds one.
- **FR-004** The card MUST show the built PR count with its day, swap in the App Store's numbers as before, and say only what's true, in Brad's approved words (S3.1–S3.6).
- **FR-005** `/privacy` MUST say what S3.5 sets, in Brad's approved words.
- **FR-006** `.github/workflows/previews.yml` and the code only it used MUST be gone, and D247 MUST record why, amending D48, D146 and D240.
- **FR-007** The CSP, WCAG 2.2 AA in both themes, reduced motion, layout shift 0, the page with no script, one order across the home and role pages and the analytics events MUST NOT change, and the one module MUST NOT grow.
- **FR-008** Every test MUST run against fakes; no test MAY call `gh`, GitHub or Apple.
- **FR-009** The slice MUST record D247 and D248, add slice 5.17 to `docs/plan.md`, update `AGENTS.md` and `docs/release.md`, note the amendments in specs 002, 016, 021 and 041, and update the tests and baselines that pin the token, the weekly job or the live GitHub line. Specs 001–003's locked tests MUST NOT change.

## Success criteria

- **SC-001** 1 command refreshes every link preview and both of the pulse's numbers, with 0 tokens stored.
- **SC-002** 0 occurrences of the repo's owner or name in the repo, its history added by this slice, the job's output and `/pulse`'s answer.
- **SC-003** 0 scheduled workflows that refresh the previews, and 0 GitHub Apps or secrets the repo needs for them.
- **SC-004** 0 axe violations and layout shift 0, with the one module smaller than main's.

## Brad's approved words

On the Gate 1 cards of 2026-11-18, "As drafted". None is a claim, so `claims.yaml` doesn't change.

- The "Merged PRs" tile's sub-line: "In the 30 days to Nov 18" (spec 041: "In the last 30 days").
- The live line: "Live from the App Store · updated 12 min ago"; with the built numbers, "From the App Store · as of Nov 18" (spec 041: "… from the App Store and GitHub …", and "· GitHub as of …" with one source down, which goes).
- "How this works", its note: "The site’s own API reads the App Store’s public listing at most once an hour and keeps the numbers. This card asks that API, never Apple, and shows the numbers it was built with until it answers. The merged pull requests are counted on Brad’s own computer, from VINDecoded’s private repo, and built into the page with the day they were counted." Its steps: "App Store" (Public listing, at most hourly), "The site’s API" (Cached in Firestore), "This card" (The release live, the PR count dated); and "Read the code on GitHub", unchanged.
- `/privacy`'s section, "VINDecoded’s live numbers": "When you scroll near VINDecoded’s card, your browser asks this site’s own service for the app’s latest iOS release and rating. Nothing about you is sent with it." "That service gets them from Apple’s public App Store listing on its own, at most once an hour. Apple never sees your visit. The count of merged pull requests is built into the page, so nothing is fetched for it." "It keeps no record of the request: no address, no cookie and no log line about you." (unchanged).

## Decisions made while writing this spec

Tier 3, within D240 and D247:

- The count is one search, `is:pr is:merged merged:>=` the moment 30 days before now, with `--jq` keeping only the count and the "incomplete" flag, rather than spec 041's walk through closed pull requests: one call, and nothing of the repo but a number ever reaches the script.
- `gh`'s error text is never printed, since it could hold the query; the job prints only an HTTP status it finds there, or `gh`'s exit code.
- The setting is read with `git config --get`, so it can sit in the PC's global config beside `bradthome.privateTerms`.
- The days move on every check, not only when a number changes, unlike the link previews' snapshots (D48), since a rolling 30-day count is true only as of the day it's counted.
- The refresh no longer reads the deployed `/pulse` or a `GITHUB_TOKEN`; GitHub's public profile is read with no token, within its hourly limit for one run.
- The release tile keeps its live dot; the PR tile loses its, since it's never live.

## Changes to other specs

Specs 001–003's locked tests don't change.

- **Spec 002:** a change note: FR-015's allowance for the previews workflow has no holder, since the workflow is gone (D247).
- **Spec 016:** the refresh runs by hand on Brad's PC; the weekly workflow and its pull request are gone.
- **Spec 021:** the deploy mounts no pulse secret and checks that none is left.
- **Spec 041:** the PR count is built only, counted on Brad's PC; `/pulse` answers the App Store alone; the edge cases on the token and the App no longer apply.

## Approval

- Gate 1: approved by Brad in the session on 2026-11-18, with the plan and mocks, on four cards: the words "As drafted"; "Short path" for a refresh-only release; "You set it" for the repo setting, which the builder wrote from VINDecoded's checkout on this PC without printing it; and "Approve".
