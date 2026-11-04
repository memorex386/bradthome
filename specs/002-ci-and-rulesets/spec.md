# Spec 002: CI and rulesets

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Built |
| Slice | 1.4 CI and rulesets |
| Branch | `002-ci-and-rulesets` |
| Mocks and flows | [mocks/README.md](mocks/README.md): the flow from a push to Brad's merge, and what each of 17 states shows |
| Plan | [plan.md](plan.md), written after Gate 1 |
| Decisions | [D80](../../docs/decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md) and [D81](../../docs/decisions/0081-the-conventions-batch-for-ci-and-the-ruleset.md), from this slice's interview. [D83](../../docs/decisions/0083-accept-dependabots-sign-off-in-ci.md) and [D84](../../docs/decisions/0084-dependabots-messages-skip-the-case-and-length-rules.md), from the build's first Dependabot run. [D87](../../docs/decisions/0087-ci-jobs-that-print-pull-request-text-hide-private-terms.md) and [D88](../../docs/decisions/0088-lock-regression-tests-for-slice-1-4s-review-fixes.md), from the review. It builds on [D11](../../docs/decisions/0011-build-privately-then-go-public-after-a-leak-scan.md), [D21](../../docs/decisions/0021-lock-tests-written-from-approved-scenarios.md), [D22](../../docs/decisions/0022-enforce-hard-rules-in-three-layers.md), [D27](../../docs/decisions/0027-the-conventions-batch-for-templates-ids-and-records.md), [D45](../../docs/decisions/0045-a-private-term-script-plus-a-secret-scanner.md), [D47](../../docs/decisions/0047-the-repo-and-tooling-batch.md), [D49](../../docs/decisions/0049-the-ci-and-safety-batch.md), [D55](../../docs/decisions/0055-split-the-required-checks-by-determinism.md) and [D73](../../docs/decisions/0073-keep-the-agent-on-its-own-github-account.md). |

## Summary

Brad wants the hard rules enforced a third time, on GitHub, for every pull request, whoever opened it and whatever ran on their machine. This slice adds CI with one gate that passes only when every check passes, Dependabot, the code-owner rule that only Brad's approval counts, and the repo's merge settings. GitHub won't serve rulesets for a private repo on the free plan, so Brad chose to land the checks now and keep the ruleset as a reviewed file, which slice 1.5 applies the moment the repo goes public, along with CodeQL and secret scanning ([D80](../../docs/decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md)).

## Scope

**In:**

- A CI workflow on GitHub Actions for every pull request, with no path filters: types, the tests on Ubuntu and Windows, traceability, the private-term and address scan, the secret scan, commit messages and hygiene, and a final gate job that checks every result ([D49](../../docs/decisions/0049-the-ci-and-safety-batch.md), [D55](../../docs/decisions/0055-split-the-required-checks-by-determinism.md)).
- The locked-tests check as its own workflow, run from main's copy, which reads the pull request's files without running them (D49).
- The private-term list as two repo secrets, one for Actions and one for Dependabot, set from the file on Brad's PC ([D27](../../docs/decisions/0027-the-conventions-batch-for-templates-ids-and-records.md), [D81](../../docs/decisions/0081-the-conventions-batch-for-ci-and-the-ruleset.md)).
- Dependabot for the packages and the Actions: weekly, grouped, with a 3-day cooldown, never merged automatically ([D47](../../docs/decisions/0047-the-repo-and-tooling-batch.md), D81).
- `.github/CODEOWNERS`, naming Brad for every path (D81).
- The ruleset for main as a file, `.github/rulesets/main.json`, and `pnpm ruleset:check`, which checks the file and compares it with GitHub's live ruleset once GitHub serves it ([D80](../../docs/decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md)).
- The repo's merge settings: squash merges only, the pull request's title as the squash commit's title, auto-merge on, so Brad can approve and let a pull request merge once its checks pass, and branches deleted after merging, with a line in `pnpm setup:check` that reads them (D81, [D103](../../docs/decisions/0103-auto-merge-on-after-brads-approval.md)).
- Docs: AGENTS.md's Checks section, the working agreement's and the plan's changes since approval, the pull request template's hand-run checks, and records D80 and D81.

