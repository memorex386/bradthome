# Spec 001: Hooks and agent rules

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Built |
| Slice | 1.3 Hooks and agent rules |
| Branch | `001-hooks-and-agent-rules` |
| Mocks and flows | [mocks/README.md](mocks/README.md): the flow from an edit to Brad's merge, and the message for each of 29 states |
| Plan | [plan.md](plan.md), written after Gate 1 |
| Decisions | [D72](../../docs/decisions/0072-draft-the-private-term-list-from-brads-notes.md)–[D77](../../docs/decisions/0077-the-tooling-batch-for-slice-1-3.md), from this slice's interview. It builds on [D21](../../docs/decisions/0021-lock-tests-written-from-approved-scenarios.md), [D22](../../docs/decisions/0022-enforce-hard-rules-in-three-layers.md), [D27](../../docs/decisions/0027-the-conventions-batch-for-templates-ids-and-records.md), [D43](../../docs/decisions/0043-a-separate-github-account-for-the-agent.md), [D45](../../docs/decisions/0045-a-private-term-script-plus-a-secret-scanner.md), [D47](../../docs/decisions/0047-the-repo-and-tooling-batch.md), [D54](../../docs/decisions/0054-husky-gitleaks-and-two-license-files.md) and [D71](../../docs/decisions/0071-the-conventions-batch-for-mocks-spec-numbers-and-templates.md). |

## Summary

Brad wants the repo's hard rules enforced by machines, before anything leaves the PC it was made on, rather than only written down. This slice adds git hooks that every agent and Brad go through, and Claude Code rules that keep the builder agent on its own GitHub account and away from merging. It adds a pinned, read-only reviewer that's measured on frozen cases, and the skills that run the loop. It's the first full-track slice, and it holds the repo's first code and first locked tests.

## Scope

**In:**

- pnpm, husky, commitlint, Vitest and TypeScript, set up so that `pnpm install` turns the hooks on ([D77](../../docs/decisions/0077-the-tooling-batch-for-slice-1-3.md)).
- Three git hooks: pre-commit, commit-msg and pre-push. They check for commits and pushes to main, secrets, private terms, commit addresses, locked tests, and out-of-date copies of skills and templates.
- The private-term check ([D45](../../docs/decisions/0045-a-private-term-script-plus-a-secret-scanner.md), [D72](../../docs/decisions/0072-draft-the-private-term-list-from-brads-notes.md)), the lock and traceability scripts, the sync for skills and templates, and a setup check, `pnpm setup:check`.
- Claude Code settings: deny and ask rules, a guard that runs before each tool call, a Stop hook, and a copy of the guard for Brad's user settings ([D73](../../docs/decisions/0073-keep-the-agent-on-its-own-github-account.md)).
- The reviewer subagent, pinned to one model, with five frozen cases and a runner ([D74](../../docs/decisions/0074-pin-the-reviewer-and-measure-it-on-frozen-cases.md)).
- Spec Kit for Claude Code and Codex, with this repo's templates as its overrides ([D75](../../docs/decisions/0075-adopt-spec-kits-skills-with-our-templates.md)).
- The repo's own skills: interview, decision-page, record-decision, lock-tests, review, open-pr and retro ([D76](../../docs/decisions/0076-the-loop-skills-ship-in-slice-1-3.md)).
- Docs: the Checks and Setup sections of AGENTS.md, the changes since approval in the working agreement and the plan, and records D72–D77.
- On Brad's PC, outside the repo: the private-term list, drafted for Brad's review, and the git setting that points to it; gh's login for Claude Code in this repo; and the guard in Brad's user settings.

**Out:**

- CI, required checks, the ruleset on main, Dependabot and CodeQL go in slice 1.4. Rulesets on a private repo need GitHub Pro, which Brad decides before 1.4 starts.
- The leak scan of the whole history and the switch to public go in slice 1.5.
- ESLint and Prettier come with slice 2.1. So does the private-term scan of the built site, once there is one.
- The show-it skill, and whether to publish Brad's own skills, come with slice 2.1 ([D76](../../docs/decisions/0076-the-loop-skills-ship-in-slice-1-3.md)).
- Hook files for Codex and Cursor ([D77](../../docs/decisions/0077-the-tooling-batch-for-slice-1-3.md)).

## User stories and acceptance scenarios

The IDs in brackets, such as (G3), are the states in [mocks/README.md](mocks/README.md). Each one shows the exact message.

