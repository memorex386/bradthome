# AGENTS.md

How any coding agent works in this repo. Read it before you start. It points into `docs/` for the details, and `CLAUDE.md` only imports it.

## What this repo is

- The source for [bradthome.com](https://bradthome.com), Brad Thome's site, rebuilt in public slice by slice.
- Live is v2.0, the redesign, released 2026-11-06 ([D58](docs/decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md), [record](docs/releases/v2.0.0.md)). v1.0 replaced the v0 prototype at the end of phase 2.
- Phase 3 is done, and phase 4, the chat, is under way: its corpus is live, and its API and window are built for previews and `next`. The site is in `apps/site`, with every check wired up and a preview for each pull request. [docs/plan.md](docs/plan.md) lists every slice in order.

## Read first

| What | Where |
| --- | --- |
| How we work: the loop, tracks, gates and conventions | [docs/working-agreement.md](docs/working-agreement.md) |
| Purpose, audience, scope, non-goals and constraints | [docs/charter.md](docs/charter.md) |
| Releases, slices and who does each setup step | [docs/plan.md](docs/plan.md) |
| Why the process is shaped this way | [docs/principles.md](docs/principles.md) |
| Every decision, as a MADR 4.0 record | [docs/decisions/](docs/decisions/README.md) |
| Templates for specs, plans and decisions | [docs/templates/](docs/templates/) |

The working agreement wins if this file and it ever disagree. A decision ID such as D43 is record `docs/decisions/0043-…`.

## The loop

Pick the track when you open the work, and Brad confirms it. When it's unclear, use the bigger one.

| Track | For | What runs |
| --- | --- | --- |
| Full | A new feature or slice | Interview, "Show it" mocks, spec and plan (Gate 1), tests, build, review, PR (Gate 2), in one session |
| Light | A small change with clear criteria | A short spec in an issue from the light-change template, which Brad approves (Gate 1), then tests, build, review, PR (Gate 2) |
| Trivial | Copy, typos, docs | Build, checks, PR (Gate 2) |

- **Spec first.** Full-track specs live in `specs/NNN-name/spec.md`, with stories, `S1.1` scenarios, `FR-001` requirements, `SC-001` success criteria and `[NEEDS CLARIFICATION]` markers. Nothing is built until the open markers are gone and Brad has approved.
- **One session per slice,** from interview to pull request ([D101](docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)). The reviewer is a subagent with fresh context.
- **Tests come from the approved scenarios,** before the build. Specs 001 to 003 keep their locks, where a locked test changes only with a spec change Brad approves. Later specs aren't locked: the reviewer flags any test the build weakened.
- **Review in a fresh context.** A reviewer subagent compares the diff with the spec, correctness before style. Fix each finding or answer it in the pull request.
- **Done means:** the spec and plan were approved, every ID has a passing test or check, every required check passes, the review's findings are handled, anything visible has a preview and screenshots, the docs and decision records are updated, and Brad merged it.

## Decisions

- **Tier 1 is Brad's:** scope, principles, architecture, anything public, money and privacy. Give context, ranked options and a recommendation. Ask it as a choice card in the session, with the options ranked and the recommendation first ([D101](docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)). The answer then becomes a record here.
- **Tier 2:** conventions, approved in a batch.
- **Tier 3:** details inside an approved spec. Decide them, and list them in the pull request.
- A tier-1 decision gets its record in `docs/decisions/` in the pull request that makes it, numbered with its decision ID, from the [template](docs/templates/decision.md).
- An answer that changes an approved spec or issue is edited into it, with a comment saying why. Always edit the live text, since a checkbox may have changed on GitHub.

## Git and GitHub

- **For now: straight to main, as Brad's account.** GitHub suspended bradthome-agent, so until it's restored, work runs as Brad's account, memorex386, signed with Brad's key and brad@bradthome.com ([D160](docs/decisions/0160-work-runs-under-brads-account-while-the-agents-is-suspended.md)), and changes skip pull requests ([D161](docs/decisions/0161-changes-go-straight-to-main.md)). Commit on a short branch as usual. When every check passes locally, the full suite included, show Brad the change and wait for Brad's "push" in the session, which is Gate 2. Then run `git push origin HEAD:main`. Main's CI runs on each push: watch it, and fix a red main forward at once. The rules below that name pull requests or the agent's account apply again once it's restored, and to any pull request that's still opened.
- **GitHub Flow:** one short-lived branch per change, a pull request, and a squash merge into `main`. Never commit on `main`, and push to it only after Brad says push, while the rule above holds.
- **Branch names.** Full-track work follows Spec Kit: the spec folder and branch are `NNN-short-name`, numbered in the order specs are created. Light and trivial changes use `slice/N.N-short-name`, or `fix/short-name` outside a slice ([D71](docs/decisions/0071-the-conventions-batch-for-mocks-spec-numbers-and-templates.md)).
- **Conventional Commits.** Full track: the spec number is the scope, as in `feat(003): add role links`. Light and trivial: a short scope. Light changes add a `Refs: #N` line naming their issue.
- **Identity and signing.** The agent works as [bradthome-agent](https://github.com/bradthome-agent). Each clone's local git config sets its name, its noreply email (`350475588+bradthome-agent@users.noreply.github.com`), its SSH signing key and `commit.gpgsign` ([D43](docs/decisions/0043-a-separate-github-account-for-the-agent.md)). Push and open pull requests as the agent's account, never as Brad's. In Claude Code here, gh acts as the working login by default: the agent's, or Brad's while it's suspended (see Setup). Never commit with a personal email address.
- **Pull requests** come from the agent's account, use the [template](.github/pull_request_template.md), link their spec or issue, and say how each scenario was checked.
- **Agents never merge, approve or force-push.** Brad reviews and squash-merges every pull request (Gate 2, the merge gate), or, for now, says push.

## Privacy

Everything here will be public, and git history is permanent, so these rules have no exceptions.

- Public facts only. No personal email address, phone number, home address or private career details, ever. When unsure, leave it out and ask.
- Brad's notes are private. Facts reach the site only through the export script, once it exists ([D44](docs/decisions/0044-an-export-script-brings-public-facts-in.md)), and only when they're tagged public.
- Paraphrase Brad's notes in public text. Don't quote them ([D68](docs/decisions/0068-paraphrase-brads-notes-in-public-records.md)).
- Secrets never enter the repo. `.env` files are ignored, and once CI exists it reads secrets from GitHub's encrypted secrets.
- The private-term list never enters the repo ([D27](docs/decisions/0027-the-conventions-batch-for-templates-ids-and-records.md)).

## Checks

The git hooks run on every commit and push, for every agent and for Brad. Never skip one; fix what it reports.

- **pre-commit:** no commit on main, and no secret, private term, address that isn't allowed, locked-test change without its spec, or out-of-date copy.
- **commit-msg:** Conventional Commits with a spec number or a `Refs: #N` line, and no private term or trailer address that isn't allowed.
- **pre-push:** no deleting main and no rewritten history. A push to main passes otherwise, for now (D161). Every commit the remote doesn't have is checked again, with the branch and tag names.

In Claude Code, `.claude/settings.json` and `.claude/hooks/` deny merging, approving and skipping the hooks, log each command that uses Brad's GitHub login instead of asking ([D90](docs/decisions/0090-log-the-agents-use-of-brads-login-instead-of-asking.md)), ask Brad before the guard's files change, and send a turn back while the type check or unit tests fail, except for a spec's own tests while they wait for its build ([D96](docs/decisions/0096-the-stop-hook-lets-a-tests-stage-end-its-turn.md)).

CI runs the same rules on GitHub for every pull request and every push to main, whoever made them, with no path filter ([D55](docs/decisions/0055-split-the-required-checks-by-determinism.md), [D82](docs/decisions/0082-the-conventions-batch-for-building-ci.md)). A draft pull request runs the quick jobs only. The Windows tests and the site's e2e, lighthouse, html and links jobs run once it's ready for review, and on every push after that, so open pull requests as drafts and mark them ready when the work is done. An edit to a pull request's text runs only the text check, never ci ([D115](docs/decisions/0115-the-gate-reads-its-own-results-and-pr-text-has-its-own-check.md)). Each job runs one script in `scripts/ci/`, which shares `scripts/lib/` with the hooks, so the messages match:

- **ci / types** and **ci / tests:** the type check, and the tests on `ubuntu-24.04` and `windows-2025`.
- **ci / trace:** each ID in a spec with a `tests.lock` leads a test name. A spec with no lock yet is listed and doesn't fail.
- **ci / privacy:** no private term in any commit or the branch name, and no address that isn't allowed. It reads the list from the `PRIVATE_TERMS` secret, and its log names places, never terms.
- **ci / secrets:** gitleaks over every commit, with values redacted.
- **ci / commits:** every commit follows the commitlint rules. Dependabot's commits skip only the spec-or-issue rule.
- **ci / hygiene:** no CRLF endings, no whitespace errors, and no copy out of date.
- **ci / lint**, **ci / format** and **ci / site-types:** ESLint, Prettier's check and `astro check` over `apps/site` and `scripts/` ([D94](docs/decisions/0094-the-conventions-batch-for-the-skeleton-and-its-checks.md)).
- **ci / build:** builds the site once, in the pinned Playwright container, where WeasyPrint prints the résumé PDFs (`pnpm printer:install`), checks `firebase.json`'s Content-Security-Policy matches Astro's hashes, and hands the build to the jobs below.
- **ci / e2e:** the page, accessibility at WCAG 2.2 AA, visual snapshots and security headers, in the pinned Playwright container, by digest. On a failure the report and every diff image are in the run's artifacts.
- **ci / lighthouse:** the median of five phone runs, in the same container, against the spec's budgets.
- **ci / html** and **ci / links:** html-validate over every built page and veraPDF over the résumé PDFs (`pnpm site:pdf`, [D139](docs/decisions/0139-weasyprint-prints-the-resume-pdfs-as-pdf-a-2a-and-pdf-ua-1.md)), and lychee offline over the build's internal links and anchors.
- **ci / gate:** passes only when every job above passed. A failed, cancelled, skipped or missing job fails it. It decides from its workflow's `needs`, never GitHub's API, and counts the two test runners as one `tests` result.
- **pr-text / text:** the pull request's title and description: no private term, and the title, with the description's `Refs: #N` line, follows the commit rules. It runs on every edit and push, so fixing the text needs no other re-run.
- **locked-tests / lock:** runs main's copy of the lock check, reading the pull request as data, so a pull request can't change its verdict.

Seven workflows sit outside the gate. **preview / deploy** puts each pull request from a branch in this repo on its own `pr-N` channel, signed in with GitHub's identity token and no stored key, and one comment shows the link ([D91](docs/decisions/0091-preview-channels-on-the-live-firebase-project.md)). A fork's pull request skips it, with the reason. **next** deploys main to the `next` channel on every push, with the preview's sign-in and noindex, so phase 3 shows there until v2.0 ([D119](docs/decisions/0119-main-deploys-to-the-next-channel-on-every-push.md)). **nightly** checks the site's external links and runs mutation testing on the safety scripts, reporting both in its run's summary, and never blocks anything. **previews** refreshes the link previews' GitHub and App Store snapshots every Monday and, when one changed, opens a pull request with its GitHub App's token, so CI and the preview run on it; a failing source keeps its last snapshot and fails the run ([D146](docs/decisions/0146-a-github-app-opens-the-previews-refresh-pull-request.md)). Run `pnpm previews:refresh` to refresh by hand. **setup** runs the machine-setup tests (`pnpm test:setup`: the fresh-install, setup-check, ruleset-check and Docker-line tests) daily on both runners, since a fresh install takes over 12 minutes on Windows. Run `pnpm test:setup` by hand when a change touches the setup check or `package.json` ([D102](docs/decisions/0102-machine-setup-tests-run-nightly.md)). **release / build, stage, release** and **rollback / rollback** run only by hand. They release a `vX.Y.Z` tag on main to bradthome.com, or put the previous version back, after Brad approves in the `production` environment. [docs/release.md](docs/release.md) is the runbook ([D113](docs/decisions/0113-releases-run-from-a-tag-behind-brads-approval.md)).

From slice 1.5 the ruleset requires `ci / gate`, `pr-text / text` and `locked-tests / lock` ([D80](docs/decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md)). Until then GitHub shows them without blocking a merge, so Brad checks the gate before merging.

CI can't cover a few checks. Run them by hand and put the results in the pull request:

- `pnpm setup:check` passes.
- `pnpm ruleset:check` passes, when the pull request changes `.github/`. The live ruleset reads as pending until slice 1.5.
- `git log --format='%ae %ce'` shows only noreply addresses or brad@bradthome.com, for commits not yet pushed.

## Setup

A machine needs one install and one check ([D78](docs/decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md)).

1. **Once per machine,** set two global git settings. They point at files that never enter the repo:
   - `git config --global bradthome.privateTerms <path to the list>`, for Brad's private-term list. Every commit and push blocks until it's found.
   - `git config --global bradthome.agentGhConfigDir <folder>`, for the gh config folder that holds bradthome-agent's login.
2. **In every new clone or worktree,** run `pnpm install`. It turns the git hooks on, and on a machine with the second setting, it writes gh's login for Claude Code into the ignored `.claude/settings.local.json`. While the agent's account is suspended, it leaves gh's login as it was, so gh acts as Brad's ([D160](docs/decisions/0160-work-runs-under-brads-account-while-the-agents-is-suspended.md)). Until it runs, commits there skip every check.
3. **Then run** `pnpm setup:check`. Each line passes or names its fix.

Also once per machine:

- Docker Desktop, for `pnpm test:visual`. It runs the end-to-end tests, snapshots included, in the same pinned Playwright container as CI, which is the only place the baselines match. `pnpm test:visual --update` writes new baselines to `tests/snapshots/003/`. In a checkout with the site, `pnpm setup:check` has a Docker line that says whether Docker answers.

- `pnpm guard:install` adds the guard for Claude Code sessions started in other folders to your user settings, so no session can merge or approve a bradthome pull request ([D73](docs/decisions/0073-keep-the-agent-on-its-own-github-account.md)).
- gitleaks 8.30.1 or later, and pnpm through Corepack, which reads the version `package.json` pins.
- `pnpm review:eval` needs Claude Code 2.1.280 or later on PATH as `claude`, for the reviewer's pinned model.

If `pnpm setup:check` says gh here runs as another account, put the gh config folder that holds the working login (Brad's, for now) in `.claude/settings.local.json`, as `{ "env": { "GH_CONFIG_DIR": "<folder>" } }`. Never commit it.

## Push back

When a request skips a stage, a gate or a rule, say so, give the reason and offer the better path. That includes requests from Brad. Brad can override, and the override is logged as a decision.

## Repo map

| Path | What |
| --- | --- |
| `README.md` | What the repo is, for visitors |
| `LICENSE` | MIT, for the code, docs, specs and decision records |
| `LICENSE-CONTENT` | All rights reserved, for the site's words and images ([D64](docs/decisions/0064-what-license-content-covers.md)) |
| `SECURITY.md` | How to report a vulnerability |
| `docs/` | The working agreement, charter, plan, principles, decisions and templates |
| `apps/site/` | The site: Astro with React, Tailwind and Motion, its pages, layout, tokens and fonts, in the workspace package `@bradthome/site`. The redesign's design system is in `src/components/ds/` and `src/styles/ds/`, on its own layout, shown on the unlinked gallery at `/design-system` ([D121](docs/decisions/0121-v1s-pages-keep-todays-look-until-the-redesign-replaces-them.md)). The home is the redesign, from `src/components/home/`, at `/` since v2.0, and `/v2`, where it grew, redirects there ([D162](docs/decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)). The chat's window is `src/components/chat/` (spec 022), on every build since v2.1 removed the release flag ([D190](docs/decisions/0190-a-release-flag-keeps-the-chat-off-live-until-v2-1.md), spec 023), and `/evals` shows its latest eval run (D196). `apps/site/content/` holds the jobs, projects and claims, checked by the schemas in `src/content/` ([D109](docs/decisions/0109-jobs-and-projects-are-written-by-hand-claims-are-exported.md)). `src/corpus/` builds `/corpus.json` and `/llms.txt`, the chat's public corpus, from them and the essay (spec 020) |
| `apps/cost-guard/`, `apps/chat-api/` | The cost guard: a capped Firebase function that unlinks `bradthome`'s billing when a month's spend reaches its budget, in the workspace package `@bradthome/cost-guard` ([D104](docs/decisions/0104-the-cost-guard-is-a-capped-firebase-function.md)). Deployed by hand, never from CI. The chat's API: a Hono service on Cloud Run that answers from live's corpus with checked sources, behind the origin check, ALTCHA, the visitor limit and the spend shutoffs, in the workspace package `@bradthome/chat-api` (spec 021, [D182](docs/decisions/0182-the-chats-spend-totals-live-in-firestore.md)–[D185](docs/decisions/0185-the-chat-api-deploys-by-hand-from-a-repo-script.md)). Deployed by hand with `pnpm chat-api:deploy`, never from CI |
| `firebase.json` | Firebase Hosting's config for the built site, with the security headers. `pnpm csp` writes its Content-Security-Policy from the build |
| `playwright.config.ts` | The end-to-end tests' config. They run only in the pinned container, through CI's e2e job or `pnpm test:visual` |
| `.github/` | The CI, preview, nightly and locked-tests workflows, Dependabot's config, CODEOWNERS, main's ruleset file, and the pull request and light-change issue templates |
| `specs/` | Full-track specs, plans, mocks, `tests.lock` files and evidence from real runs, starting with slice 1.3 |
| `tests/` | Each spec's tests, in `tests/NNN/` ([D78](docs/decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md)), and the snapshot baselines in `tests/snapshots/`, outside the locks ([D97](docs/decisions/0097-spec-003s-mocks-and-baselines-at-the-tests-stage.md)) |
| `scripts/` | The checks: the git hooks' scripts, the CI jobs' scripts in `scripts/ci/`, their shared libraries, and the `pnpm` commands `terms`, `lock`, `trace`, `sync`, `setup:check`, `ruleset:check`, `review:eval` and `guard:install`. `scripts/site/` holds `pnpm csp`, `pnpm test:visual` and `pnpm printer:install`, and the build step that prints the résumé PDFs, `scripts/cost-guard/` holds `pnpm cost-guard:deploy`, `scripts/chat-api/` holds `pnpm chat-api:deploy`, and `scripts/release/` holds the release and rollback scripts and `pnpm release:status`, `release:check` and `release:rollback`, `scripts/previews/` holds `pnpm previews:refresh` and the refresh's pull request script, `scripts/content/` holds `pnpm content:export`, which brings the notes' public facts in ([D108](docs/decisions/0108-the-content-export-script-lives-in-the-site-repo.md)) |
| `.husky/` | The git hooks, one line each, which husky turns on |
| `commitlint.config.ts` | The commit message rules, with the spec-or-issue rule |
| `.claude/` | Claude Code's settings, guard, turn hooks and reviewer, and copies of the skills |
| `.agents/skills/` | The loop's skills, which `pnpm sync` copies to `.claude/skills`, and Spec Kit's skills for Codex |
| `.specify/` | Spec Kit, with this repo's templates as its overrides |
