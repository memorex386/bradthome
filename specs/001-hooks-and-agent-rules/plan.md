# Plan for spec 001: Hooks and agent rules

<!-- Written in plan mode, in a fresh session, after Gate 1. Brad approves it at Gate 2. -->

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved 2026-10-31 and amended before Gate 2 |
| Status | Approved |

## Approach

The slice puts the repo's hard rules in front of every commit and push on Brad's PC. It has three parts that share one set of scripts.

- **Git hooks, for every agent and Brad.** husky runs three thin hooks, and each one starts a single Node process: `scripts/hooks/pre-commit.ts`, `commit-msg.ts` and `pre-push.ts`.
  - They share libraries in `scripts/lib/`: the private-term list and matcher (FR-004, FR-005), the address rules and masking (FR-008), gitleaks with redaction (FR-003), locked tests (FR-011), copies (FR-014), and the mocks' exact words (FR-016).
  - Every line a check prints goes through an output gate. The gate hides any line that holds a term, whether it's a path, a commit subject or a masked address, so SC-002 holds even where the mocks print a path or an address.
  - Every check fails closed (FR-007).
  - pre-push re-runs the secret, term and address checks on every commit the remote doesn't have, and checks branch and tag names (FR-006, FR-009).
- **Claude Code, for the builder agent.** Two layers back each other up.
  - Deny and ask rules in `.claude/settings.json` hold in every permission mode, including bypass, and need no script. They still hold if hooks are switched off (FR-017, FR-018, FR-021).
  - A PreToolUse guard, `.claude/hooks/guard.ts`, parses commands and covers what the rules can't express: `-n` versus `--no-verify`, merge mutations kept in a file, browser URLs nested in a tool's input (FR-019), and edits to locked tests (FR-020). Settings can't hold rules on an MCP tool's parameters, so the browser rule has to live in the guard.
  - A UserPromptSubmit hook records the working tree at the start of each turn. The Stop hook then runs the type check and unit tests only when code changed in that turn (FR-022, S5.2).
  - A self-contained copy of the guard covers sessions started in other folders (FR-023).
- **The reviewer and the loop.**
  - `.claude/agents/reviewer.md` is pinned to `claude-opus-5-5`, with Read, Grep and Glob only (FR-024).
  - `pnpm review:eval` scores it on five frozen cases, three runs each (FR-025).
  - Spec Kit is installed for Claude Code and Codex, with this repo's templates as its overrides (FR-026).
  - The seven loop skills live in `.agents/skills`, and `pnpm sync` copies them to `.claude/skills` (FR-014, FR-027).

Setup is `pnpm install` (FR-015), then `pnpm setup:check` (FR-028). Machine-specific values never enter the repo. They live in two global git settings on the machine: `bradthome.privateTerms` for the term list, and `bradthome.agentGhConfigDir` for the agent's gh login.

When `pnpm install` runs on a machine that set `bradthome.agentGhConfigDir`, and that folder holds bradthome-agent's gh login, it writes `GH_CONFIG_DIR` into the checkout's ignored `.claude/settings.local.json`. On every other machine, including CI and anyone who clones the public repo, it does nothing. So a fresh clone or a new worktree on Brad's PC needs only `pnpm install` (SC-005).

## What exists today

- The repo holds the docs, decision records, templates, `.gitattributes`, `.editorconfig`, `.nvmrc` (22.23.4) and spec 001 with its mocks. There's no `package.json`, `.claude/`, `.husky/`, `scripts/` or `tests/` yet.
- On Brad's PC:
  - Node 22.23.4, Git for Windows 2.56, gitleaks 8.30.1, gh, Corepack 0.34.6 and Python 3.11 are installed.
  - The global pnpm is 9.15.0. uv and Spec Kit aren't installed.
  - The agent's gh login lives in its own config folder. The default gh login is Brad's admin account.
  - The private-term list is drafted, but its git setting isn't set yet.
- The desktop app runs Claude Code 2.1.309. The `claude` command on PATH is 2.1.272, which refuses `claude-opus-5-5`: that model needs 2.1.280 or later. The latest release is 2.1.316.

## Order of work, and how the lock bootstraps

Each stage runs in a fresh session started in this repo's folder.

1. **Tests (stage 5), T001–T009.** The test harness comes first: `package.json`, the lockfile, `tsconfig.json` and `vitest.config.ts`, with no product code. Then every test, helper, fixture and frozen case is written under `tests/001/`, from the scenarios and against the interfaces below. Coverage is confirmed, then the tests are locked.
2. **Build (stage 6), T010–T026.** The build goes in this order:
   - the machine setup
   - the libraries, then the lock and trace scripts
   - the three hooks, then the husky wiring
   - Spec Kit, the skills and the reviewer
   - the Claude Code settings and hooks, the user guard and the setup check
   - the docs and the evidence
3. **Review (stage 7), T027.** The pinned reviewer runs through the review skill. Each finding is fixed or answered, and the pull request is marked ready for Gate 3.

The build's order is deliberate:

- The term-list setting exists before any hook lands, or every commit would block.
- Each check works before husky turns it on. From then on, the build's own commits go through the hooks.
- Spec Kit is installed before the guard's settings exist, so nothing it writes to `.claude/settings.json` goes unseen.
- The guard's files come late. Once their ask rules land, later edits to those files ask Brad (C9), since Claude Code reloads settings during a session.

**The bootstrap.** This slice builds the lock and traceability scripts that its own tests depend on ([D21](../../docs/decisions/0021-lock-tests-written-from-approved-scenarios.md)), so the tests stage can't use them yet.