**Out:**

- Applying the ruleset, turning on CodeQL default setup, and secret scanning with push protection go in slice 1.5, right after the switch to public ([D80](../../docs/decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md)). Until then, GitHub shows the checks but doesn't block a merge, and the local rules from spec 001 keep an agent from merging.
- Spec 001's parked light changes: the worktree-session install and D79's locked tests.
- Lint, format, end-to-end, accessibility, Lighthouse, HTML and link checks, and the nightly jobs. They need a site, and come with slice 2.1 (D55).
- GitHub's required workflows, which need an organization.

## User stories and acceptance scenarios

The IDs in brackets, such as (K1), are the states in [mocks/README.md](mocks/README.md). Each one shows the exact message.

### Story 1: Every pull request gets one verdict (P1)

Brad merges with a squash merge, and from slice 1.5 the ruleset requires the gate, plus the lock check that runs from main's copy. That check has to mean every rule passed, on every pull request, so a missing or skipped job never reads as a pass.

**Why this priority:** the gate is what the ruleset will require, and what Brad reads before merging until then.

**Independent test:** in a scratch repo on GitHub, or with the gate's logic run on recorded job results, open pull requests that pass, fail one job, skip one and change only docs.

- **S1.1** Given a pull request where every job passes, when CI finishes, then the gate passes and the pull request shows every check by name (K0, M1).
- **S1.2** Given a pull request where any job fails, is cancelled or doesn't run, or either runner's tests fail, when CI finishes, then the gate fails and names each job that didn't pass (K1).
- **S1.3** Given a change that passes the tests on one of Ubuntu and Windows and fails them on the other, when CI runs, then that runner's tests job fails, and so does the gate (K2).
- **S1.4** Given a pull request that changes only docs, when it's opened, then every job runs, with no path filter, and the gate reports (K0).
- **S1.6** Given any CI run, a re-run included, when the gate runs, then it decides from the results its workflow hands it, and never from GitHub's API, so a list GitHub hasn't finished updating can't change its verdict ([D115](../../docs/decisions/0115-the-gate-reads-its-own-results-and-pr-text-has-its-own-check.md)).
- **S1.5** Given a newer push to the same pull request while CI runs, then the older run is cancelled, and the gate reports on the newest commit (K1).

### Story 2: Nothing private or secret reaches main through a pull request (P1)

Spec 001 checks every commit on Brad's PC. CI checks again on GitHub, so a commit made elsewhere, or with the hooks off, is still caught before Brad merges. Its log will be public, so it shows places, never terms.

**Why this priority:** a leak can't be taken back once it's merged, and the repo goes public next.

**Independent test:** with a list of made-up terms as the secret, push each kind of leak to a scratch pull request, and see each one fail with its message.

- **S2.1** Given a pull request whose changed lines, commit messages or branch name hold a term from the list, in any letter case, when CI runs, then the privacy job fails, and the log names the file and line, the commit and message line, or the field, but never the term (K3). A term in the title or description fails the text check instead (S2.6).
- **S2.6** Given a pull request whose title holds a term from the list or breaks the message rules, or whose description holds a term, when it's opened, edited, reopened, pushed to or marked ready, then the text check fails and names the place, never the term. Fixing the text passes it on the edit's own run, with nothing else to re-run, and an edit runs no other check ([D115](../../docs/decisions/0115-the-gate-reads-its-own-results-and-pr-text-has-its-own-check.md)).
- **S2.2** Given a commit whose author, committer or trailer address isn't allowed under spec 001's rules, when CI runs, then the privacy job fails and shows the address masked (K4).
- **S2.3** Given a commit in the pull request that gitleaks reports as a secret, when CI runs, then the secrets job fails, naming the commit, file, line and rule, with the value redacted (K5).
- **S2.4** Given the private-term secret is missing or empty for the run, when CI runs, then the privacy job fails with the setup step, and never passes by scanning nothing (K6).
- **S2.5** Given a pull request that Dependabot opened, when CI runs, then the privacy job reads Dependabot's copy of the secret, and the scan runs as it does for any pull request, accepting only Dependabot's own sign-off with GitHub's support address ([D83](../../docs/decisions/0083-accept-dependabots-sign-off-in-ci.md)) (D1).

