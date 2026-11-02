# Plan for spec 002: CI and rulesets

<!-- Written in plan mode, in a fresh session, after Gate 1. Brad approves it at Gate 2. -->

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved 2026-11-01 |
| Status | Approved |

## Approach

CI is a thin layer over the scripts spec 001 built, so the git hooks and CI apply the same rules with the same messages.

- **Two workflows.**
  - `.github/workflows/ci.yml` runs on every pull request event that can change what it checks (opened, synchronize, reopened, edited) and on every push to main, with no path filter (FR-001, S1.4).
    - Its jobs are `types`, `tests` (a matrix on `ubuntu-24.04` and `windows-2025`), `trace`, `privacy`, `secrets`, `commits`, `hygiene` and `gate` (FR-002).
    - `gate` needs every other job and runs even when one failed (`if: always()`). It reads the jobs' results, and fails for any result other than success, naming each job (FR-003, S1.2, K1). That covers failed, cancelled and skipped jobs, and a job missing from its expected list.
    - A concurrency group keyed on the pull request cancels older runs (FR-004, S1.5).
  - `.github/workflows/locked-tests.yml` has one job, `lock`, run on `pull_request_target` (FR-011, S3.3, K8).
    - It checks out main's copy, and fetches the pull request's head as git objects only.
    - It runs main's `scripts/ci/lock.ts`. The script reads the pull request's files with `git diff base...head` and `git show`, and hashes the head's test files against the head's `tests.lock`.
    - It never checks out, installs or runs the pull request's code. It uses no secrets, and its token is read-only.
- **Every job runs one script in `scripts/ci/`,** so the workflows hold no logic.
  - The scripts use Node's built-in modules, plus commitlint in the commits job.
  - They reuse `scripts/lib/`: terms, addresses, gitleaks, copies, locks, messages and the output gate.
  - Every line they print passes the output gate, so a log never holds a term (FR-020, SC-003).
- **Three moves, with no change in behavior.** Spec 001's locked tests guard each one.
  - The range logic in `scripts/hooks/pre-push.ts` (reading commits and patches, and checking each commit) moves to `scripts/lib/commits.ts`.
  - The trace logic in `scripts/trace.ts` moves to `scripts/lib/trace.ts`.
  - The commitlint loader in `scripts/hooks/commit-msg.ts` moves to `scripts/commitlint.ts`, outside `lib/`, which FR-029 keeps to Node's built-ins.
- **What each job checks.**
  - **privacy** (FR-005–FR-008, S2.1, S2.2, S2.4, S2.5, K3, K4, K6):
    - It scans the added lines and changed paths in `base...head`, every commit's message and identities, the branch name, and the pull request's title and description.
    - It reads the title and description from the event file, never by `${{ }}` interpolation into a script.
    - Only this step gets the `PRIVATE_TERMS` secret. On Dependabot's runs, the same name reads Dependabot's copy.
    - A missing or empty list prints K6 and fails.
  - **secrets** (FR-009, S2.3, K5): gitleaks over `base..head`, redacted, through spec 001's library.
  - **commits** (FR-010, S3.1, S3.2, K7):
    - Every commit in the range is linted with the repo's commitlint config.
    - The title is linted on its own, plus the `Refs: #N` line when the description has one. The whole description isn't linted, since commitlint's body rules would reject the template's long lines.
    - Commits that `dependabot[bot]` made, and its titles, skip the spec-or-issue rule only.
  - **trace** (FR-012, S3.4, K9): a spec with a `tests.lock` is traced. A spec without one is listed and doesn't fail.
  - **hygiene** (FR-013, S3.5, K10): CRLF in the index (`git ls-files --eol`), `git diff --check base...head`, and `pnpm sync --check`.
  - **types and tests** (S1.3, S3.6, K2): `pnpm typecheck` and `pnpm test`, with gitleaks on the PATH.