- **Coverage before the lock** is checked by a one-off listing of every S, FR and SC ID in the spec against the IDs in the test names. A fresh-context subagent confirms it, as the working agreement asks of "the traceability check and the reviewer".
- **The lock** is written by hand in the exact FR-012 format, which is what `sha256sum` prints and `sha256sum --check` reads:
  - one `<sha256>  <path>` line per file under `tests/001/`
  - sorted by byte order, with LF line endings
  - committed as `test(001): lock the tests for spec 001`, with the pull request recording that commit
- **Closing the loop.** T012 builds both scripts first.
  - Locked tests then require the lock script to reproduce the hand-made `tests.lock` byte for byte (S3.5, FR-012).
  - They also require the trace script to pass on spec 001 (FR-013).
  - If either disagrees, the build stops and asks Brad. It never edits a locked file to make them agree.
- **Until spec 001 merges, the lock hook and the guard don't protect its own tests.**
  - FR-011 and FR-020 compare with main, and spec 001 is new on this branch. That follows the working agreement's rule that a locked test may change along with a spec change in the same pull request.
  - To cover the gap during the build, a locked test, "every spec's tests.lock matches its files", runs in the unit suite. If a locked file changes, the Stop hook sends the agent back.
  - Any change needs Brad's OK, a re-lock with `pnpm lock`, and a line in the pull request.
  - The reviewer lists every change to `tests/001/` or `tests.lock` since the lock commit.

## Files the build adds

- **Root**
  - New: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `vitest.config.ts`, `commitlint.config.ts` and `.worktreeinclude`.
  - `pnpm-workspace.yaml` holds pnpm's settings, with each dependency build approved by name.
  - `vitest.config.ts` defines two projects, `unit` and `integration`.
  - `.worktreeinclude` copies `.claude/settings.local.json` into worktrees that Claude Code creates.
  - Changes:
    - `.gitignore` adds `.claude/settings.local.json` and `.claude/worktrees/`.
    - `.gitattributes` adds `*.diff -whitespace`, so the frozen cases pass `git diff --check`.
    - `.editorconfig` keeps trailing spaces in `.diff` files.
- **`.husky/`:** `pre-commit`, `commit-msg` and `pre-push`. Each is one line that runs its Node script.
- **`scripts/hooks/`:** `pre-commit.ts`, `commit-msg.ts` and `pre-push.ts`.
- **`scripts/lib/`:** `terms.ts`, `addresses.ts`, `git.ts`, `gitleaks.ts`, `locks.ts`, `copies.ts`, `messages.ts` and `output.ts`. They use only Node's built-in modules, so pre-commit and pre-push work in a checkout that has no `node_modules`.
- **`scripts/`:**
  - `terms.ts`, run as `pnpm terms`
  - `lock-tests.ts`, run as `pnpm lock`
  - `trace.ts`, run as `pnpm trace`
  - `sync.ts`, run as `pnpm sync`
  - `setup-check.ts`, run as `pnpm setup:check`
  - `review-eval.ts`, run as `pnpm review:eval`
  - `guard-install.ts`, run as `pnpm guard:install`
  - `setup-local.ts`, which `prepare` runs
- **`.claude/`:**
  - `settings.json`.
  - `hooks/guard.ts`, `hooks/turn-start.ts`, `hooks/stop.ts` and `hooks/user-guard.ts`.
  - `hooks/lib/shell.ts`, `hooks/lib/github.ts` and `hooks/lib/browser.ts`. Nothing in `hooks/` imports from outside it, so the user guard can be copied on its own.
  - `agents/reviewer.md`.
  - `skills/` holds the synced copies of the seven skills, plus the `speckit-*/` folders that Spec Kit writes.
- **`.agents/skills/`:**
  - `interview/`, `decision-page/`, `record-decision/`, `lock-tests/`, `review/`, `open-pr/` and `retro/`, each with a `SKILL.md`.
  - The adapted ones (interview, review and retro) also carry their upstream `LICENSE`.
  - Spec Kit adds `speckit-*/` for Codex.
- **`.specify/`:**
  - Spec Kit's own files.
  - `templates/overrides/spec-template.md` and `plan-template.md`, copies of `docs/templates/spec.md` and `plan.md`.
  - `memory/constitution.md`, which points at the charter, the principles and the working agreement instead of repeating them.
- **`tests/001/`:** `unit/`, `static/`, `integration/`, `helpers/`, `fixtures/` and `frozen-cases/F1-…` to `F5-…`.
- **`specs/001-hooks-and-agent-rules/`:** `tests.lock` from the tests stage, and `evidence/review-eval.json` and `evidence/claude-code-checks.md` from the build.

## Interfaces the tests are written against

- **Git hooks**
  - They run in real git, in scratch repos whose origin is a local bare repo.
  - Messages go to stderr.
  - A pass prints the mock's one ✓ line per hook.
  - A block exits non-zero with the mock's words.
- **Term list**
  - It comes from the `bradthome.privateTerms` git setting, which is a path, or from `PRIVATE_TERMS`, which holds the list's text. `PRIVATE_TERMS` wins whenever it's set, even when empty, and an empty list blocks.
  - There's one entry per line. `#` starts a comment, and `digits:` marks a number.
  - Matching works line by line, ignores letter case and needs whole words. Letters, digits and `_` count as word characters, and a run of spaces in an entry matches any run of whitespace.
  - Digits may have spaces, dots, dashes, round or square brackets, or plus signs between them.
  - A match reports line numbers only, never the term.