### Story 1: Nothing private or secret leaves Brad's PC (P1)

Git history is permanent and the repo will be public, so Brad's privacy rules have no exceptions. Every commit and push from Brad's PC is checked for secrets, private terms and personal addresses before it can leave, whoever makes it.

**Why this priority:** a leak can't be taken back once it's pushed. Nothing else in this slice matters if this fails.

**Independent test:** in a scratch repo with a list of made-up terms, commit and push each kind of leak, and see each one blocked with its message. A clean change passes.

- **S1.1** Given a staged change that gitleaks reports as a secret, when anyone commits, then the commit is blocked, and the message names the file, line and rule, with the value redacted (G2).
- **S1.2** Given a staged line that holds a term from the private list, in any letter case, when anyone commits, then the commit is blocked, and the message names the file and line but not the term (G3).
- **S1.3** Given a commit message that holds a private term, when the commit is made, then it's blocked, and the message names the line but not the term (G8).
- **S1.4** Given an author or committer address that isn't a GitHub noreply address or brad@bradthome.com, when anyone commits, then the commit is blocked, and the message shows the address masked (G4).
- **S1.5** Given a trailer, such as Co-authored-by, whose address isn't allowed, when the commit is made, then it's blocked (G9).
- **S1.6** Given the private-term list is missing, can't be read or is empty, when anyone commits or pushes, then it's blocked, with the setup step (S3).
- **S1.7** Given gitleaks isn't installed, when anyone commits or pushes, then it's blocked, with the install steps (S4).
- **S1.8** Given commits made with the hooks skipped, holding a secret, a private term or an address that isn't allowed, when they're pushed, then nothing is pushed, and the message lists each failing commit (G12).
- **S1.9** Given a term that appears only inside a longer word, when anyone commits, then the commit passes (G0).
- **S1.10** Given a list entry marked as digits, when a staged line holds those digits with spaces, dots, dashes, brackets or a plus sign between them, then the commit is blocked (G3).
- **S1.11** Given a branch or tag whose name holds a private term, when it's pushed, then the push is blocked, and the message doesn't show the name (G13).

### Story 2: Main changes only through Brad's merge (P1)

Brad merges every pull request (Gate 3). Nothing on GitHub enforces that until slice 1.4, so the local rules carry it, and here the agent works only as its own GitHub account ([D73](../../docs/decisions/0073-keep-the-agent-on-its-own-github-account.md)).

**Why this priority:** a merge or a push to main can't be quietly undone, and Gate 3 is Brad's control.

**Independent test:** in a Claude Code session started in the repo, try each merge and approve route, a hook bypass, a switch to Brad's login and a browser visit to a pull request. In git, try a commit on main, a push to main and a force push.

- **S2.1** Given main is checked out, when anyone commits, then it's blocked, and the staged changes stay staged (G1).
- **S2.2** Given a push whose target is main, when anyone pushes, then it's blocked (G10).
- **S2.3** Given a push that would drop commits the remote branch already has, when anyone pushes, then it's blocked (G11).
- **S2.4** Given a Claude Code session started in the repo, when the agent tries to merge a pull request through gh, the REST API, a GraphQL merge or auto-merge mutation, or the desktop app's auto-merge tool, then Claude Code denies it with the merge message (C1).
- **S2.5** Given that session, when the agent tries to approve a pull request, then Claude Code denies it (C2).
- **S2.6** Given that session, when the agent runs a git command that skips the hooks, with `--no-verify`, `-n`, `HUSKY=0` or a different hooks path, then Claude Code denies it (C3).
- **S2.7** Given that session, in any permission mode, when the agent runs a command that would act as Brad's GitHub account, by switching gh's login, config folder or token, then it runs without stopping for Brad, and the guard logs it on Brad's PC, outside the repo, with any token's value hidden, and shows a notice in the session (C4, [D90](../../docs/decisions/0090-log-the-agents-use-of-brads-login-instead-of-asking.md)).
- **S2.8** Given that session, when the agent runs gh with no override, then gh acts as bradthome-agent (C0).
- **S2.9** Given that session, when the agent opens one of the repo's pull request or settings pages with a browser tool, then Claude Code denies it (C5).
- **S2.10** Given a Claude Code session started in another folder on Brad's PC, when it tries to merge or approve a bradthome pull request, then the guard in Brad's user settings denies it, and the same command for another repo isn't affected (C8).
- **S2.11** Given a Claude Code session in the repo, when the agent edits the guard's own files (`.claude/settings.json`, `.claude/hooks/` or `.husky/`), then Claude Code asks Brad first (C9).