- **Pinning** (FR-014).
  - Only first-party actions:
    - `actions/checkout` v7.0.1, at `3d3c42e5aac5ba805825da76410c181273ba90b1`
    - `actions/setup-node` v7.1.0, at `949feb2413d6458794dcd2491c4babbbce0c15c1`
  - Node comes from `.nvmrc`. pnpm comes from Corepack, which reads the hash-pinned `packageManager`.
  - gitleaks 8.30.1 is downloaded from its release and checked against pinned SHA-256 hashes:
    - linux_x64: `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`
    - windows_x64: `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e`
  - Each workflow sets `permissions: contents: read`, and checkouts don't keep the token.
- **Dependabot** (FR-015, S4.1–S4.3, D1). `.github/dependabot.yml` has two entries, `npm` (GitHub files pnpm under npm) and `github-actions`. Each runs weekly, with one group for everything and `cooldown: default-days: 3`. Its commits use the `build` prefix with a scope. Nothing merges them: the repo's auto-merge stays off, and no workflow approves or merges.
- **The ruleset and code owners** (FR-016–FR-018, S5.1–S5.4, R1, R2).
  - `.github/CODEOWNERS` is `* @memorex386`.
  - `.github/rulesets/main.json` is the body GitHub's rulesets API accepts:
    - It targets `refs/heads/main`, with no bypass actors.
    - Pull requests only: squash merges only, 1 approval, a code owner's review, and stale approvals dismissed on a new push.
    - Required checks: `gate` and `lock`, from GitHub Actions (integration 15368). GitHub shows them as `ci / gate` and `locked-tests / lock`.
    - Linear history, signed commits, no force pushes and no deletion.
  - `pnpm ruleset:check` (`scripts/ruleset-check.ts`):
    - It checks the file for each S5.1 rule, and CODEOWNERS for Brad's account on every path.
    - It reads GitHub's rulesets. GitHub's refusal for a private free-plan repo reports **pending** (R1). No network or no gh reports **not checked**. Neither fails.
    - When GitHub serves the ruleset, the check compares it with the file after dropping the fields only the server sets, and lists each difference (R2). It compares bypass actors only when GitHub returns them, which needs admin.
- **Repo settings** (FR-019, S6.1, S1). `pnpm setup:check` gains a line that reads the repo's settings as the agent, which write access allows. It names each setting that differs, with its fix. If GitHub can't be reached, the line is a problem with its fix.
- **Docs** (FR-021). AGENTS.md's Checks section and the pull request template name the CI checks, and keep only the hand-run checks CI doesn't cover: `pnpm setup:check`, `pnpm ruleset:check`, and the address log for commits not yet pushed.

## What exists today

- Spec 001's scripts: `scripts/lib/` (terms, addresses, git, gitleaks, locks, copies, messages, output), the hooks in `scripts/hooks/`, and the `terms`, `lock`, `trace`, `sync` and `setup:check` commands. Spec 001's tests are in `tests/001/`, with helpers for isolated machines and scratch repos with a bare origin.
- `.github/` holds only the pull request template and the light-change issue template.
- On GitHub, on 2026-11-01:
  - The repo has no workflows and no secrets.
  - It allows merge, rebase and squash merges, and its squash title is the commit's or the pull request's. Auto-merge is off, and branches aren't deleted after merging.
  - Its rulesets are refused until the repo is public or on Pro. Main has no branch protection.
  - The agent's account has write and triage access, without admin.

## Facts this plan rests on

Checked on 2026-11-01:

- **Actions on a private repo on the free plan.**
  - The free plan includes $12 of compute a month. A Linux minute costs $0.006 and a Windows minute $0.010.
  - Usage is blocked when the included amount runs out, unless a payment method is on file. Standard runners are free on public repos.