- **Addresses**
  - Authors and committers may use `<id>+<login>@users.noreply.github.com`, `<login>@users.noreply.github.com` (`[bot]` logins included), `noreply@github.com` or `brad@bradthome.com`.
  - Trailers may also use `noreply@anthropic.com`.
  - Masking keeps the first two letters and the domain, and a masked address that still holds a term is hidden.
- **Locked tests**
  - A file is locked when a spec's `tests.lock` lists it, at HEAD or in the index.
  - At commit, a spec counts as changed when its `spec.md` in the index differs from the merge base with main: `origin/main`, or `main` when there's no `origin/main`.
  - For a Claude Code edit, the working tree counts too.
- **Copies:** a source and its copy match when their blob IDs in the index are the same.
- **Guard and hooks**
  - Each reads Claude Code's hook JSON on stdin.
  - To allow, it prints nothing and exits 0. To deny or ask, it sets `hookSpecificOutput.permissionDecision` with the mock's message.
  - The checkout comes from the input's `cwd` or the file's path, never `CLAUDE_PROJECT_DIR`, because desktop worktree sessions run hooks from the main checkout.
  - Each hook exports its decision logic for unit tests.
- **Stop hook**
  - It runs `pnpm run typecheck`, and `pnpm run test:unit` with a JSON reporter, and prints the C7 message.
  - It blocks with `{"decision":"block","reason":…}`.
  - It doesn't stop early on `stop_hook_active`, so Claude Code's limit of 8 continuations ends a loop (S5.3).
- **Commands:**
  - `pnpm terms [--files …]`
  - `pnpm lock <spec-dir> [--check]`
  - `pnpm trace <spec-dir>`
  - `pnpm sync [--check]`
  - `pnpm setup:check`
  - `pnpm review:eval [--case F1] [--runs 3]`
  - `pnpm guard:install`
- **Test names** start with every ID they cover, mock states included, as in `G3 S1.2 FR-005 SC-002 blocks a staged private term in any letter case`. The IDs are written literally, so the trace script can read names without running the tests.
- **Samples for the Claude Code tests:**

  | State | Expected | Samples |
  | --- | --- | --- |
  | C0 | Allowed | `gh pr view 12 --json author,state`, `gh pr create --draft …`, `gh pr comment 12 --body …` |
  | C1 | Denied | `gh pr merge 12 --squash`, `gh pr merge --auto 12`, `GH_REPO=… gh pr merge 12`, `gh api -X PUT repos/memorex386/bradthome/pulls/12/merge`, GraphQL `mergePullRequest` and `enablePullRequestAutoMerge` (inline or in a `-F query=@file`), the PowerShell forms, and the desktop app's auto-merge tool |
  | C2 | Denied | `gh pr review 12 --approve`, `gh pr review 12 -a`, `gh api …/pulls/12/reviews -f event=APPROVE`, GraphQL reviews with `event: APPROVE` |
  | C3 | Denied | `git commit --no-verify …`, `-n`, `-nm`, `-anm`, `HUSKY=0 git commit …`, `git -c core.hooksPath=… commit`, `git config core.hooksPath …`, `git push --no-verify`, deleting or moving `.husky/_`, setting `PRIVATE_TERMS` |
  | C3 | Allowed look-alikes | `git log -n 5`, `git push -n` (a dry run) |
  | C4 | Asks | `GH_CONFIG_DIR=… gh api user`, `GH_TOKEN=… gh …`, `GITHUB_TOKEN=… gh …`, `gh auth switch`, `login`, `logout`, `token`, `refresh` or `setup-git`, `$env:GH_CONFIG_DIR = …`, a command that changes a `bradthome.*` git setting, an edit to `.claude/settings.local.json` |
  | C5 | Denied | the repo's `/pull/…`, `/pulls`, `/compare/…` and `/settings…` pages, in any letter case: with `navigate`, inside `browser_batch`, with `preview_start` and in Claude in Chrome |
  | C5 | Allowed | the repo's home and file pages, other repos, bradthome.com |
  | C9 | Asks | an edit or write to `.claude/settings.json`, `.claude/hooks/**` or `.husky/**`, at any depth, worktrees included |

## How each mock state is tested

| State | Test | Real-session record (SC-006) |
| --- | --- | --- |
| G0 | `integration/pre-commit`, `commit-msg` and `pre-push`, one ✓ line each | — |
| G1–G6 | `integration/pre-commit.test.ts` | — |
| G7–G9 | `integration/commit-msg.test.ts` | — |
| G10–G13 | `integration/pre-push.test.ts` | — |
| S1, S2 | `integration/setup-check.test.ts`: a made-up term list, a crafted gh `hosts.yml` and a temporary `CLAUDE_CONFIG_DIR` | — |
| S3 | The pre-commit, commit-msg and pre-push tests: no setting, a missing file, an unreadable file and an empty list | — |
| S4 | The pre-commit and pre-push tests, with gitleaks off the PATH | — |
| C0, C1, C2, C3, C5 | `unit/guard.test.ts`, with the samples above | Tried in a real session |
| C4, C9 | `static/settings.test.ts`: a small matcher using Claude Code's documented `*` rules checks each sample against the ask rules, and that the C0 samples match none | Tried in a real session in bypass mode, with Brad answering No |
| C6 | `integration/locked-edit.test.ts`, on a scratch repo whose main locks a test | Tried on a scratch repo |
| C7 | `unit/stop-hook.test.ts` (canned tsc and Vitest output) and `integration/stop-hook-run.test.ts` | Tried in a real session |
| C8 | `unit/user-guard.test.ts`: `-R`, URLs, API paths and a bradthome `cwd`, with other repos untouched | Tried in a session started in a scratch folder |
| E1 | `unit/review-eval.test.ts`, with a fake reviewer and canned outputs | The 15-run report in `evidence/review-eval.json` |