### Story 3: Locked tests stay locked (P1)

Tests written from approved scenarios are locked, and they change only with their spec, which Brad approves ([D21](../../docs/decisions/0021-lock-tests-written-from-approved-scenarios.md)).

**Why this priority:** locked tests keep Brad's approved scenarios true while agents build.

**Independent test:** lock a test in a scratch spec, then change it with and without a change to the spec on the branch, both by commit and by a Claude Code edit.

- **S3.1** Given a test file listed in a spec's `tests.lock`, when a commit changes it and the branch doesn't change that spec's `spec.md` compared with main, then the commit is blocked (G5).
- **S3.2** Given the branch also changes that spec's `spec.md`, when a commit changes the locked test, then it passes (G0).
- **S3.3** Given a change to a `tests.lock`, with no change to its spec on the branch, when anyone commits, then it's blocked (G5).
- **S3.4** Given a Claude Code session in the repo, when the agent edits a locked test and the branch doesn't change its spec, then Claude Code denies the edit before it happens (C6).
- **S3.5** Given a spec's test files, when the lock script runs twice with no change in between, then it writes the same `tests.lock` both times, listing each file's SHA-256 and path in path order.

### Story 4: Every commit names its spec or issue (P2)

**Why this priority:** it keeps every change traceable to an approved spec or issue, but a bad message is easy to fix.

**Independent test:** commit messages of each shape in a scratch repo.

- **S4.1** Given a message that isn't a Conventional Commit, when anyone commits, then it's blocked, with commitlint's report (G7).
- **S4.2** Given `feat(001): add the setup check`, when anyone commits, then it passes (G0).
- **S4.3** Given `fix(repo): handle empty lists` with a `Refs: #12` line, when anyone commits, then it passes (G0).
- **S4.4** Given `docs(repo): fix a typo` with no `Refs:` line, when anyone commits, then it's blocked, and the report names the spec-or-issue rule (G7).
- **S4.5** Given a merge commit that git writes, when it's made, then the format rule skips it, and the term and address checks still run.

### Story 5: The agent checks its work before it says it's done (P2)

**Why this priority:** it catches broken work before Brad sees it. The tests and the reviewer would catch it later anyway.

**Independent test:** end a Claude Code turn with a failing test, then with passing checks.

- **S5.1** Given the agent changed code in the turn, and the type check or unit tests fail, when it tries to end the turn, then the Stop hook sends it back with the failures (C7).
- **S5.2** Given the checks pass, or no code changed, when the agent ends the turn, then the Stop hook lets it finish.
- **S5.3** Given the Stop hook already sent the agent back, when the checks still fail, then the hook keeps sending it back only until Claude Code's limit, so the turn can't loop forever.

### Story 6: A pinned reviewer, measured on frozen cases (P2)

**Why this priority:** the working agreement asks it of every check that can't give the same verdict every time. The reviewer advises and is never a required check.

**Independent test:** read the reviewer's definition, then run the frozen cases.

- **S6.1** Given the reviewer's definition, then it names `claude-opus-5-5` as its model and gives it only read-only tools (Read, Grep and Glob), and the review skill never passes a model when it starts the reviewer.
- **S6.2** Given five frozen cases, when the runner runs each one three times, then it reports each case's score, the overall pass rate and whether the target was met (E1).
- **S6.3** Given a review, then each finding names its file, its line and the S, FR or SC ID it affects, and the review ends with no approve, merge or ready verdict.

### Story 7: Every agent loads the same skills and templates (P2)

**Why this priority:** Claude Code reads only `.claude/skills`, while Codex, Cursor and Copilot read `.agents/skills`. Copies that drift give agents different instructions.

**Independent test:** run the sync, change a copy, and commit.

- **S7.1** Given a skill in `.agents/skills`, when the sync runs, then `.claude/skills` holds an identical copy, stale copies are removed, and Spec Kit's `speckit-*` folders aren't touched.
- **S7.2** Given a skill copy that differs from its source, when anyone commits, then it's blocked (G6).
- **S7.3** Given `docs/templates/spec.md` or `plan.md` differs from its copy in Spec Kit's override folder, when anyone commits, then it's blocked, and the sync makes them identical (G6).
- **S7.4** Given the repo, then Spec Kit's skills are installed for Claude Code in `.claude/skills` and for Codex in `.agents/skills`.
- **S7.5** Given the repo, then `.agents/skills` holds interview, decision-page, record-decision, lock-tests, review, open-pr and retro, and each skill adapted from a public one carries its copyright notice and license.