- **A typical run** takes about 9 Linux jobs of about a minute each, each billed by the rounded-up minute, plus about 4 Windows minutes. That's about $0.10 a run, or about 110 runs a month.
- **Runner images.** `ubuntu-24.04` and `windows-2025` are current, and the `-latest` labels point at them. No deprecation is announced.
- **Action versions.** checkout v7.0.1 and setup-node v7.1.0 are the latest releases. gitleaks 8.30.1 is still current.
- **Dependabot.** `cooldown.default-days` works for npm and GitHub Actions. GitHub's support table lists pnpm 7 to 12. A community thread from September 2026 reports trouble with pnpm 11, so it's a risk below.
- **Rulesets.** A required check is named by its job's name. GitHub returns a ruleset's bypass actors only to an account that can edit it.
- **`pull_request_target`** runs the workflow file from the default branch. So the lock job first runs on the first pull request opened after this one merges.

## Order of work

Each stage runs in a fresh session started in this repo's folder.

1. **Tests (stage 5), T001–T007.** Tests are written from the scenarios and locked with `pnpm lock specs/002-ci-and-rulesets` before the build ([D21](../../docs/decisions/0021-lock-tests-written-from-approved-scenarios.md)).
   - The lock and trace scripts exist now, so there's no bootstrap this time.
   - Spec 002 is new on this branch, so the lock hook doesn't guard `tests/002/` until it merges, the same gap spec 001 had. The unit test that checks every spec's `tests.lock` against its files covers it, and the reviewer lists any test change since the lock commit.
2. **Build (stage 6), T008–T020.**
   - Brad's GitHub steps come first, so the privacy job finds its secret on its first run.
   - Then the moved libraries, the CI scripts, the workflows, the ruleset and setup checks, the sandbox runs, the docs and the evidence.
3. **Review (stage 7), T021.**

## How each mock state is tested

Each state has a locked test that runs on Brad's PC and in CI. The states only GitHub can show also get a real run, recorded in `specs/002-ci-and-rulesets/evidence/ci-runs.md`.