The real-session checks use targets that can't do harm: PR 999999, an empty commit, Brad's "No" on each prompt, and a scratch repo for C6. They run in bypass mode, which is Brad's default. Each result goes in `evidence/claude-code-checks.md`, with the Claude Code version, the mode and the date, and no machine paths.

## Frozen cases, and how the runner scores them

| Case | Planted bug | File in the case | Scenario it breaks |
| --- | --- | --- | --- |
| F1 | The private-term block message includes the matched term | `scripts/lib/terms.ts` | S1.2 |
| F2 | pre-push checks nothing when the remote branch is new, because its old SHA is all zeros | `scripts/hooks/pre-push.ts` | S1.8 |
| F3 | The spec-or-issue rule accepts any word as the scope, so `docs(repo): …` passes with no Refs line | `commitlint.config.ts` | S4.4 |
| F4 | The guard catches `gh pr merge` and GraphQL merges, but not the REST merge endpoint | `.claude/hooks/lib/github.ts` | S2.4 |
| F5 | The locked-test check looks only at the files tests.lock lists, so a change to tests.lock itself passes | `scripts/lib/locks.ts` | S3.3 |

- **What a case holds.** The cases are written by hand in the tests stage and locked with the tests. Each holds:
  - `case.json`: the ID, the title, the planted file and line, the scenario, and a one-line reason
  - `change.diff`: one plausible change with exactly one bug
  - `files/`: the changed files after the diff
- **How a run works.**
  - The runner builds a scratch folder holding spec 001 and its mocks, the committed `.claude/agents/reviewer.md`, and the case's `files/` and `change.diff`. It never copies `case.json`.
  - It runs `claude -p --agent reviewer --output-format json --no-session-persistence --strict-mcp-config --setting-sources project --disable-slash-commands --permission-mode default --permission-prompts none` there, with the review skill's prompt.
  - It removes `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN`, so the run uses Brad's plan, and it removes the model-override variables.
- **When a run counts.** Only when Claude Code is 2.1.280 or later and the result's `modelUsage` shows `claude-opus-5-5` did the work. Any other run is reported as invalid and never counted as found.
- **Scoring.**
  - A run finds the bug when a finding names the case's file and its scenario ID ([D74](../../docs/decisions/0074-pin-the-reviewer-and-measure-it-on-frozen-cases.md)). Paths are compared after normalizing.
  - The planted line is recorded but not scored.
  - A finding without a file, a line and an ID is flagged, and so is a closing approve, merge or ready verdict (S6.3).
- **The report.**
  - It prints the E1 lines and writes `evidence/review-eval.json`.
  - The target is met at 12 of 15 or better overall and 2 of 3 or better for every case (SC-004). Otherwise the runner exits 1.
  - The runs go one at a time, taking about 15 to 45 minutes in all, on Brad's plan.

## Spec Kit

- **Install.** `scoop install uv`, then `uv tool install specify-cli==1.2.5`.
- **In the repo.** The build runs `specify init` in place for Claude Code, with `--integration-options="--events false"` and `--script sh`, then `specify integration install codex`. T018 checks the exact flags against 1.2.5's help.
  - `--events false` keeps Spec Kit's event hooks out of `.claude/settings.json`.
  - `sh` scripts run in Git Bash on Windows and in bash on Linux, like the git hooks.
- **Before the guard.** Spec Kit runs before the guard's settings exist. The build reviews every file it writes and reverts any change to `CLAUDE.md` or `AGENTS.md` ([D25](../../docs/decisions/0025-the-working-agreements-conventions-batch.md)).
- **It can't weaken the guard.**
  - `static/settings.test.ts` pins the exact set of hooks and the deny and ask rules. If a later `specify integration upgrade` adds a hook, the unit suite fails: the Stop hook runs it now, and so will CI from slice 1.4.
  - Claude Code applies deny and ask rules whatever a hook returns.
  - An edit to `.claude/settings.json` asks Brad.
- **Overrides.** `pnpm sync` copies the two templates into `.specify/templates/overrides/` under Spec Kit's core file names, which the build checks at install. Spec Kit takes over from slice 1.4 ([D75](../../docs/decisions/0075-adopt-spec-kits-skills-with-our-templates.md)).

## Machine setup outside the repo

| When | What | Who, and why |
| --- | --- | --- |
| T010, before any hook lands | Point `bradthome.privateTerms` at Brad's list | Claude. Without it, every commit blocks (S3). |
| T010 | Point `bradthome.agentGhConfigDir` at the agent's gh config folder | Claude ([D73](../../docs/decisions/0073-keep-the-agent-on-its-own-github-account.md)). From then on, `pnpm install` writes it into each checkout's ignored local settings. |
| T010 | Put Corepack's pnpm 12.16.1 on PATH, in place of the global pnpm 9 | Claude. No admin prompt. |
| T010 | Update the `claude` command to 2.1.280 or later | Claude. The pinned model needs it. |
| T010 | Install uv and Spec Kit 1.2.5 | Claude. No admin prompt. |
| T022 | `pnpm guard:install`: copy the user guard into Brad's Claude Code folder, and add its hook and deny rules to Brad's user settings | Claude ([D73](../../docs/decisions/0073-keep-the-agent-on-its-own-github-account.md)). The pull request notes say what changed. |
| Before Gate 3 | Review the drafted term list on Brad's PC | Brad. Only Brad decides what's private ([D72](../../docs/decisions/0072-draft-the-private-term-list-from-brads-notes.md)). |
| T025 | Answer No to the C4 and C9 prompts in the real-session pass | Brad. Only a person answers a permission prompt. |