### Story 8: A machine's setup is one install and one check (P3)

**Why this priority:** it matters once per machine, but a silent gap in setup would switch a check off.

**Independent test:** a fresh clone, on a machine set up and on one that isn't.

- **S8.1** Given a fresh clone, when `pnpm install` runs, then the git hooks are on.
- **S8.2** Given a machine that's set up, when `pnpm setup:check` runs, then every line passes, and it prints the number of terms, never a term (S1).
- **S8.3** Given a machine missing part of its setup, when `pnpm setup:check` runs, then it lists each problem with its fix (S2).

## Edge cases

- **A term split across two lines** isn't caught, since terms match line by line, so the list keeps phrases short. Covered by FR-005.
- **Binary files** aren't scanned for terms. The built site's text is scanned once there's a site. Covered by FR-006.
- **A real word on the list** blocks ordinary commits. The fix is a better term in the private list, never an allowlist in the repo, which would reveal the term. Covered by S1.2's message.
- **A new branch's first push** has nothing on the remote to compare with, so pre-push checks every commit the remote doesn't have yet. Covered by S1.8 and frozen case F2.
- **Rebased and amended commits** skip pre-commit and commit-msg, but pre-push checks them. Covered by S1.8.
- **A commit made on GitHub's website** skips every local hook. CI covers it from slice 1.4.
- **Codex and Cursor** skip Claude Code's rules but not the git hooks ([D77](../../docs/decisions/0077-the-tooling-batch-for-slice-1-3.md)). Covered by Story 1 and S2.1–S2.3.
- **A worktree** loads the committed Claude Code settings, but gh's login for the repo comes from each machine's local settings. Covered by S2.8 and S8.2.
- **A detached HEAD:** a commit there isn't blocked by S2.1, but pushing it to main is. Covered by S2.2.
- **Merge commits** that git writes skip the format rule, but not the term and address checks. Covered by S4.5.
- **No code changed in a turn:** the Stop hook lets it end. Covered by S5.2.
- **An agent editing the guard** to switch it off: edits to the guard's own files ask Brad first. Covered by S2.11.
- **Pushing tags:** a tag carries no new commits to check, and its name is checked for terms like a branch name. Covered by S1.11.

## Functional requirements

