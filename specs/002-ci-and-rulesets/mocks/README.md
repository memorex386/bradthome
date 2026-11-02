# Spec 002 mocks: what the checks on GitHub say

"Show it" for [spec 002](../spec.md). Each state shows what a pull request's checks or the ruleset check print, and the spec's scenarios name these IDs. Brad approves them with the spec at Gate 1.

- The states are ordered by how often they're expected, most common first. These are estimates.
- File names, addresses, hashes, numbers and times are made-up examples. A private term is never shown, here or by the checks.
- The check names and the job log lines are the repo's. The boxes around them, such as the merge box, are GitHub's own, and their wording is paraphrased from what GitHub shows today.
- M2 is a preview of slice 1.5, after the repo goes public and the ruleset is applied ([D80](../../../docs/decisions/0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md)).

## From a push to Brad's merge

Slice 1.3 built the first two layers, the git hooks and Claude Code's rules. This slice adds the third: checks on GitHub that run for every pull request, whoever opened it.

1. **Someone pushes a branch and opens a pull request** (anyone). The git hooks already ran on their PC, if it has them. CI runs anyway. States: [K0](#k0).
2. **CI runs every job** (GitHub Actions). Types, the tests on Ubuntu and Windows, traceability, locked tests, the private-term and address scan, the secret scan, commit messages and the repo's hygiene. No job is skipped because of which files changed. States: [K2](#k2), [K3](#k3), [K4](#k4), [K5](#k5), [K6](#k6), [K7](#k7), [K8](#k8), [K9](#k9), [K10](#k10).
3. **The gate reports one verdict** (GitHub Actions). It passes only when every CI job passed. The ruleset will require it, and the lock check beside it. States: [K0](#k0), [K1](#k1).
4. **Dependabot opens its weekly pull requests** (Dependabot). One for the packages and one for the Actions. They go through the same checks and are never merged automatically. States: [D1](#d1).
5. **The ruleset check compares the ruleset file with GitHub** (the ruleset check). Until the repo is public, GitHub won't serve rulesets, so the check reports the file as ready and the live ruleset as pending. States: [R1](#r1), [R2](#r2).
6. **Brad reviews and merges** (Brad). Gate 3. Until slice 1.5, GitHub shows the checks but doesn't block the merge, and the local rules stop an agent from merging. From slice 1.5, GitHub blocks the merge until the gate passes and Brad approves. States: [M1](#m1), [M2](#m2).

## Every state

17 states.

| ID | State | Where | Result | How often | Scenarios |
| --- | --- | --- | --- | --- | --- |
| [K0](#k0) | Every check passes | CI | Passes | Almost every push, about 9 in 10. | S1.1, S1.4 |
| [M1](#m1) | The merge box until slice 1.5 | GitHub | Shown | Every pull request until slice 1.5. | S1.1 |
| [K1](#k1) | The gate fails, naming the job | CI | Blocked | About 1 push in 10. | S1.2, S1.5 |
| [K2](#k2) | Types or tests fail, on Ubuntu or Windows | CI | Blocked | Most of K1. | S1.3 |
| [K7](#k7) | A commit message doesn't follow the convention | CI | Blocked | Rare: the commit-msg hook catches it first. | S3.1 |
| [D1](#d1) | Dependabot's weekly pull requests | Dependabot | Passes | Twice a week at most. | S4.1, S4.2, S4.3, S3.2, S2.5 |
| [R1](#r1) | The ruleset file is ready, and the live ruleset is pending | Ruleset check | Passes | Whenever the ruleset file changes, until slice 1.5. | S5.1, S5.2, S5.4 |
| [K10](#k10) | Line endings, whitespace or copies out of order | CI | Blocked | Rare. | S3.5 |
| [K9](#k9) | An ID with no test | CI | Blocked | About once a slice, before the tests are written. | S3.4 |
| [K8](#k8) | A locked test changed without its spec | CI | Blocked | Only when a spec changes after its tests are locked. | S3.3 |
| [K6](#k6) | The private-term list can't be read | CI | Blocked | Once, if a secret is missing or emptied. | S2.4 |
| [K3](#k3) | A private term in the pull request | CI | Blocked | Rare. Each one is a leak stopped. | S2.1 |
| [K4](#k4) | An address that isn't allowed | CI | Blocked | Rare. | S2.2 |
| [K5](#k5) | A possible secret | CI | Blocked | Rare. | S2.3 |
| [R2](#r2) | The live ruleset differs from the file | Ruleset check | Blocked | Should be never. | S5.3 |
| [S1](#s1) | The repo's settings are checked | Setup | Passes | Once per machine, and whenever something seems off. | S6.1 |
| [M2](#m2) | The merge box from slice 1.5 | GitHub | Blocked until approved | Every pull request from slice 1.5. | Slice 1.5 |

## The messages

Each failing job says what failed, where and how to fix it, in the same shape as the git hooks. A passing job prints one line.

<a id="k0"></a>

### K0: Every check passes

CI · **Passes** · the pull request's checks

- **When:** A push with nothing to block.
- **How often:** Almost every push, about 9 in 10.
- **Enforces:** Every hard rule · scenarios S1.1, S1.4

```text
All checks have passed                                   10 successful checks
  ✓ ci / types                         28s
  ✓ ci / tests (ubuntu-24.04)          1m 52s
  ✓ ci / tests (windows-2025)          3m 40s
  ✓ ci / trace                         14s
  ✓ ci / privacy                       22s
  ✓ ci / secrets                       11s
  ✓ ci / commits                       16s
  ✓ ci / hygiene                       19s
  ✓ locked-tests / lock                17s   (main's copy of the check)
  ✓ ci / gate                          3s    every ci job passed
```

The gate and the lock check are the two checks the ruleset will require. The lock check runs in its own workflow, from main's copy, so the gate can't see it. The others are listed so a failure is easy to find.

<a id="m1"></a>

### M1: The merge box until slice 1.5

GitHub · **Shown** · the pull request's page, as Brad sees it

- **When:** Any open pull request while the repo is private.
- **How often:** Every pull request until slice 1.5.
- **Enforces:** D73, D80 · scenarios S1.1

```text
✓ All checks have passed
  10 successful checks

  This branch has no conflicts with the base branch.

  [ Squash and merge ]
```

GitHub doesn't block the merge yet, so Brad checks the gate before pressing merge. Claude Code's rules still stop an agent from merging (spec 001, C1). Only squash merging is offered (S6.1).

<a id="k1"></a>

### K1: The gate fails, naming the job

CI · **Blocked** · ci / gate

- **When:** Any job failed, was cancelled or didn't run.
- **How often:** About 1 push in 10.
- **Enforces:** D49 · scenarios S1.2, S1.5

```text
✖ gate  2 of 8 jobs didn't pass
  tests (windows-2025)  failure
  privacy               failure
  The gate passes only when every job passes.
  Fix: open each job above for its message.
```

A job that was skipped or cancelled fails the gate too, so a missing check never reads as a pass.

<a id="k2"></a>

### K2: Types or tests fail, on Ubuntu or Windows

CI · **Blocked** · ci / types, ci / tests

- **When:** The type check or a test fails on either runner.
- **How often:** Most of K1.
- **Enforces:** D55 · scenarios S1.3

```text
✖ tests (windows-2025)  1 failed, 334 passed
  tests/001/integration/install.test.ts
    FR-015 pnpm install turns the hooks on
    expected '.husky/_' to be the hooks path
  Fix: pnpm test on your machine, or read the log above. It passed on ubuntu-24.04.
```

The same tests run on both systems. The Stop hook runs them on Brad's PC first, so this is mostly what differs between Windows and Linux.

<a id="k7"></a>

### K7: A commit message doesn't follow the convention

CI · **Blocked** · ci / commits

- **When:** The pull request's title, which becomes the squash commit on main, or a commit on the branch isn't a Conventional Commit, or names no spec or issue.
- **How often:** Rare: the commit-msg hook catches commits first, and the open-pr skill writes the title.
- **Enforces:** A spec or issue on every commit · scenarios S3.1

```text
✖ commits  the title and 1 of 4 commits fail the message rules
  title    Update hooks
    ✖ type may not be empty [type-empty]
  a1b2c3d  update hooks
    ✖ type may not be empty [type-empty]
    ✖ name the spec, as in feat(001): …, or add a Refs: #N line [spec-or-issue]
  Fix: edit the title. Pushes never rewrite history, so for a commit, move the work to a new branch with the message fixed.
```

The rules are the same commitlint config the commit-msg hook uses. For the title, the spec-or-issue rule passes when its scope is a spec number, or when the pull request links its issue with a `Refs: #N` line, as light changes do.

<a id="d1"></a>

### D1: Dependabot's weekly pull requests

Dependabot · **Passes** · the pull request list

- **When:** The weekly run finds new versions that are at least 3 days old.
- **How often:** Twice a week at most.
- **Enforces:** D47, D81 · scenarios S4.1, S4.2, S4.3, S3.2, S2.5

```text
build(deps-dev): bump the dev-dependencies group with 3 updates   #14
  dependabot opened · Labels: dependencies
  ✓ All checks have passed

build(deps): bump the actions group with 2 updates                #15
  dependabot opened · Labels: dependencies, github-actions
  ✓ All checks have passed
```

One pull request per group. Dependabot's commits are exempt from the spec-or-issue rule but not from the format, term, address or secret checks. Nothing merges them but Brad.

<a id="r1"></a>

### R1: The ruleset file is ready, and the live ruleset is pending

Ruleset check · **Passes** · pnpm ruleset:check

- **When:** The ruleset file holds every rule, and GitHub won't serve rulesets for this repo yet.
- **How often:** Whenever the ruleset file changes, until slice 1.5.
- **Enforces:** D47, D80, D81 · scenarios S5.1, S5.2, S5.4

```text
$ pnpm ruleset:check
✓ ruleset file  .github/rulesets/main.json has every rule
    pull requests only · squash merges · linear history · signed commits
    the gate and the lock check passing · 1 approval from a code owner · stale approvals dismissed · no force pushes or deletions · no bypass
✓ code owners  .github/CODEOWNERS names Brad for every path
… live ruleset  pending: GitHub serves rulesets for this repo once it's public (slice 1.5)
Ready for slice 1.5.
```

"Pending" isn't a failure while the repo is private. In slice 1.5 the same check confirms the live ruleset matches the file.

<a id="k10"></a>

### K10: Line endings, whitespace or copies out of order

CI · **Blocked** · ci / hygiene

- **When:** A file has CRLF line endings, a whitespace error, or a skill copy or template override that doesn't match its source.
- **How often:** Rare.
- **Enforces:** D49, D47 · scenarios S3.5

```text
✖ hygiene  2 problems
  docs/notes.md        CRLF line endings
  .claude/skills/interview/SKILL.md doesn't match .agents/skills/interview/SKILL.md
  Fix: pnpm sync, and check .gitattributes is respected, then push again.
```

<a id="k9"></a>

### K9: An ID with no test

CI · **Blocked** · ci / trace

- **When:** A scenario, requirement or success criterion in a spec with locked tests leads no test name.
- **How often:** About once a slice, before the tests are written.
- **Enforces:** Every requirement ID has a test · scenarios S3.4

```text
✖ trace  2 of the 41 IDs in specs/002-ci-and-rulesets/spec.md lead no test name
  S4.2  FR-012
  Fix: add a test named with each ID, as the working agreement asks.
```

A spec whose tests aren't locked yet, such as one at Gate 1, is listed as not traced yet but doesn't fail the gate, the same rule AGENTS.md's hand-run checks follow today.

<a id="k8"></a>

### K8: A locked test changed without its spec

CI · **Blocked** · locked-tests / lock

- **When:** The pull request changes a locked test or a tests.lock, and not that spec's spec.md.
- **How often:** Only when a spec changes after its tests are locked.
- **Enforces:** Locked tests stay locked (D21, D49) · scenarios S3.3

```text
✖ lock  locked test changed
  tests/001/unit/terms.test.ts is locked by spec 001.
  A locked test changes only with its spec, and Brad approves both.
  This check runs from main's copy, so changes to it in this pull request don't apply.
  Fix: undo the test change, or change specs/001-hooks-and-agent-rules/spec.md on this branch.
```

<a id="k6"></a>

### K6: The private-term list can't be read

CI · **Blocked** · ci / privacy

- **When:** The secret that holds the list is missing or empty for this run, as on a pull request from a fork.
- **How often:** Once, if a secret is missing or emptied.
- **Enforces:** No secrets or private terms (D27, D45) · scenarios S2.4

```text
✖ privacy  private-term list not found
  This check reads Brad's private list from the PRIVATE_TERMS secret, which never enters the repo.
  The check fails until it's found, so nothing private slips through.
  Fix: ask Brad to set PRIVATE_TERMS for Actions and for Dependabot.
```

<a id="k3"></a>

### K3: A private term in the pull request

CI · **Blocked** · ci / privacy

- **When:** A changed line, a commit message, the branch name, or the pull request's title or description holds a term from the list.
- **How often:** Rare. Each one is a leak stopped.
- **Enforces:** No secrets or private terms (D45) · scenarios S2.1

```text
✖ privacy  private term
  docs/notes.md:22
  commit e4f5a6b, message line 3
  A term on Brad's private list is in this pull request. The term isn't shown.
  Fix: remove or reword it in a new commit. If it reached a commit message, tell Brad before merging.
```

The log is public once the repo is, so it shows places, never terms. A term in a branch name is reported as "the branch name".

<a id="k4"></a>

### K4: An address that isn't allowed

CI · **Blocked** · ci / privacy

- **When:** A commit's author, committer or trailer address isn't a GitHub noreply address, brad@bradthome.com or noreply@anthropic.com in a trailer.
- **How often:** Rare.
- **Enforces:** D16, D43 · scenarios S2.2

```text
✖ privacy  address not allowed
  e4f5a6b  author     jo***@example.com
  Commits use a GitHub noreply address or brad@bradthome.com.
  Fix: tell Brad. The squash merge sets its own author, but the branch's commits stay visible.
```

<a id="k5"></a>

### K5: A possible secret

CI · **Blocked** · ci / secrets (gitleaks)

- **When:** gitleaks finds a key, token or password in a commit of the pull request.
- **How often:** Rare.
- **Enforces:** No secrets or private terms (D54) · scenarios S2.3

```text
✖ secrets  possible secret
  e4f5a6b  scripts/deploy.ts:14  rule generic-api-key  value REDACTED
  Secrets never enter the repo.
  Fix: if it was a real key, rotate it now, then tell Brad.
```

<a id="r2"></a>

### R2: The live ruleset differs from the file

Ruleset check · **Blocked** · pnpm ruleset:check

- **When:** GitHub serves the ruleset, and it doesn't match the file, or the file is missing a rule.
- **How often:** Should be never.
- **Enforces:** D47, D81 · scenarios S5.3

```text
$ pnpm ruleset:check
✓ ruleset file  .github/rulesets/main.json has every rule
✓ code owners  .github/CODEOWNERS names Brad for every path
✖ live ruleset  differs from the file
  required approvals   file 1 · live 0
  bypass actors        file none · live Repository admin
  Fix: Brad reapplies the file from slice 1.5's steps, or a pull request changes the file first.
```

<a id="s1"></a>

### S1: The repo's settings are checked

Setup · **Passes** · pnpm setup:check

- **When:** Someone checks a machine's setup.
- **How often:** Once per machine, and whenever something seems off.
- **Enforces:** D81 · scenarios S6.1

```text
$ pnpm setup:check
✓ git hooks are on
✓ private-term list found: 48 terms
✓ gitleaks 8.30.1
✓ Claude Code here runs gh as bradthome-agent
✓ the guard for sessions started elsewhere is installed
✓ skill copies and template overrides match
✓ repo settings: squash merges only, auto-merge off, branches deleted after merging
Ready.
```

A new line on the existing check. A setting that's wrong names it and the fix, which Brad's login makes.

<a id="m2"></a>

### M2: The merge box from slice 1.5

GitHub · **Blocked until approved** · the pull request's page, as Brad sees it

- **When:** Any open pull request after slice 1.5 applies the ruleset.
- **How often:** Every pull request from slice 1.5.
- **Enforces:** D47, D80, D81 · slice 1.5's scenarios

```text
✖ Review required
  At least 1 approving review is required by reviewers with write access.
  Review from a code owner is required: @memorex386.

✓ All checks have passed
  Required: ci / gate, locked-tests / lock

  Merging is blocked
  [ Squash and merge ]  (disabled)
```

A preview. An approval from the agent's account doesn't count, since only a code owner's does. GitHub doesn't let Brad approve a pull request Brad opened, so Brad's changes go through the agent (D81).