### Story 3: The loop's rules hold on GitHub (P1)

**Why this priority:** spec 001 enforces these on Brad's PC only. CI is the layer every agent and every machine goes through ([D22](../../docs/decisions/0022-enforce-hard-rules-in-three-layers.md)).

**Independent test:** in a scratch pull request, break each rule once and see the job that owns it fail.

- **S3.1** Given a pull request one of whose commits isn't a Conventional Commit, or names no spec or issue, when CI runs, then the commits job fails with commitlint's report for each one (K7). The title gets the same rules in the text check (S2.6).
- **S3.2** Given a commit Dependabot made, when CI runs, then the spec-or-issue, subject-case and header-length rules skip it, and the type, term, address and secret checks still run ([D84](../../docs/decisions/0084-dependabots-messages-skip-the-case-and-length-rules.md)) (D1).
- **S3.3** Given a pull request that changes a locked test or a `tests.lock` and not that spec's `spec.md`, when CI runs, then the lock job fails. The job runs main's copy of the check, so a change to the check in the same pull request doesn't change the verdict (K8).
- **S3.4** Given a spec with a `tests.lock`, when an ID in its `spec.md` leads no test name, then the trace job fails, naming each ID. A spec with no `tests.lock` yet is listed and doesn't fail (K9).
- **S3.5** Given a text file with CRLF line endings, a whitespace error, or a skill copy or template override that doesn't match its source, when CI runs, then the hygiene job fails, naming each file (K10).
- **S3.6** Given the type check fails, when CI runs, then the types job fails (K2).

### Story 4: Dependencies stay current without surprises (P2)

**Why this priority:** stale dependencies are a security risk, but a bad release pulled within hours is too, and nothing merges without Brad.

**Independent test:** read the Dependabot config, then trigger a run against a scratch copy with a release under 3 days old.

- **S4.1** Given the weekly run, when there are updates for the packages and for the Actions, then Dependabot opens at most one pull request for each group (D1).
- **S4.2** Given a release published less than 3 days earlier, when Dependabot runs, then it doesn't propose that release yet.
- **S4.3** Given a Dependabot pull request, then nothing merges it automatically: the config enables no auto-merge, and only Brad can turn it on for a pull request, after his approval ([D103](../../docs/decisions/0103-auto-merge-on-after-brads-approval.md)).

### Story 5: The ruleset is ready for the switch to public (P2)

**Why this priority:** slice 1.5 applies it right after the switch. It has to be right, reviewed and checkable before then ([D80](../../docs/decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md)).

**Independent test:** run the ruleset check on the real file, on a file missing each rule, and on recorded GitHub responses: refused, matching and different.

- **S5.1** Given `.github/rulesets/main.json`, when `pnpm ruleset:check` runs, then it confirms the file targets main and holds each rule: pull requests only, squash merges only, linear history, signed commits, the gate, the text check and the lock check as the required checks, one approval, a code owner's approval, stale approvals dismissed on a new push, no force pushes, no deletions and no bypass actors (R1).
- **S5.2** Given GitHub refuses to serve rulesets for the repo, when the check runs, then it reports the live ruleset as pending, not as a failure (R1).
- **S5.3** Given GitHub serves a live ruleset that differs from the file, or the file is missing a rule, when the check runs, then it fails and names each difference (R2).
- **S5.4** Given `.github/CODEOWNERS`, then it names Brad's GitHub account as the owner of every path, and the check confirms it (R1).

### Story 6: The repo merges the one way the agreement says (P3)