- **FR-001** The pre-commit hook MUST block a commit while main is checked out, and leave the staged changes staged.
- **FR-002** The pre-push hook MUST block a push whose target is main, and a push that would drop commits the remote branch already has.
- **FR-003** The pre-commit hook MUST run gitleaks on the staged changes and block on any finding, reporting the file, line and rule with the value redacted.
- **FR-004** The private-term check MUST read its terms from a file outside the repo, found through the git setting `bradthome.privateTerms`, or from the `PRIVATE_TERMS` environment variable where that's set, as it will be in CI. It MUST never print a term.
- **FR-005** Terms MUST match whole words, ignoring letter case, line by line. An entry marked `digits:` MUST match its digits with any spaces, dots, dashes, brackets or plus signs between them.
- **FR-006** The private-term check MUST cover the staged changes at pre-commit, and the commit message at commit-msg. At pre-push it MUST cover each outgoing commit's changes and message, and the branch and tag names. It MUST also be able to scan all tracked text files on request. It skips binary files.
- **FR-007** Every check MUST fail closed. A missing, unreadable or empty term list, or a missing gitleaks, blocks the commit or push, with the steps to fix it.
- **FR-008** A commit's author and committer MUST use a GitHub noreply address or brad@bradthome.com. Every address in its trailers MUST be one of those or noreply@anthropic.com. A reported address MUST be masked.
- **FR-009** The pre-push hook MUST re-run the secret, private-term and address checks on every commit the remote doesn't have, and block the whole push if any fails, listing each failing commit.
- **FR-010** The commit-msg hook MUST enforce Conventional Commits, with either a three-digit spec number as the scope or a `Refs: #N` trailer. Merge commits that git writes skip only this rule.
- **FR-011** The pre-commit hook MUST block a change to a locked test file, or to a `tests.lock`, unless the branch also changes that spec's `spec.md` compared with main.
- **FR-012** A lock script MUST write a spec's `tests.lock`, with one line per test file giving its SHA-256 and path, in path order, so the same files always produce the same file.
- **FR-013** A traceability script MUST list every S, FR and SC ID in a spec, report each ID that no test name mentions, and exit with an error when any is missing.
- **FR-014** A sync script MUST copy each skill in `.agents/skills` to `.claude/skills`, and copy `docs/templates/spec.md` and `plan.md` to Spec Kit's override folder. It MUST remove stale copies, and leave Spec Kit's own `speckit-*` skills alone. The pre-commit hook MUST block when any copy differs from its source.
- **FR-015** `pnpm install` MUST turn the git hooks on.
- **FR-016** Each passing hook MUST print one line naming what it checked. Each block MUST say what was blocked, where, why and how to fix it, in the words the mocks show.
- **FR-017** The repo's Claude Code settings MUST deny merging, approving and enabling auto-merge on pull requests, through gh, the REST and GraphQL APIs and the desktop app's auto-merge tool. They MUST also deny git commands that skip the hooks.
- **FR-018** In this repo, gh in Claude Code MUST act as bradthome-agent by default. A command that switches gh's login, config folder or token MUST be logged by the guard, with any token's value hidden, and announced in the session, in every permission mode. It doesn't stop for Brad's approval ([D90](../../docs/decisions/0090-log-the-agents-use-of-brads-login-instead-of-asking.md)).
- **FR-019** Claude Code MUST deny browser tools opening the repo's pull request and settings pages on GitHub.
- **FR-020** Claude Code MUST deny an edit to a locked test file unless the branch already changes its spec.
- **FR-021** Claude Code MUST ask Brad before editing the guard's own files: `.claude/settings.json`, `.claude/hooks/` and `.husky/`.
- **FR-022** A Stop hook MUST run the type check and unit tests when the turn changed code, and send the agent back with the failures until they pass or Claude Code's limit is reached.
- **FR-023** A guard in Brad's user settings MUST deny merging and approving bradthome pull requests in Claude Code sessions started in other folders. It MUST NOT affect other repositories.
- **FR-024** The reviewer subagent MUST be pinned to `claude-opus-5-5` and use only read-only tools. It MUST report each finding by file, line and spec ID, and never give an approve, merge or ready verdict.
- **FR-025** A runner MUST run five frozen cases against the reviewer, three times each, and report each case's score, the overall pass rate and whether the target was met. Each case is a diff with one planted bug drawn from this slice's risks.
- **FR-026** Spec Kit MUST be installed for Claude Code and Codex, with `docs/templates/spec.md` and `plan.md` as its project overrides.
- **FR-027** `.agents/skills` MUST hold interview, decision-page, record-decision, lock-tests, review, open-pr and retro. A skill adapted from a public one MUST keep its copyright notice and license.
- **FR-028** `pnpm setup:check` MUST report each part of the setup, with a fix for each problem: the hooks, the term list and its size, gitleaks's version, gh's account for Claude Code here, the user-level guard and the copies. It MUST never print a term.
- **FR-029** The checks MUST run on Windows, with Git for Windows, and on Linux.

## Success criteria

- **SC-001** Each of the 29 states in the mocks is reproduced by a test, or for Claude Code's prompts and tools, by a recorded check in the pull request. A clean change passes every hook.
- **SC-002** No check output ever contains a private term. Every test that blocks a test term asserts the term is absent from both output streams.
- **SC-003** On Brad's PC, the commit hooks add under 3 seconds to a commit of up to 50 changed files, and pre-push takes under 10 seconds for up to 50 new commits.
- **SC-004** The reviewer finds the planted bug in at least 12 of 15 runs, and in at least 2 of 3 runs for every case.
- **SC-005** On a machine that's set up, a fresh clone needs one command, `pnpm install`, and `pnpm setup:check` then passes.
- **SC-006** Each Claude Code state from C0 to C9 is tried once in a real session, and its result is recorded in the pull request.

## Mocks and flows

[mocks/README.md](mocks/README.md) shows the flow from an edit to Brad's merge, and the message for each of 29 states, in the order they're expected to come up:

- **Git hooks:** a clean commit and push (G0), and the thirteen blocks (G1–G13).
- **Setup:** the setup check passing and failing (S1, S2), and the two fail-closed blocks (S3, S4).
- **Claude Code:** normal gh use (C0), the denials (C1–C3, C5, C6, C8), the log and notice when Brad's login is used (C4), the prompt before the guard is edited (C9), and the Stop hook (C7).
- **Reviewer:** the frozen-case report (E1).