How `prepare` handles the gh login:

1. It runs `husky`, then `scripts/setup-local.ts`.
2. The script reads `bradthome.agentGhConfigDir` from the machine's git config. When the setting is missing, it exits without a word.
3. When it's set, the script checks that the folder exists and that its `hosts.yml` names bradthome-agent. Only then does it merge `GH_CONFIG_DIR` into `.claude/settings.local.json`, keeping every other key.
4. If either check fails, the script prints one line naming the problem, without the path, and leaves the file alone. `pnpm setup:check` then shows the S2 fix.

The repo names no machine path.

## Docs updates

- **`AGENTS.md`**, kept to 150 lines or fewer:
  - **Checks:** the hooks now run the secret, term, address, lock and copy checks. Until slice 1.4, the pull request still lists `gitleaks git`, `pnpm terms`, the address log, `--eol`, `diff --check`, `pnpm trace` and `pnpm setup:check`.
  - **A new Setup section:** one install and one check, the two git settings, the user guard, the Claude Code version that reviewer runs need, and running `pnpm install` in every new clone or worktree.
  - **Repo map:** `.husky/`, `scripts/`, `tests/`, `.claude/`, `.agents/` and `.specify/`.
- **`docs/working-agreement.md` and `docs/plan.md`:** "Changes since approval" entries for D72–D78, and slice 1.3's status at the end.
- **`docs/decisions/README.md`:** D78, proposed now and accepted at Gate 2.
- **`spec.md`:** the link to this plan now, and Status "Built" after the build.
- **PR #5:** Gate 2 now. Later, the lock commit, the evidence, the review, and Brad's confirmation that the term list was reviewed.

## Facts this plan rests on

Checked while planning:

- **How rules match.** Claude Code's docs say:
  - A `*` in a Bash rule can go anywhere, and `:*` works only at the end.
  - Deny and ask rules match inside compound commands, subshells and command substitutions, and past leading `VAR=` assignments.
- **Ask rules and assignments.** A headless check showed that ask rules shaped `*VAR*` and `VAR=*` catch `VAR=1 echo …`. An exact allow rule alone let the same command run.
- **Environment.** The settings `env` reaches both the Bash and the PowerShell tools.
- **A hook's "ask".** It's honored in bypass mode. In a headless check, the call was refused because nobody was there to answer.
- **The pinned agent.**
  - `claude -p --agent <name>` runs the main thread with that agent's model, tools and prompt.
  - The 2.1.272 command refuses `claude-opus-5-5`.
- **MCP tools.** Settings can't hold rules on an MCP tool's parameters; Claude Code skips them. Bare tool-name denies work.
- **Protected paths.** `.husky` and `.claude` are protected paths, but bypass mode writes them without a prompt. So C9 needs ask rules.
- **Worktrees.**
  - Desktop worktree sessions read settings and hooks from the main checkout. `${CLAUDE_PROJECT_DIR}` points there, and the hook input's `cwd` is the worktree.
  - On Windows, `settings.local.json` stays with each checkout. `.worktreeinclude` copies ignored files into worktrees that Claude Code creates.
- **Other settings behavior.**
  - `disableAllHooks: false` in project settings overrides a `true` in user settings.
  - Model order: the Agent call's `model`, then the frontmatter, then `CLAUDE_CODE_SUBAGENT_MODEL`. `_FORCE` overrides the frontmatter.
  - In `-p` runs, `ANTHROPIC_API_KEY` wins over the subscription whenever it's set.
  - Hooks run inside subagents, and settings files reload while a session runs.
- **Versions today:**
  - pnpm 12.16.1, husky 9.1.7, commitlint 21.2.4, TypeScript 7.0.2 and Vitest 5.0.5.
  - pnpm 12's built-in commands include `doctor`, which is why the setup check is `pnpm setup:check`. They don't include `sync`, `lock`, `trace`, `terms` or `review:eval`.

Still unverified, and how the plan covers each:

| Unverified | Cover |
| --- | --- |
| Where a browser tool's URL sits in a hook's input | The guard scans every string in the input, and C5 is tried in a real session |
| The bare-name deny of the desktop app's auto-merge tool | Tried in the C1 real-session check |
| What Spec Kit 1.2.5 writes | A diff at install, and a test that pins the hooks |
| gh's `hosts.yml` format | Test samples, then a real run |
| TypeScript 7 with the TypeScript Node runs, which only strips types | T001 checks it, with a fallback |
| Whether Claude Code's auto-mode safety check lets a session start `claude -p` | It refused probes in bypass mode and allowed them in default mode, which the runner uses |

## Alternatives considered