**Why this priority:** these settings work on the free plan today, and they make the merge box match Gate 3. The ruleset repeats them from slice 1.5.

**Independent test:** read the repo's settings through the API, then run the setup check against recorded settings with each one wrong.

- **S6.1** Given the repo's settings, when `pnpm setup:check` runs, then it confirms squash merges only, the pull request's title as the squash commit's title, auto-merge on and branches deleted after merging, and names any setting that differs with its fix (S1).

## Edge cases

- A pull request edits the CI workflow, for example to make the gate pass. The workflow runs from the pull request, so the edit applies to that run. The locked-tests check runs from main's copy instead, CODEOWNERS puts every `.github/` change in front of Brad, and the reviewer flags changes to the checks. Covered by S3.3, S5.4.
- A pull request from a fork gets no secrets, so the privacy job fails closed. Only collaborators open pull requests ([D47](../../docs/decisions/0047-the-repo-and-tooling-batch.md)). Covered by S2.4.
- Dependabot's pull requests can't read Actions secrets. Its own copy of the secret covers them. Covered by S2.5.
- A bad commit message or a private term reaches the branch, and pushes never rewrite history (spec 001, G11). The fix is a new branch with the commits fixed, a new pull request, and the old branch deleted, and the job says so. A term that reached GitHub is reported to Brad before anything merges. Covered by S2.1, S3.1.
- GitHub Actions is down, or the private repo's included compute runs out. No gate result appears, and Brad waits instead of merging. From slice 1.5, the ruleset blocks the merge until it reports. Covered by S1.2.
- A job that's skipped by a condition, such as one that only runs for some events, fails the gate unless the gate expects it to skip. Covered by S1.2.
- A Windows-only or Linux-only failure. Covered by S1.3.
- The ruleset check runs without network access or without gh signed in. It reports the live ruleset as not checked, and checks the file. Covered by S5.2.
- The gate's name changes in a later pull request. The ruleset file names the check, and the ruleset check compares them. Covered by S5.1, S5.3.

## Functional requirements