Every file name, address, hash and number in them is a made-up example. A private term is never shown.

## Key entities

- **Private-term list:** a plain text file outside the repo, with one entry per line. A line starting with `#` is a comment, and `digits:` marks a number to match in any format.
- **`tests.lock`:** one per spec, with one line per locked test file, giving its SHA-256 and its path.
- **Frozen case:** a diff with one planted bug, the spec it breaks, the bug's file and line, and the scenario it violates.
- **Skill:** a folder with a `SKILL.md`, in the Agent Skills format. Its source is in `.agents/skills`.

## Assumptions

- Brad's PC is the only machine that commits for now. Another machine would run the same setup and `pnpm setup:check`.
- Git for Windows runs the hooks with its own shell.
- Claude Code is 2.1.272 or later. Its documentation says deny rules hold in bypass mode and ask rules still prompt there. A hook's own "ask" answer isn't documented for bypass mode, so FR-021 uses ask rules. Since D90, FR-018 uses no rule: the guard logs the call and lets Claude Code decide.
- Claude Code doesn't document where a browser tool's URL appears in a hook's input. FR-019 is confirmed in a real session (SC-006).
- The frozen-case runner uses Claude Code's headless mode, on Brad's Claude plan, not a paid API key ([D74](../../docs/decisions/0074-pin-the-reviewer-and-measure-it-on-frozen-cases.md)).
- pnpm 12 comes through Corepack, on Node 22.23.4.

## Open questions

None.

## Decisions made while writing this spec

- **Tier 1:** [D72](../../docs/decisions/0072-draft-the-private-term-list-from-brads-notes.md) (what goes on the private-term list), [D73](../../docs/decisions/0073-keep-the-agent-on-its-own-github-account.md) (the agent's GitHub account and how far the guard goes), [D74](../../docs/decisions/0074-pin-the-reviewer-and-measure-it-on-frozen-cases.md) (the pinned reviewer and frozen cases), [D75](../../docs/decisions/0075-adopt-spec-kits-skills-with-our-templates.md) (Spec Kit's skills) and [D76](../../docs/decisions/0076-the-loop-skills-ship-in-slice-1-3.md) (the repo's own skills).
- **Tier 2:** [D77](../../docs/decisions/0077-the-tooling-batch-for-slice-1-3.md), the tooling batch.
- **Tier 3:**
  - Each passing hook prints one line, so it's clear the hooks ran.
  - The list is found through a global git setting, the way git-secrets finds its pattern files. CI reads the `PRIVATE_TERMS` variable instead.
  - Reported addresses keep their first two letters and their domain.
  - The frozen cases pass at 12 of 15 runs overall and 2 of 3 for every case.
  - Pushes that rewrite history are blocked for everyone, not just agents. Main comes into a branch by merge.
  - The setup check is `pnpm setup:check`. It can't be `pnpm doctor`, which is a pnpm command that runs instead of a script with the same name.
  - The term check also covers branch and tag names at pre-push.
  - Edits to the guard's own files ask Brad first, so an agent can't switch a guard off by editing it.
  - The plan, build and review run in fresh sessions started in this repo's folder, because Claude Code loads a repo's settings only there.

## Traceability

Every S, FR and SC ID above appears in at least one test's name. This slice builds the traceability check, and slice 1.4 runs it in CI.

## Approval

- Gate 1: approved by Brad on 2026-10-31 ([comment on #5](https://github.com/memorex386/bradthome/pull/5#issuecomment-6543807397))
- Amended on 2026-10-31, before Gate 2: the setup check is `pnpm setup:check`, not `pnpm doctor`. Planning found that `pnpm doctor` is a pnpm command, which runs instead of a script with the same name. This changes the scope, S4.2's example, S8.2, S8.3, FR-028, SC-005, an assumption, a tier-3 note and mock states S1 and S2. Brad approved the amendment with Gate 2 ([comment on #5](https://github.com/memorex386/bradthome/pull/5#issuecomment-6546904610)).
- Amended on 2026-11-02, after slice 1.3 merged: Brad overrode the prompt before the agent uses Brad's GitHub login ([D90](../../docs/decisions/0090-log-the-agents-use-of-brads-login-instead-of-asking.md)). The guard now logs each such command and shows a notice instead. This changes S2.7, FR-018, an assumption, the C4 mock state and evidence, and the locked tests for C4, which were re-locked. Brad approves the amendment at Gate 3 ([#10](https://github.com/memorex386/bradthome/issues/10)).