| Option | Why not |
| --- | --- |
| Lock the lock and trace tests first, build those two scripts, then write and lock the rest | Two lock rounds, part of the build running before every test is locked, and an extra session. The hand lock gives the same assurance once the script reproduces it. |
| `vitest list` for traceability | It can't load test files whose modules don't exist yet, so it can't run before the build |
| A separate tool for each check (the commitlint CLI, gitleaks's own output) | More Node start-ups against SC-003's budget, and output in formats the mocks don't use. G7 keeps commitlint's own report, through its API. |
| Settings rules alone for the guard | They can't match MCP parameters (C5) or locked tests (C6), and can't read `-n` safely (C3) |
| The guard script alone | A crashed, missing or switched-off hook lets the call through. Deny and ask rules hold in every mode, with no script. |
| The guard's own "ask" for C4 | It worked in a headless check, but bypass mode isn't documented for it. Ask rules are documented, and a check showed they see a leading `GH_CONFIG_DIR=` assignment. |
| A Stop hook that runs on any uncommitted change | It would send the agent back after a turn that changed nothing (S5.2) |
| Reading the transcript to find code changes | The transcript's format is internal to Claude Code |
| Frozen cases built on the repo's real code | That code doesn't exist when the tests are locked. Self-contained cases stay frozen. |
| Passing the reviewer to the runner as `--agents` JSON | It would test a copy, not the committed file |
| `gh auth status` for the setup check's account line | It needs the network, and gh's `hosts.yml` is local |
| Spec Kit with its event hooks on | It would add hooks to the guard's own settings file |
| Writing the gh login only from an explicit setup command | A fresh clone would then need two commands (SC-005) |
| A session-start hook that exports `GH_CONFIG_DIR` | S2's fix points at `.claude/settings.local.json`, and Claude Code's own hooks wouldn't see the variable |
| Installing the user guard on every `pnpm install` | It would rewrite Brad's user settings on every install |

## Decisions

- **New record:** [D78](../../docs/decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md), a tier-2 batch, proposed now and accepted at Gate 2:
  - A test folder for each spec, `tests/NNN/`, with `unit/`, `static/` and `integration/` inside.
  - Every ID a test covers leads its name, written literally.
  - `tests.lock` lists every file in the spec's test folder, in `sha256sum` format.
  - Checks that need a real run keep their evidence in `specs/NNN-name/evidence/`, and a locked test reads it.
  - Machine-specific values stay in the machine's global git config. `pnpm install` writes only the agent's gh login, and only on a machine that set it up.
- **Added at review (stage 7):** [D79](../../docs/decisions/0079-lock-the-review-fixes-tests-in-a-light-change-after-gate-3.md). The four review fixes get locked tests in a light change right after Gate 3.
- **Tier 3, decided here and listed in the pull request:**
  - **Output**
    - Hook output goes to stderr, and every printed line passes the term gate.
    - A file path that holds a term is a finding, reported without the path.
    - Author and committer names are scanned too.
    - When several checks fail, every block is shown. The exceptions are a commit on main and a setup failure, which stop first.
  - **Git**
    - Deleting a remote branch other than main passes.
    - Moving an existing tag counts as rewriting history. So does pushing over a remote SHA that hasn't been fetched, and the fix for that is to fetch.
    - Merge commits are recognized by `MERGE_HEAD`, and commitlint's default ignores are off.
    - When commitlint isn't installed, commit-msg blocks, like S4.
  - **The guard**
    - Setting `PRIVATE_TERMS`, or deleting or moving `.husky/_`, counts as skipping the hooks (C3).
    - A command that changes a `bradthome.*` setting, or an edit to `.claude/settings.local.json`, asks Brad first (C4).
    - `/compare/` pages count as pull request pages (C5).
    - The guard fails closed for shell, PowerShell and MCP calls when it can't read its input.
    - The project settings set `disableAllHooks: false`, so a user-level switch can't turn the guard off.
    - The user guard steps aside in sessions whose project is bradthome.
  - **The other Claude Code hooks**
    - The turn-start hook also reminds the agent to run `pnpm install` when a checkout's git hooks are off.
    - For the Stop hook, "code" is `scripts/`, `tests/`, `.claude/hooks/`, `.husky/` and the root config files.
    - The Stop hook runs Vitest's `unit` project, which holds `unit/` and `static/`.
  - **Tools**
    - TypeScript 7.0.2, the current release. T001 checks that it type-checks the TypeScript Node runs, which only strips types, and falls back to the latest 6.x if not.
    - `@types/node` stays on the 22 line.
    - Spec Kit has its event hooks off, uses `sh` scripts and the default skill invocation, and has a constitution that points at the existing docs.
  - **Messages for cases the mocks don't show** follow the mocks' style:
    - a path, subject or masked address that holds a term (G3, G4, G9, G12)
    - a moved tag or an unfetched remote (G11)
    - the setup check's other problems (S2)
    - commitlint not installed
    - the guard failing closed

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| The lock hook doesn't guard spec 001's own locked tests during this build, since the spec is new on the branch | Medium | The integrity test in the unit suite, through the Stop hook. The reviewer lists test changes since the lock commit, and any change needs Brad's OK and goes in the pull request. |
| A new worktree has no git hooks until `pnpm install`, so its commits skip every check | Medium | The turn-start reminder, the setup check, `pnpm install` in AGENTS.md's Setup, and CI from slice 1.4 |
| Text matching misses an unusual form, such as an alias, `sh -c` or a script | Medium | The rules and the parsing guard together. D73 accepts the limit, and GitHub's ruleset is the hard stop from slice 1.4. |
| An agent weakens a check in `scripts/`, which isn't on the ask list | Low | The locked tests fail, and the Stop hook runs them. The reviewer and Brad read the diff. |
| The `claude` command on PATH can't run the pinned model | High today | T010 updates it. The runner checks the version, and which model each run used. |
| Spec Kit adds hooks, or edits `CLAUDE.md` or `AGENTS.md` | Medium | Event hooks off, a review of what it writes at install, and the settings test that pins the hooks |
| The reviewer misses the target | Medium | One clear bug per case, and the prompt is tuned before the counted run. A miss is reported, not hidden. |
| The hooks run slower than SC-003 allows on Windows | Medium | One Node process per hook, one gitleaks call, and the median of 3 runs |
| A term reaches the output through a path, a subject or a gitleaks line | Low | The output gate on every line, and the SC-002 sweep test |
| Tests read Brad's real list or settings | Low | An isolated home, git config, Claude Code folder and gh folder, made-up terms only, and a test that checks the isolation |
| The install step writes a machine value into a checkout | Low | It writes only on a machine that set the value up, only to the ignored local file, and only after the folder shows bradthome-agent's login |
| Claude Code's auto-mode safety check refuses to let a session start `claude -p` | Medium | The runner uses default mode, read-only tools and no prompts. Failing that, Brad runs `pnpm review:eval` in a terminal. |
| FR-029 isn't checked on Linux before CI exists | Medium | One run in a Linux cloud session if one is available. Otherwise the pull request marks it pending until slice 1.4's first CI run. |
| gitleaks flags the tests' own fake secret | Medium | The fake secret is built at run time |
| pnpm 12 refuses a dependency's build script | Low | Each needed build is approved by name in `pnpm-workspace.yaml` |

## Tests to write and lock

Paths are under `tests/001/`.

| File | IDs in its test names |
| --- | --- |
| `unit/private-terms.test.ts` | FR-004, FR-005, FR-007, SC-002 |
| `unit/addresses.test.ts` | FR-008 |
| `unit/commit-rules.test.ts` | FR-010 |
| `unit/lock-tests.test.ts` | S3.5, FR-012 |
| `unit/trace.test.ts` | FR-013 |
| `unit/sync.test.ts` | S7.1, FR-014 |
| `unit/guard.test.ts` | C0, C1, C2, C3, C5, S2.4, S2.5, S2.6, S2.8, S2.9, FR-017, FR-019 |
| `unit/user-guard.test.ts` | C8, S2.10, FR-023 |
| `unit/stop-hook.test.ts` | C7, S5.1, S5.2, S5.3, FR-022 |
| `unit/review-eval.test.ts` | E1, S6.2, S6.3, FR-025, SC-004 |
| `static/settings.test.ts` | C4, C9, S2.7, S2.11, FR-017, FR-018, FR-021 |
| `static/reviewer.test.ts` | S6.1, S6.3, FR-024 |
| `static/skills.test.ts` | S7.4, S7.5, FR-026, FR-027 |
| `static/package.test.ts` | FR-015, FR-029 |
| `static/coverage.test.ts` | SC-001, FR-011, FR-012, FR-013 |
| `static/evidence.test.ts` | SC-004, SC-006 |
| `integration/pre-commit.test.ts` | G0–G6, S3, S4, S1.1, S1.2, S1.4, S1.6, S1.7, S1.9, S1.10, S2.1, S3.1, S3.2, S3.3, S7.2, S7.3, FR-001, FR-003, FR-005–FR-008, FR-011, FR-014, FR-016, SC-002 |
| `integration/commit-msg.test.ts` | G0, G7, G8, G9, S3, S1.3, S1.5, S1.6, S4.1–S4.5, FR-006, FR-008, FR-010, FR-016, SC-002 |
| `integration/pre-push.test.ts` | G0, G10–G13, S3, S4, S1.6, S1.7, S1.8, S1.11, S2.2, S2.3, FR-002, FR-006, FR-009, FR-016, SC-002 |
| `integration/terms-scan.test.ts` | FR-006, SC-002 |
| `integration/locked-edit.test.ts` | C6, S3.4, FR-020 |
| `integration/setup-check.test.ts` | S1, S2, S8.2, S8.3, FR-028, SC-002 |
| `integration/install.test.ts` | S8.1, FR-015, SC-005 |
| `integration/stop-hook-run.test.ts` | C7, S5.1, FR-022 |
| `integration/performance.test.ts` | SC-003 |
| `integration/suite.test.ts` | FR-011 (every locked file runs in the suite), FR-029 |

## Tasks

Tests session (stage 5):

- [ ] **T001** Set up the test harness: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `vitest.config.ts`, and the `test`, `test:unit` and `typecheck` scripts. `package.json` is ESM, sets `packageManager` to pnpm 12.16.1 with its hash, requires Node 22.23.4 or later, and pins every devDependency exactly. Install through Corepack and commit the lockfile, with no product code. (groundwork for FR-029)
- [ ] **T002** Write the helpers and fixtures. (SC-002)
  - The isolated environment: a temporary home, git config, Claude Code folder and gh folder, with `PRIVATE_TERMS` and `GH_CONFIG_DIR` cleared.
  - Scratch repos with a bare origin.
  - Made-up term lists, and a fake secret built at run time.
  - Hook-input builders, and `expectNoTerm` for both output streams.
- [ ] **T003** Write the git-hook tests: pre-commit, commit-msg, pre-push, the terms scan and performance. (S1.1–S1.11, S2.1–S2.3, S3.1–S3.3, S4.1–S4.5, S7.2, S7.3, FR-001–FR-011, FR-014, FR-016, SC-002, SC-003)
- [ ] **T004** Write the lock, trace and sync tests. (S3.5, S7.1, FR-012, FR-013, FR-014)
- [ ] **T005** Write the Claude Code tests: the guard, locked edits, the user guard, the Stop hook and the settings. (S2.4–S2.11, S3.4, S5.1–S5.3, FR-017–FR-023)
- [ ] **T006** Write the reviewer tests and frozen cases F1–F5. (S6.1–S6.3, FR-024, FR-025, SC-004)
- [ ] **T007** Write the setup tests: the setup check, install, skills, Spec Kit and the package. (S7.4, S7.5, S8.1–S8.3, FR-015, FR-026–FR-029, SC-005)
- [ ] **T008** Write the coverage and evidence tests. (SC-001, SC-004, SC-006, FR-011–FR-013)
- [ ] **T009** Confirm coverage, then lock the tests. (FR-012, FR-013, D21)
  1. Confirm coverage with the one-off listing and a fresh-context subagent.
  2. Run the suite once, to check that each test fails because a module is missing, not because of a syntax error.
  3. Write `tests.lock` by hand, commit `test(001): lock the tests for spec 001`, and push.
  4. Record the lock commit in PR #5.

Build session (stage 6):

- [ ] **T010** Machine setup, before any hook lands: both git settings, Corepack's pnpm, the `claude` update, and uv with Spec Kit. (prerequisite for FR-004, FR-018, FR-024, FR-026)
- [ ] **T011** The shared libraries: terms, addresses, git, gitleaks, messages and the output gate. (FR-003–FR-008, FR-016, SC-002)
- [ ] **T012** The lock and trace scripts. Check that they reproduce the hand-made lock and pass on spec 001. (S3.5, FR-012, FR-013)
- [ ] **T013** pre-commit. (S1.1, S1.2, S1.4, S1.6, S1.7, S1.9, S1.10, S2.1, S3.1–S3.3, S7.2, S7.3, FR-001, FR-003, FR-005–FR-008, FR-011, FR-014, FR-016)
- [ ] **T014** commit-msg, with commitlint through its API and the spec-or-issue rule. (S1.3, S1.5, S1.6, S4.1–S4.5, FR-006, FR-008, FR-010, FR-016)
- [ ] **T015** pre-push. (S1.6–S1.8, S1.11, S2.2, S2.3, FR-002, FR-006, FR-009, FR-016)
- [ ] **T016** The tracked-files scan, `pnpm terms`. (FR-006)
- [ ] **T017** husky, `prepare` and the opt-in gh-login writer, plus the changes to `.gitignore`, `.gitattributes`, `.editorconfig` and `.worktreeinclude`. (S8.1, FR-015, FR-018, SC-005)
- [ ] **T018** Spec Kit, the sync, the overrides and the constitution pointer. (S7.1, S7.3, S7.4, FR-014, FR-026)
- [ ] **T019** The seven loop skills, with license notices where adapted, synced to `.claude/skills`. (S7.5, FR-027)
- [ ] **T020** The reviewer, the review skill's wiring and `pnpm review:eval`. (S6.1–S6.3, FR-024, FR-025)
- [ ] **T021** The Claude Code settings, the guard, and the turn-start and Stop hooks. (S2.4–S2.9, S2.11, S3.4, S5.1–S5.3, FR-017–FR-022)
- [ ] **T022** The user guard and `pnpm guard:install`, installed on Brad's PC. (S2.10, FR-023)
- [ ] **T023** `pnpm setup:check`. (S8.2, S8.3, FR-028, SC-005)
- [ ] **T024** Docs: AGENTS.md, the working agreement, the slice plan, the decision log and the spec's status. (no ID)
- [ ] **T025** Evidence. (SC-001, SC-003, SC-004, SC-006, FR-029)
  - SC-003's timing on Brad's PC.
  - The 15-run frozen-case report.
  - C0–C9 tried in a real session, with Brad there for C4 and C9.
  - FR-029 on Linux.
- [ ] **T026** The full check: the tests, the type check, trace, the lock check, `pnpm setup:check` and the hand-run checks. Then push and update PR #5. (every ID)

Review session (stage 7):

- [ ] **T027** Review with the pinned reviewer through the review skill, and fix or answer each finding. Record Brad's review of the term list, then mark PR #5 ready for Gate 3.

## Open choices for Gate 2

The plan takes the first option in each. Brad can pick another at Gate 2.

1. **Spec 001's own tests before it merges.** The plan uses the integrity test and the reviewer's listing. A later change to the spec and the working agreement could compare against the lock commit instead.
2. **The check scripts in `scripts/`.** The plan leaves them off the ask list, because locked tests guard them. They could be added to C9's ask rules instead.
3. **FR-029 on Linux.** The plan checks it in a Linux cloud session if one is available. Otherwise it stays pending until slice 1.4's CI.
4. **Commits in a checkout whose hooks are off.** The plan reminds the agent. A hard block would need a new Claude Code state in the mocks.

## Preview and rollback

Nothing on the site changes, so there's no preview deploy. To undo it after merging:

1. Revert the squash commit.
2. Run `git config --unset core.hooksPath` on each machine.
3. Remove the user guard's hook entry from Brad's user settings, and delete the guard's folder.

## Approval

- Gate 2: approved by Brad on 2026-10-31 ([comment on #5](https://github.com/memorex386/bradthome/pull/5#issuecomment-6546904610)), on the committed plan. The approval also covers [D78](../../docs/decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md) and the spec's amendment, which renamed the setup check to `pnpm setup:check`.