| State | Locked test | Real run on GitHub |
| --- | --- | --- |
| K0 | `unit/gate.test.ts` with every job passing. `static/workflows.test.ts`: the nine job names, and no path filter | Sandbox: a clean run of this branch, recorded in the evidence ([D85](../../docs/decisions/0085-k0-evidence-comes-from-the-sandbox.md)). This pull request then shows its own green gate. |
| M1 | — (GitHub's page) | This pull request: its checks, read with `gh pr checks`, and the repo's settings, read through the API, offering squash merges only. Brad sees the merge box at Gate 3. The agent's guard keeps it off pull request pages. |
| K1 | `unit/gate.test.ts`: a failed, a cancelled, a skipped and a missing job | Sandbox: a planted failure |
| S1.5 | `static/workflows.test.ts`: the concurrency group cancels older runs | Sandbox: two quick pushes, and the older run is cancelled |
| K2 | `static/workflows.test.ts`: the two-runner matrix. `integration/ci-jobs.test.ts`: a type error and a failing test fail their jobs | Sandbox: a test that fails only on Windows, and a type error |
| K3, K4, K6 | `integration/privacy.test.ts`, on scratch repos with made-up terms: each place a term can hide, any letter case, masked addresses, and a missing or empty list | Sandbox, with a made-up list as its secret. K6 runs once with the secret removed. |
| K5 | `integration/secrets.test.ts`, with a fake secret built at run time | Sandbox |
| K7 | `integration/commits.test.ts`: a bad title, a bad commit, `Refs: #N` in the description, and Dependabot's exemption | Sandbox |
| K8 | `integration/lock.test.ts`, with base and head refs: a locked test changed, a `tests.lock` changed, the spec changed too (passes), and a pull request that edits the lock check itself (the verdict doesn't change). `static/workflows.test.ts`: `pull_request_target`, main's checkout, no install, no secrets | Sandbox, once the lock workflow is on the sandbox's default branch |
| K9 | `integration/trace-all.test.ts`: fixture specs with and without a lock | Sandbox |
| K10 | `integration/hygiene.test.ts`: CRLF, a whitespace error and a drifted copy | Sandbox |
| D1 | `static/dependabot.test.ts`. The privacy and commits tests with Dependabot's commits (S2.5, S3.2) | Sandbox: Dependabot's first weekly pull requests, with its own made-up secret |
| R1, R2 | `integration/ruleset-check.test.ts`: a fake `gh` replays GitHub's refusal, a matching ruleset, a different one and no network, and files each missing one rule | — (live in slice 1.5) |
| S1 | `integration/setup-check-repo.test.ts`: a fake `gh` replays the settings, with each one wrong in turn | `pnpm setup:check` after Brad changes the settings |
| M2 | — | Slice 1.5 |

**The sandbox.** It's a private repo under the agent's account, `bradthome-agent/bradthome-ci-sandbox` (D82).

- It holds a copy of this branch.
- Its Actions and Dependabot secrets hold a made-up term list. It never holds a real term, so K3 can be planted there and never here.
- Its default branch is `sandbox-base`, so nothing is ever pushed to a branch named main.
- Its runs use the agent account's own included minutes, not this repo's.
- Each planted failure is pushed once, and its run's link and result go in the evidence.
- The runs' logs are downloaded and swept for the made-up terms and for unmasked addresses (SC-003).

**The success criteria.**

- **SC-001:** the sandbox's table in the evidence shows every planted failure failing the gate on the first try. A locked test reads it.
- **SC-002:** the evidence records how long the real runs took.
- **SC-004:** before Gate 3, the evidence projects a month's use from the sandbox's minutes per run. GitHub's usage report needs Brad's login, so Brad reads it two weeks after the merge, and slice 1.5's pull request reports it.
- **SC-005:** `ruleset-check.test.ts` passes on a recorded ruleset built from the file. The live check is slice 1.5's.

**FR-029 from spec 001.** This pull request's first CI run executes spec 001's suite, including `tests/001/integration/suite.test.ts` and `tests/001/static/package.test.ts`, on `ubuntu-24.04`. The run's link goes in the evidence and in this pull request, which closes the Linux check spec 001 left pending.

## What lands now, and what waits for slice 1.5

Under [D80](../../docs/decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md):

| This slice | Slice 1.5, right after the repo goes public |
| --- | --- |
| The CI and locked-tests workflows, with the gate | Applying `.github/rulesets/main.json`, with Brad's login |
| Dependabot and CODEOWNERS | CodeQL default setup |
| The ruleset as a reviewed file, and `pnpm ruleset:check` reporting the live ruleset as pending | Secret scanning with push protection |
| The repo's merge settings and the two secrets | `pnpm ruleset:check` passing against the live ruleset (SC-005), and the blocked merge (M2) |

## Files the build adds

- **`.github/`:** `workflows/ci.yml`, `workflows/locked-tests.yml`, `dependabot.yml`, `CODEOWNERS` and `rulesets/main.json`.
- **`scripts/ci/`:** `gate.ts`, `privacy.ts`, `secrets.ts`, `commits.ts`, `trace-all.ts`, `hygiene.ts` and `lock.ts`, plus `lib/event.ts`, which reads the event file and the commit range.
- **`scripts/`:** `lib/commits.ts`, `lib/trace.ts`, `commitlint.ts` and `ruleset-check.ts`, run as `pnpm ruleset:check`.
- **`tests/002/`:** `unit/`, `static/`, `integration/`, `helpers/` and `fixtures/`.
- **`specs/002-ci-and-rulesets/`:** `tests.lock` from the tests stage, and `evidence/ci-runs.md` from the build.
- **Changes:**
  - `scripts/hooks/pre-push.ts`, `scripts/hooks/commit-msg.ts` and `scripts/trace.ts` import the moved code.
  - `scripts/lib/messages.ts` gains the K, R and S1 messages.
  - `scripts/setup-check.ts` gains the repo-settings line.
  - `package.json` gains the `ruleset:check` command and an exactly pinned `yaml` for the static tests, with the lockfile.
  - AGENTS.md, the pull request template, the working agreement's and the slice plan's changes since approval, the decision log, and the spec's status.

## GitHub settings the build changes

Brad's Gate 2 comment approves this list. Each step that needs Brad's admin login also asks at the time, through Claude Code's prompt for another gh login (spec 001, C4).

| When | Change | Who, and why |
| --- | --- | --- |
| T008, before any workflow is pushed | The `PRIVATE_TERMS` secret for Actions, set from the file on Brad's PC by one command that reads the file. The agent never sees the terms. | Brad's login. Secrets need admin. |
| T008 | The same secret for Dependabot | Brad's login |
| T008 | The merge settings: merge commits and rebase merges off, the pull request's title as the squash commit's title, the branch's commit messages as its body, and branches deleted after merging. Auto-merge is already off. | Brad's login. Settings need admin. |
| T008 | Read the Actions settings. If the default token can write, or Actions can approve pull requests, set it read-only with approvals off. | Brad's login |
| T016 | Create the private sandbox repo under the agent's account, set its made-up secrets, and make `sandbox-base` its default branch. It stays private, and is archived after slice 1.5. | The agent, as admin of its own repo |

## Alternatives considered

| Option | Why not |
| --- | --- |
| The gitleaks and pnpm setup actions from their projects | Third-party code running with the job's token. A release checked against a pinned hash, and Corepack, do the same with first-party pieces only. |
| The checks written inline in the workflows | They can't be unit-tested, and they'd copy the hooks' rules and messages |
| The lock check as a job in the CI workflow | The pull request's copy of the check would judge itself (S3.3) |
| `pull_request_target` with the pull request's head checked out | It would run untrusted code with a privileged trigger. The head is fetched as objects and read with `git show` only. |
| `workflow_run` for the lock check | It reports on a different commit, so it isn't a clean required check |
| Planted failures in this repo's own pull requests | K3 would put a real private term on GitHub, and every run would spend this repo's minutes |
| Recorded results only, with no real runs | SC-001 asks for the gate failing on GitHub |
| Linting the whole pull request description | commitlint's body rules reject the template's long lines |
| Changing `pnpm trace` to pass specs with no lock | Spec 001's locked tests pin its exit codes. The CI wrapper lists those specs instead. |
| Running the setup and ruleset checks in CI | GitHub refuses the ruleset read until the repo is public, and the setup check already reads the settings |
| Caching the pnpm store | Another action for a small install. Revisit if SC-002 or SC-004 runs tight. |

## Decisions

- **New record:** [D82](../../docs/decisions/0082-the-conventions-batch-for-building-ci.md), a tier-2 batch, accepted at Gate 2:
  - Workflows use first-party actions only, pinned by commit hash. pnpm comes through Corepack, and gitleaks from its release checked against a pinned hash.
  - The checks' logic lives in `scripts/ci/` and shares `scripts/lib/` with the hooks.
  - The lock workflow runs on `pull_request_target` from main's checkout, and reads the pull request's head as data, with no secrets and a read-only token.
  - Planted failures run in a private sandbox repo under the agent's account, with made-up terms only.
  - Evidence from real CI runs goes in `specs/NNN-name/evidence/ci-runs.md`, and a locked test reads it.
- **Tier 3, decided here and listed in the pull request:**
  - The ruleset names the required checks by their job names, `gate` and `lock`.
  - The squash commit's body is the branch's commit messages, today's setting, so a light change's `Refs: #N` line reaches main.
  - Editing a pull request's title or description re-runs CI, so the new text is scanned.
  - `pnpm ruleset:check` reports "not checked" with no network, and doesn't fail.
  - The setup check's repo line treats an unreachable GitHub as a problem.
  - The gate's list of expected jobs lives in `scripts/ci/gate.ts`.
  - Every job prints spec 001's message shape. Messages for cases the mocks don't show follow the mocks' style.

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| The included minutes run out, about 110 runs a month, and no gate appears | Medium | Older runs are cancelled, planted failures run in the sandbox, and SC-004 measures it. If it's tight, cache, or fold the small Linux jobs into fewer. Brad waits rather than merging without a gate. |
| Dependabot fails on pnpm 12 | Medium | The sandbox's first Dependabot run shows it. If it fails, the build reports it to Brad, the Actions group carries on, and the packages wait for Dependabot's fix. |
| The lock job can't run on this pull request, since `pull_request_target` reads main | Certain | The integration tests, `pnpm lock --check` by hand, and the sandbox run. The first live run is the next pull request. |
| A later change makes the lock workflow run pull request code | Low | A locked static test pins main's checkout, no install, no secrets and read-only permissions. CODEOWNERS and the reviewer cover `.github/`. |
| The term secret reaches a log | Low | Only the privacy step gets it, every line passes the output gate, GitHub masks secrets, and the sandbox's logs are swept |
| A test differs between Windows and Linux | Medium | That's what K2 is for. A real difference is fixed, never skipped. |
| The squash commit on main fails the commits job on its push | Low | The branch's commit messages are already Conventional Commits. The first push to main is checked, and a failure is fixed in the next pull request. |
| GitHub rejects the ruleset file in slice 1.5 | Low | Its shape follows GitHub's docs, and slice 1.5 applies it before anything else merges |
| Moving the hooks' code changes their behavior | Low | Spec 001's locked tests, run by the Stop hook and now by CI |

## Tests to write and lock

Paths are under `tests/002/`. Each test's name leads with the IDs it covers ([D78](../../docs/decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md)).

| File | IDs in its test names |
| --- | --- |
| `unit/gate.test.ts` | K0, K1, S1.1, S1.2, FR-002, FR-003, FR-020 |
| `static/workflows.test.ts` | K0, K2, S1.4, S1.5, S3.3, FR-001, FR-002, FR-004, FR-008, FR-011, FR-014 |
| `static/dependabot.test.ts` | D1, S4.1, S4.2, S4.3, FR-015 |
| `static/codeowners.test.ts` | S5.4, FR-016 |
| `static/docs.test.ts` | FR-021 |
| `static/evidence.test.ts` | SC-001, SC-002, SC-003, SC-004 |
| `integration/privacy.test.ts` | K3, K4, K6, D1, S2.1, S2.2, S2.4, S2.5, FR-005, FR-006, FR-007, FR-008, FR-020, SC-003 |
| `integration/secrets.test.ts` | K5, S2.3, FR-009, SC-003 |
| `integration/commits.test.ts` | K7, D1, S3.1, S3.2, FR-010 |
| `integration/lock.test.ts` | K8, S3.3, FR-011 |
| `integration/trace-all.test.ts` | K9, S3.4, FR-012 |
| `integration/hygiene.test.ts` | K10, S3.5, FR-013 |
| `integration/ci-jobs.test.ts` | K2, S1.3, S3.6 |
| `integration/ruleset-check.test.ts` | R1, R2, S5.1, S5.2, S5.3, S5.4, FR-017, FR-018, SC-005 |
| `integration/setup-check-repo.test.ts` | S1, S6.1, FR-019 |

## Tasks

Tests session (stage 5):

- [ ] **T001** The harness: add `yaml`, pinned exactly, and the `ruleset:check` command to `package.json`, with the lockfile. No product code. (groundwork for FR-014–FR-018)
- [ ] **T002** The helpers. (SC-003)
  - Scratch repos with base and head refs on a bare origin.
  - A fake `gh` on the PATH that replays recorded responses.
  - A builder for GitHub's event file, and recorded job results for the gate.
  - Reuse `tests/001/helpers/` for isolated machines, made-up terms and `expectNoTerm`.
- [ ] **T003** The static tests for the gate, the workflows, Dependabot, CODEOWNERS and the docs. (K0, K1, D1, S1.1, S1.2, S1.4, S1.5, S4.1–S4.3, S5.4, FR-001–FR-004, FR-008, FR-011, FR-014–FR-016, FR-020, FR-021)
- [ ] **T004** The privacy, secrets and commits tests. (K3–K7, D1, S2.1–S2.5, S3.1, S3.2, FR-005–FR-010, FR-020, SC-003)
- [ ] **T005** The lock, trace, hygiene and CI-jobs tests. (K2, K8–K10, S1.3, S3.3–S3.6, FR-011–FR-013)
- [ ] **T006** The ruleset-check, setup-check and evidence tests. (R1, R2, S1, S5.1–S5.4, S6.1, FR-017–FR-019, SC-001–SC-005)
- [ ] **T007** Confirm coverage, then lock the tests. (D21)
  1. Run `pnpm trace specs/002-ci-and-rulesets`, and have a fresh-context subagent confirm it.
  2. Run the suite once, to check that each test fails because a module is missing, not because of a syntax error.
  3. Run `pnpm lock specs/002-ci-and-rulesets`, commit `test(002): lock the tests for spec 002`, and push.
  4. Record the lock commit in the pull request.

Build session (stage 6):

- [ ] **T008** Brad's GitHub steps: the two secrets, the merge settings and the Actions settings. (FR-008, FR-019)
- [ ] **T009** Move the range, trace and commitlint code into `scripts/lib/commits.ts`, `scripts/lib/trace.ts` and `scripts/commitlint.ts`, with spec 001's suite passing. (groundwork)
- [ ] **T010** The event reader, and the K, R and S1 messages. (FR-020)
- [ ] **T011** The privacy, secrets and commits jobs' scripts. (S2.1–S2.5, S3.1, S3.2, FR-005–FR-010)
- [ ] **T012** The trace, hygiene and gate scripts. (S1.1, S1.2, S3.4, S3.5, FR-002, FR-003, FR-012, FR-013)
- [ ] **T013** `scripts/ci/lock.ts` and the locked-tests workflow. (S3.3, FR-011)
- [ ] **T014** The CI workflow, with its pins and the gitleaks install. (S1.3–S1.5, S3.6, FR-001, FR-004, FR-014)
- [ ] **T015** Dependabot, CODEOWNERS, the ruleset file, `pnpm ruleset:check` and the setup check's repo line. (S4.1–S4.3, S5.1–S5.4, S6.1, FR-015–FR-019)
- [ ] **T016** The sandbox: create it, push this branch, run each planted failure, Dependabot's first run and the cancelled run, and sweep the logs. (SC-001–SC-003, D1)
- [ ] **T017** Push to this pull request: its first CI run, the Linux run of spec 001's suite (spec 001's FR-029), and the timings. (S1.1, S1.4, SC-002)
- [ ] **T018** The docs: AGENTS.md, the pull request template, the working agreement, the slice plan, the decision log and the spec's status. (FR-021)
- [ ] **T019** The evidence, with the minutes projection. (SC-001–SC-004)
- [ ] **T020** The full check: the tests, the type check, trace, the lock check, `pnpm setup:check`, `pnpm ruleset:check` and the hand-run checks. Then push and update the pull request. (every ID)

Review session (stage 7):

- [ ] **T021** Review with the pinned reviewer through the review skill, fix or answer each finding, then mark the pull request ready for Gate 3.

## Open choices for Gate 2

The plan takes the first option in each. Brad can pick another at Gate 2.

1. **The ruleset's first live run.** Slice 1.5 applies it here, before anything else merges. A rehearsal now, in a public repo under the agent's account that holds only the ruleset, could catch a shape GitHub rejects sooner, but it puts a repo in public before D11's leak scan.
2. **The squash commit's body.** The branch's commit messages, which is today's setting. It could instead be the pull request's description, or blank.
3. **SC-004.** A projection before Gate 3, with the two weeks of real use reported in slice 1.5's pull request.

## Preview and rollback

Nothing on the site changes, so there's no preview deploy. To undo it after merging:

1. Revert the squash commit.
2. Delete the two secrets, with Brad's login.
3. Put back the merge settings, only if Brad wants them back.
4. Archive the sandbox repo.

## Approval

- Gate 2: approved by Brad on 2026-11-01 ([comment on #6](https://github.com/memorex386/bradthome/pull/6#issuecomment-6568315421)), on the committed plan. The approval also covers [D82](../../docs/decisions/0082-the-conventions-batch-for-building-ci.md) and the GitHub changes this plan lists.