- **FR-001** The repo MUST run CI on every pull request into main, and on every push to it, with no path filters. A draft pull request MAY skip the slow jobs (the Windows tests and spec 003's e2e, lighthouse, html and links), which run once it's ready for review and on every push after that ([D100](../../docs/decisions/0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md)). CI MUST NOT run on an edit to the title or description, which only the text check reads ([D115](../../docs/decisions/0115-the-gate-reads-its-own-results-and-pr-text-has-its-own-check.md)).
- **FR-002** CI MUST run these jobs: types, tests on Ubuntu and on Windows, trace, privacy, secrets, commits and hygiene, and a gate job that needs every other job in the CI workflow and passes only when every other job passed. The tests matrix counts once in the gate, failing when either runner's tests fail, and each runner still shows as its own check. The gate's list of expected jobs MUST match the CI workflow's jobs, so a later spec can add a job to the gate (D95). The lock job runs in its own workflow (FR-011), so the ruleset requires it beside the gate.
- **FR-003** The gate MUST run even when a job before it failed or was cancelled, and MUST fail, naming each job that didn't pass. On a draft it expects the quick jobs ([D100](../../docs/decisions/0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md)). It MUST decide from its workflow's `needs` alone, MUST NOT call GitHub's API, and MUST NOT hold `actions: read` ([D115](../../docs/decisions/0115-the-gate-reads-its-own-results-and-pr-text-has-its-own-check.md)).
- **FR-004** A newer push to the same pull request MUST cancel CI runs for older commits of it.
- **FR-005** The privacy job MUST scan the pull request's changed lines, every commit message and the branch name for private terms, and MUST name places, never terms. The text check scans the title and description (FR-022).
- **FR-006** The privacy job MUST check every commit's author, committer and trailer addresses with spec 001's rules, and MUST mask each address it reports. The one exception is a `Signed-off-by` trailer with GitHub's support address on a commit whose author is Dependabot, which passes (D83).
- **FR-007** The privacy job MUST fail when the private-term list is missing or empty for the run.
- **FR-008** The private-term list MUST reach CI only as a repo secret, one for Actions and one for Dependabot, and MUST never be written to a log, a file in the repo or an artifact. The privacy step scans with it. The commits, secrets, hygiene and lock steps, and the text check's steps, which print subjects, the title and paths from the pull request, MUST get it too and hide any line that holds a term, as the hooks do (D87).
- **FR-009** The secrets job MUST run gitleaks on every commit in the pull request, with values redacted.
- **FR-010** The commits job MUST check every commit, and the text check the pull request's title, with the repo's commitlint config, and they MUST exempt commits that Dependabot made, and the titles of pull requests it opened, from the spec-or-issue, subject-case and header-length rules only (D84).
- **FR-011** The lock job MUST run from a workflow that checks out main's copy of the check and reads the pull request's files as data, without running code from the pull request.
- **FR-012** The trace job MUST fail for a spec with a `tests.lock` whose IDs don't each lead a test name, and MUST list specs with no `tests.lock` without failing.
- **FR-013** The hygiene job MUST fail on CRLF line endings in text files, whitespace errors and drifted skill copies or template overrides.
- **FR-014** Every workflow in `.github/workflows/` MUST use only GitHub's own Actions (`actions/…`), each pinned to a full commit hash, pin its runner images and tool versions, give its token read-only permissions by default, and use checkouts that don't keep the token. A job MAY hold a write permission only where a spec names it, and `pull-requests: write` only in spec 003's preview comment job (D95, [D99](../../docs/decisions/0099-the-preview-comments-with-pull-requests-write-and-accepts-hostings-hsts.md)). Spec 008's release stage and release jobs and its rollback job MAY hold `id-token: write` ([D114](../../docs/decisions/0114-specs-002-and-003-make-room-for-the-release-workflows.md)). Spec 009's `next.yml` deploy job MAY hold `id-token: write` ([D123](../../docs/decisions/0123-spec-002-lets-the-next-deploy-sign-in.md)).
- **FR-015** Dependabot MUST update the packages and the Actions weekly, in one group each, wait 3 days after a release before proposing it, and enable no automatic merge.
- **FR-016** `.github/CODEOWNERS` MUST name Brad's GitHub account as the owner of every path.
- **FR-017** `.github/rulesets/main.json` MUST define main's ruleset with every rule S5.1 lists, in the format GitHub's rulesets API accepts.
- **FR-018** `pnpm ruleset:check` MUST check the ruleset file and CODEOWNERS, and MUST compare the file with GitHub's live ruleset when GitHub serves one, reporting pending when GitHub refuses.
- **FR-019** The repo's settings MUST allow only squash merges, use the pull request's title as the squash commit's title, allow auto-merge, which only Brad turns on for a pull request after approving it, and delete branches after merging, and `pnpm setup:check` MUST confirm them.
- **FR-020** Every failing job MUST say what failed, where, and how to fix it, in the shape of spec 001's messages.
- **FR-022** `.github/workflows/pr-text.yml` MUST run on a pull request's opened, edited, reopened, synchronize and ready_for_review events, with one job, `text`, that checks the title and description for private terms, and the title, with the description's `Refs: #N` line, against the message rules. Its checks MUST fail when the event holds no pull request, rather than check nothing. It MUST hold only `contents: read`, and only its two check steps MAY read the private-term secret. The ruleset MUST require it beside the gate and the lock check ([D115](../../docs/decisions/0115-the-gate-reads-its-own-results-and-pr-text-has-its-own-check.md)).
- **FR-021** AGENTS.md's Checks section and the pull request template MUST name the CI checks, and keep only the hand-run checks CI doesn't cover.

## Success criteria

- **SC-001** Every pull request opened after this slice merges shows a gate result, and for each of the planted failures in Stories 1 to 3, the gate fails, on the first try, in every case.
- **SC-002** On a typical pull request, the gate reports within 10 minutes of the push, as D49 asked. [This is a measure, not a limit: D55 keeps slow, deterministic checks required.]
- **SC-003** No CI log, from any of the planted cases, holds a private term or an unmasked address.
- **SC-004** CI's use of the private repo's included compute stays inside the free plan's monthly amount, measured from GitHub's usage report over the slice's first two weeks.
- **SC-005** On the day slice 1.5 applies the ruleset, `pnpm ruleset:check` passes against the live ruleset with no change to the file.

## Mocks and flows

[mocks/README.md](mocks/README.md) shows the flow from a push to Brad's merge, and every state: K0 to K10 for CI, D1 for Dependabot, R1 and R2 for the ruleset check, S1 for the setup check, and M1 and M2 for the merge box before and after slice 1.5. Nothing in this slice is on the site, so there's no theme, phone or reduced-motion state.

## Key entities

- **Gate:** the check that sums up every CI job's result. The ruleset requires it and the lock check.
- **Ruleset file:** main's ruleset, kept in the repo so changes to it are reviewed, and applied in slice 1.5.
- **Private-term secret:** the private-term list, stored as a GitHub secret for Actions and for Dependabot.

## Assumptions

- Only collaborators open pull requests, as D47 set, so CI never runs on code from a stranger with secrets available.
- GitHub keeps serving rulesets, CodeQL and secret scanning free on public repos, and keeps Actions free on public repos' standard runners, as its docs said on 2026-11-01.
- Brad's GitHub account stays the repo's owner and only code owner.
- The included compute for a private repo on the free plan, $12 a month on 2026-11-01, covers the Ubuntu and Windows runs until slice 1.5.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D47, D49, D55, D80 and D81:

- The workflows are `.github/workflows/ci.yml` and `.github/workflows/locked-tests.yml`. The required checks are `ci / gate` and `locked-tests / lock`, since a gate can only see jobs in its own workflow.
- The runners are named images, `ubuntu-24.04` and `windows-2025`, rather than `-latest`.
- The pull request's title is the squash commit's title, so the commits job checks it too. Its spec-or-issue rule passes with a spec scope, or a `Refs: #N` line in the description.
- The privacy job also scans the pull request's title and description, since the title lands on main.
- The ruleset dismisses stale approvals on a new push, so Brad's approval always covers what merges.
- The ruleset check is `pnpm ruleset:check`, run by hand and in slice 1.5, not in CI, because GitHub refuses the read until the repo is public.
- A spec with no `tests.lock` is listed by the trace job but doesn't fail, so a spec can reach Gate 1 with the gate passing.
- Admin steps, such as setting the secrets and the repo's settings, run as Brad's login, one ask at a time (D73). The agent's account keeps write access only.

## Traceability

Every S, FR and SC ID above appears in at least one test's name. Spec 001's traceability check confirms it, and this slice runs that check in CI.

## Approval

- Gate 1: approved by Brad on 2026-11-01 ([comment on #6](https://github.com/memorex386/bradthome/pull/6#issuecomment-6568034631))
- Changed during the build, on 2026-11-02: S2.5, S3.2, FR-006 and FR-010, for Dependabot's sign-off and message case, from Brad's answers on the build's decision page (D83, D84).
- Changed during the build, on 2026-11-02: the locked evidence test's K0 row cites the sandbox's clean run of this branch, since a run of this pull request can't cite itself ([D85](../../docs/decisions/0085-k0-evidence-comes-from-the-sandbox.md)). The row may say pending until a run with the evidence passes ([D86](../../docs/decisions/0086-k0-evidence-may-be-pending-until-a-run-passes.md)).
- Changed in the review, on 2026-11-02: FR-008, so the commits, secrets, hygiene and lock steps get the list and hide a place that holds a term, from Brad's answer on the review's decision page ([D87](../../docs/decisions/0087-ci-jobs-that-print-pull-request-text-hide-private-terms.md)).
- Changed in spec 003's tests stage, on 2026-11-03: FR-002 and FR-014, so the locked tests check rules instead of fixed lists, and later specs can add CI jobs and workflows, from Brad's answer on slice 2.1's plan decision page, approved with spec 003's plan at Gate 2 ([D95](../../docs/decisions/0095-spec-002s-locked-tests-check-rules-instead-of-lists.md)).
- Changed in the review, on 2026-11-02: no spec text, but the locked tests gain regression tests for the review's three code fixes, under S2.5, S3.1, S3.2 and S5.3 ([D88](../../docs/decisions/0088-lock-regression-tests-for-slice-1-4s-review-fixes.md)).
- Changed in spec 003's build, on 2026-11-03: FR-014 allows `pull-requests: write` in spec 003's preview comment job only, since GitHub refused the comment with `issues: write`. The Dependabot and workflow tests changed with it, and spec 002 was re-locked. Brad chose this in the build session ([D99](../../docs/decisions/0099-the-preview-comments-with-pull-requests-write-and-accepts-hostings-hsts.md)) and approves it at Gate 3 with spec 003.
- Changed on 2026-11-03, after slice 2.1 merged: FR-001 and FR-003, so a draft pull request runs the quick jobs only, the full suite runs once it's ready for review, and an edit to its text runs only privacy and commits, with the gate adding the latest code run's results. The workflow and gate tests changed with it, and spec 002 was re-locked. Brad asked for this in the slice 2.1 session ([D100](../../docs/decisions/0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md), [#17](https://github.com/memorex386/bradthome/issues/17)).
- Changed on 2026-11-03, after slice 2.1: the setup-check and ruleset-check tests run nightly in `.github/workflows/setup.yml`, not in `ci.yml`'s tests job. No test changed ([D102](../../docs/decisions/0102-machine-setup-tests-run-nightly.md)).
- Changed on 2026-11-03, after slice 2.1: S4.3, S6.1 and FR-019 turn auto-merge on, so Brad can approve a pull request and let it merge once its checks pass. The ruleset still needs Brad's approval, and the agent's guard still denies arming it. `tests/002/integration/setup-check-repo.test.ts` and `tests/002/helpers/messages.ts` changed with it, and spec 002 was re-locked. Brad asked for this in the session ([D103](../../docs/decisions/0103-auto-merge-on-after-brads-approval.md)).
- Changed in spec 008 (slice 2.6, [#29](https://github.com/memorex386/bradthome/issues/29)), on 2026-11-04: FR-014 lets spec 008's release.yml stage and release jobs and rollback.yml's rollback job hold `id-token: write`, so they can sign in to Google with GitHub's identity token. The workflow test's list of allowed writes changed with it, and spec 002 was re-locked. Brad approved this at spec 008's Gate 1 ([D114](../../docs/decisions/0114-specs-002-and-003-make-room-for-the-release-workflows.md)).
- Changed on 2026-11-04, in [#32](https://github.com/memorex386/bradthome/issues/32): S1.2, S2.1, S3.1, S5.1, FR-001, FR-002, FR-003, FR-005, FR-008 and FR-010 change, and S1.6, S2.6 and FR-022 are new. The gate decides from its workflow's `needs`, never GitHub's API, and counts the tests matrix once. An edit to a pull request's text runs only the new text check, in `pr-text.yml`, which the ruleset requires. The gate, workflow, ruleset and text tests, and R1's summary line in the mocks and the ruleset check, changed with it, and spec 002 was re-locked. Brad approved this at #32's Gate 1 ([D115](../../docs/decisions/0115-the-gate-reads-its-own-results-and-pr-text-has-its-own-check.md)).
- Changed in spec 009 (slice 3.1), on 2026-11-04: FR-014 lets `next.yml`'s deploy job hold `id-token: write`, so it can deploy main to the `next` channel with GitHub's identity token (D119). The workflow test's list of allowed writes changed with it, and spec 002 was re-locked. Brad approved this at spec 009's Gate 1 ([D123](../../docs/decisions/0123-spec-002-lets-the-next-deploy-sign-in.md)).
