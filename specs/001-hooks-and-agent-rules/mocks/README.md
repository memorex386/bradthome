# Spec 001 mocks: what the checks say

"Show it" for [spec 001](../spec.md). Each state shows the exact words a check prints, and the spec's scenarios name these IDs. Brad approves them with the spec at Gate 1.

- The states are ordered by how often they're expected, most common first. These are estimates, since nothing measures hook outcomes yet.
- File names, addresses, hashes and numbers are made-up examples. A private term is never shown, here or by the checks.
- For Claude Code, only the message is the repo's. The wording around it, and the permission prompt in C9, are Claude Code's own.

## From an edit to Brad's merge

Three layers check a change. Claude Code's rules apply only to the builder agent. The git hooks apply to every agent and to Brad. GitHub's required checks and ruleset come in slice 1.4.

1. **The agent edits a file** (Claude Code). An edit to a locked test is denied before it happens, and an edit to the guard’s own files asks Brad first. States: [C6](#c6), [C9](#c9).
2. **Anyone runs git commit** (Claude Code). Claude Code refuses to skip the hooks. States: [C3](#c3).
3. **pre-commit** (Git hooks). Main, secrets, private terms, addresses, locked tests and copies. It fails closed when its list or gitleaks is missing. States: [G0](#g0), [G1](#g1), [G2](#g2), [G3](#g3), [G4](#g4), [G5](#g5), [G6](#g6), [S3](#s3), [S4](#s4).
4. **commit-msg** (Git hooks). The message format, private terms and trailer addresses. States: [G7](#g7), [G8](#g8), [G9](#g9).
5. **The commit is made** (Git hooks). Each hook printed one line saying what it checked. States: [G0](#g0).
6. **Anyone runs git push** (Git hooks). pre-push blocks main and rewrites, re-checks every outgoing commit, including any made with the hooks skipped, and checks branch and tag names for private terms. States: [G10](#g10), [G11](#g11), [G12](#g12), [G13](#g13).
7. **The agent uses gh or the browser** (Claude Code). gh works as bradthome-agent. Merging and approving are denied, using Brad’s login is logged, and the browser stays off the repo’s pull request and settings pages. States: [C0](#c0), [C1](#c1), [C2](#c2), [C4](#c4), [C5](#c5).
8. **A session started in another folder** (Claude Code). The guard in Brad’s user settings covers bradthome there, and nothing else. States: [C8](#c8).
9. **The agent ends its turn** (Claude Code). The Stop hook runs the type check and tests first. States: [C7](#c7).
10. **The reviewer reads the diff** (Reviewer). Pinned to claude-opus-5-5, read-only, and measured on five frozen cases. States: [E1](#e1).
11. **Brad reviews and merges** (Brad). Gate 3. Slice 1.4 adds the required checks and the ruleset on GitHub.

## Every state

29 states.

| ID | State | Where | Result | How often | Scenarios |
| --- | --- | --- | --- | --- | --- |
| [G0](#g0) | A clean commit and push | Git hooks | Passes | Almost every commit, about 23 of a slice’s 25. | S1.9, S3.2, S4.2, S4.3 |
| [C0](#c0) | The agent’s gh works as bradthome-agent | Claude Code | Passes | Every gh command in this repo. | S2.8 |
| [G7](#g7) | The message doesn’t follow the convention | Git hooks | Blocked | About 1 commit in 20, mostly early on. | S4.1, S4.4 |
| [C7](#c7) | The Stop hook sends the agent back | Claude Code | Blocked | Once or twice per build session. | S5.1 |
| [G6](#g6) | Copies out of date | Git hooks | Blocked | About once in a slice that edits skills or templates. | S7.2, S7.3 |
| [G1](#g1) | A commit on main | Git hooks | Blocked | Rare: a forgotten branch. | S2.1 |
| [S1](#s1) | The setup check passes | Setup | Passes | Once per machine, and whenever something seems off. | S8.2 |
| [C4](#c4) | Using Brad’s login is logged | Claude Code | Logged | Only in slices with admin steps, like 1.4 and 1.5, a few times each. | S2.7 |
| [C9](#c9) | Editing the guard asks Brad first | Claude Code | Asks first | Only when a slice changes the guard. | S2.11 |
| [G4](#g4) | An author or committer address that isn’t allowed | Git hooks | Blocked | Once per fresh clone, before its identity is set. | S1.4 |
| [S2](#s2) | The setup check finds problems | Setup | Blocked | Once per new machine. | S8.3 |
| [S3](#s3) | The private-term list is missing or empty | Setup | Blocked | Once per new machine. | S1.6 |
| [S4](#s4) | gitleaks isn’t installed | Setup | Blocked | Once per new machine. | S1.7 |
| [E1](#e1) | The reviewer’s frozen-case report | Reviewer | Passes | A few times a year. | S6.2 |
| [G3](#g3) | A private term in a change | Git hooks | Blocked | Rare. Each one is a leak stopped. | S1.2, S1.10 |
| [G8](#g8) | A private term in the commit message | Git hooks | Blocked | Rare. | S1.3 |
| [G13](#g13) | A private term in a branch or tag name | Git hooks | Blocked | Rare. | S1.11 |
| [G2](#g2) | A possible secret | Git hooks | Blocked | Rare. | S1.1 |
| [G9](#g9) | An address in a trailer that isn’t allowed | Git hooks | Blocked | Rare. | S1.5 |
| [G5](#g5) | A locked test changed without its spec | Git hooks | Blocked | Only when a spec changes after its tests are locked. | S3.1, S3.3 |
| [C6](#c6) | An edit to a locked test | Claude Code | Blocked | Only when a spec changes after its tests are locked. | S3.4 |
| [G12](#g12) | An outgoing commit fails a check | Git hooks | Blocked | Only after someone skips the hooks. | S1.8 |
| [G10](#g10) | A push to main | Git hooks | Blocked | Should be never. | S2.2 |
| [G11](#g11) | A push that rewrites history | Git hooks | Blocked | Should be never. | S2.3 |
| [C1](#c1) | Merging is denied | Claude Code | Blocked | Should be never. | S2.4 |
| [C2](#c2) | Approving is denied | Claude Code | Blocked | Should be never. | S2.5 |
| [C3](#c3) | Skipping the hooks is denied | Claude Code | Blocked | Should be never. | S2.6 |
| [C5](#c5) | The browser stays off the repo’s pull request and settings pages | Claude Code | Blocked | Should be never. | S2.9 |
| [C8](#c8) | Merging is denied in a session started elsewhere | Claude Code | Blocked | Should be never. | S2.10 |

## The messages

Each block message says what was blocked, where, why, and how to fix it. Passing checks print one line each, so it's clear the hooks ran.

<a id="g0"></a>

### G0: A clean commit and push

Git hooks · **Passes** · pre-commit, commit-msg, pre-push

- **When:** A change with nothing to block.
- **How often:** Almost every commit, about 23 of a slice’s 25.
- **Enforces:** Every hard rule · scenarios S1.9, S3.2, S4.2, S4.3

```text
$ git commit -m "feat(001): add the private-term check"
✓ pre-commit  main, secrets, private terms, addresses, locked tests, copies · 0.9s
✓ commit-msg  format, private terms, trailers · 0.3s
[001-hooks-and-agent-rules 4f2c9e1] feat(001): add the private-term check
 3 files changed, 142 insertions(+)
$ git push
✓ pre-push  3 new commits checked · 1.4s
To github.com:memorex386/bradthome.git
   9c1d2e3..4f2c9e1  001-hooks-and-agent-rules -> 001-hooks-and-agent-rules
```

One line per hook, so it’s clear the hooks are on. Silent hooks look the same as missing ones.

<a id="c0"></a>

### C0: The agent’s gh works as bradthome-agent

Claude Code · **Passes** · Claude Code, in this repo

- **When:** Any gh command with no override.
- **How often:** Every gh command in this repo.
- **Enforces:** D73 · scenarios S2.8

```text
● Bash(gh pr view 12 --json author,state)
  ⎿ {"author":{"login":"bradthome-agent"},"state":"OPEN"}
```

This machine’s Claude Code settings point gh at the agent’s login for this repo.

<a id="g7"></a>

### G7: The message doesn’t follow the convention

Git hooks · **Blocked** · commit-msg (commitlint)

- **When:** No type, no spec scope, or no Refs line.
- **How often:** About 1 commit in 20, mostly early on.
- **Enforces:** A spec or issue on every commit · scenarios S4.1, S4.4

```text
$ git commit -m "update hooks"
⧗   input: update hooks
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
✖   name the spec, as in feat(001): …, or add a Refs: #N line [spec-or-issue]

✖   found 3 problems, 0 warnings
ⓘ   Get help: docs/working-agreement.md#conventions
```

commitlint’s own format, with one rule of ours. Merge commits that git writes are exempt from the format, but not from the term and address checks.

<a id="c7"></a>

### C7: The Stop hook sends the agent back

Claude Code · **Blocked** · Claude Code, end of a turn

- **When:** The agent changed code, and the type check or tests fail.
- **How often:** Once or twice per build session.
- **Enforces:** Fast checks pass before the agent says it’s done · scenarios S5.1

```text
Stop hook: the fast checks failed, so keep working.
  ✖ types  scripts/private-terms.ts:41  Type 'string | undefined' is not assignable to type 'string'.
  ✖ tests  2 failed in tests/private-terms.test.ts
  Fix these, then finish.
```

After Claude Code’s limit of 8 sends in a row, the turn ends anyway, so it can’t loop forever (S5.3).

<a id="g6"></a>

### G6: Copies out of date

Git hooks · **Blocked** · pre-commit

- **When:** A skill copy or a Spec Kit template override no longer matches its source.
- **How often:** About once in a slice that edits skills or templates.
- **Enforces:** D47, D75 · scenarios S7.2, S7.3

```text
$ git commit -m "docs(001): tighten the interview skill"
✖ pre-commit  copies out of date
  .claude/skills/interview/SKILL.md doesn't match .agents/skills/interview/SKILL.md
  .specify/templates/overrides/spec-template.md doesn't match docs/templates/spec.md
  Fix: pnpm sync, then stage the copies.
```

Spec Kit’s own speckit-* skills aren’t copied, since Spec Kit writes them for each agent itself.

<a id="g1"></a>

### G1: A commit on main

Git hooks · **Blocked** · pre-commit

- **When:** Someone commits while main is checked out.
- **How often:** Rare: a forgotten branch.
- **Enforces:** No commits to main · scenarios S2.1

```text
$ git commit -m "docs(repo): fix a typo"
✖ pre-commit  commit on main
  Main changes only through a pull request that Brad merges.
  Your changes are still staged.
  Fix: git switch -c fix/short-name, then commit again.
```

<a id="s1"></a>

### S1: The setup check passes

Setup · **Passes** · pnpm setup:check

- **When:** Someone checks a machine’s setup.
- **How often:** Once per machine, and whenever something seems off.
- **Enforces:** D72, D73 · scenarios S8.2

```text
$ pnpm setup:check
✓ git hooks are on
✓ private-term list found: 48 terms
✓ gitleaks 8.30.1
✓ Claude Code here runs gh as bradthome-agent
✓ the guard for sessions started elsewhere is installed
✓ skill copies and template overrides match
Ready.
```

It shows how many terms the list has, never what they are.

<a id="c4"></a>

### C4: Using Brad’s login is logged

Claude Code · **Logged** · Claude Code, in this repo

- **When:** A command would act as Brad’s GitHub account, by switching gh’s login, config folder or token.
- **How often:** Only in slices with admin steps, like 1.4 and 1.5, a few times each.
- **Enforces:** D73, D90 · scenarios S2.7

```text
● Bash(GH_CONFIG_DIR="$APPDATA/GitHub CLI" gh api -X POST repos/memorex386/bradthome/rulesets --input ruleset.json)

  This command uses Brad's GitHub login. It's logged, not asked (D90).
```

The command runs without a prompt. The guard adds a line to the log on Brad's PC, outside the repo, with the time, the session, the folder and the command, and any token's value hidden. If the log can't be written, the notice says so instead:

```text
  This command uses Brad's GitHub login. The log couldn't be written, so it isn't logged.
```

<a id="c9"></a>

### C9: Editing the guard asks Brad first

Claude Code · **Asks first** · Claude Code, in this repo

- **When:** The agent edits .claude/settings.json, .claude/hooks/ or .husky/.
- **How often:** Only when a slice changes the guard.
- **Enforces:** D73 · scenarios S2.11

```text
● Edit(.claude/settings.json)

  Claude Code stops and asks Brad to allow this edit.
  ❯ Yes
    No
```

Without this, an agent could switch a guard off by editing it. An ask rule triggers it, so it still stops in bypass mode.

<a id="g4"></a>

### G4: An author or committer address that isn’t allowed

Git hooks · **Blocked** · pre-commit

- **When:** The address isn’t a GitHub noreply address or brad@bradthome.com.
- **How often:** Once per fresh clone, before its identity is set.
- **Enforces:** D16, D43 · scenarios S1.4

```text
$ git commit -m "feat(001): add the setup check"
✖ pre-commit  address not allowed
  author     jo***@example.com
  Commits use a GitHub noreply address or brad@bradthome.com.
  Fix: git config user.email <your noreply address>, then commit again.
```

The address is masked, even in the committer’s own terminal.

<a id="s2"></a>

### S2: The setup check finds problems

Setup · **Blocked** · pnpm setup:check

- **When:** A machine is missing part of its setup.
- **How often:** Once per new machine.
- **Enforces:** D72, D73 · scenarios S8.3

```text
$ pnpm setup:check
✓ git hooks are on
✖ private-term list not found
  Fix: git config --global bradthome.privateTerms <path to the list>
✓ gitleaks 8.30.1
✖ Claude Code here runs gh as memorex386, not bradthome-agent
  Fix: set GH_CONFIG_DIR in .claude/settings.local.json. AGENTS.md shows how.
✓ the guard for sessions started elsewhere is installed
✓ skill copies and template overrides match
2 problems.
```

<a id="s3"></a>

### S3: The private-term list is missing or empty

Setup · **Blocked** · pre-commit, commit-msg, pre-push

- **When:** The git setting is missing, points nowhere, or the list has no terms.
- **How often:** Once per new machine.
- **Enforces:** No secrets or private terms (D45, D72) · scenarios S1.6

```text
$ git commit -m "feat(001): add the lock script"
✖ pre-commit  private-term list not found
  This check reads Brad's private list, which never enters the repo.
  Commits are blocked until it's found, so nothing private slips through.
  Fix: git config --global bradthome.privateTerms <path to the list>
```

An empty list says “private-term list is empty” and blocks the same way.

<a id="s4"></a>

### S4: gitleaks isn’t installed

Setup · **Blocked** · pre-commit, pre-push

- **When:** The secret scanner can’t run.
- **How often:** Once per new machine.
- **Enforces:** No secrets or private terms (D54) · scenarios S1.7

```text
$ git commit -m "feat(001): add the lock script"
✖ pre-commit  gitleaks not installed
  Commits are blocked until the secret scan can run.
  Fix: install gitleaks 8.30.1 or later (scoop install gitleaks, or brew install gitleaks).
```

<a id="e1"></a>

### E1: The reviewer’s frozen-case report

Reviewer · **Passes** · pnpm review:eval

- **When:** The reviewer’s definition or model changes.
- **How often:** A few times a year.
- **Enforces:** D74 · scenarios S6.2

```text
$ pnpm review:eval
Reviewer: claude-opus-5-5 · 5 frozen cases × 3 runs
  F1  a block message prints the private term       3/3
  F2  pre-push skips commits on a new branch        3/3
  F3  commitlint accepts a missing spec or issue    2/3
  F4  the merge guard misses gh api … /merge        3/3
  F5  a tests.lock edit passes without its spec     3/3
Overall 14/15 (93%). Every case found at least 2 of 3 times: target met.
```

Example numbers. The real report goes in the pull request. A case counts as found when a finding names the planted bug’s file and the scenario it breaks.

<a id="g3"></a>

### G3: A private term in a change

Git hooks · **Blocked** · pre-commit

- **When:** A staged line holds a term from the list, in any letter case.
- **How often:** Rare. Each one is a leak stopped.
- **Enforces:** No secrets or private terms (D45) · scenarios S1.2, S1.10

```text
$ git commit -m "docs(001): add setup notes"
✖ pre-commit  private term
  docs/notes.md:22
  A term on Brad's private list is in this change. The term isn't shown.
  Fix: remove or reword that line. If it's a false match, ask Brad to refine the list.
```

Terms match whole words, so a short term doesn’t fire inside a longer word. A phone number listed as digits also matches it written with spaces, dots, dashes or brackets.

<a id="g8"></a>

### G8: A private term in the commit message

Git hooks · **Blocked** · commit-msg

- **When:** The message holds a term from the list.
- **How often:** Rare.
- **Enforces:** No secrets or private terms (D77) · scenarios S1.3

```text
$ git commit
✖ commit-msg  private term
  commit message, line 3. The term isn't shown.
  Fix: reword the message. Your draft is in .git/COMMIT_EDITMSG.
```

<a id="g13"></a>

### G13: A private term in a branch or tag name

Git hooks · **Blocked** · pre-push

- **When:** The name of a branch or tag being pushed holds a term from the list.
- **How often:** Rare.
- **Enforces:** No secrets or private terms (D77) · scenarios S1.11

```text
$ git push -u origin HEAD
✖ pre-push  private term in a branch name
  The branch you're pushing has a term from Brad's private list in its name.
  The name isn't shown, since it holds the term.
  Fix: git branch -m <new-name>, then push again.
```

<a id="g2"></a>

### G2: A possible secret

Git hooks · **Blocked** · pre-commit (gitleaks)

- **When:** gitleaks finds a key, token or password in the staged change.
- **How often:** Rare.
- **Enforces:** No secrets or private terms · scenarios S1.1

```text
$ git commit -m "feat(001): call the API"
✖ pre-commit  possible secret
  scripts/deploy.ts:14  rule generic-api-key  value REDACTED
  Secrets never enter the repo.
  Fix: move it to an environment variable. If it was a real key, rotate it now.
```

<a id="g9"></a>

### G9: An address in a trailer that isn’t allowed

Git hooks · **Blocked** · commit-msg

- **When:** A trailer such as Co-authored-by carries an address that isn’t a noreply address.
- **How often:** Rare.
- **Enforces:** D77 · scenarios S1.5

```text
$ git commit
✖ commit-msg  address not allowed in a trailer
  line 9  Co-authored-by: ka***@example.com
  Trailers use a GitHub noreply address, brad@bradthome.com or noreply@anthropic.com.
  Fix: use the person's GitHub noreply address, or remove the line.
```

Claude’s co-author line uses noreply@anthropic.com.

<a id="g5"></a>

### G5: A locked test changed without its spec

Git hooks · **Blocked** · pre-commit

- **When:** A commit changes a locked test or a tests.lock, and the branch doesn’t change that spec.
- **How often:** Only when a spec changes after its tests are locked.
- **Enforces:** Locked tests stay locked (D21) · scenarios S3.1, S3.3

```text
$ git commit -m "test(001): loosen a check"
✖ pre-commit  locked test changed
  tests/private-terms.test.ts is locked by spec 001.
  A locked test changes only with its spec, and Brad approves both.
  Fix: undo the test change, or change specs/001-hooks-and-agent-rules/spec.md on this branch first.
```

<a id="c6"></a>

### C6: An edit to a locked test

Claude Code · **Blocked** · Claude Code, before the edit

- **When:** The agent tries to change a locked test, and the branch doesn’t change its spec.
- **How often:** Only when a spec changes after its tests are locked.
- **Enforces:** Locked tests stay locked (D21) · scenarios S3.4

```text
● Edit(tests/private-terms.test.ts)
  ⎿ tests/private-terms.test.ts is locked by spec 001. Change the spec first; Brad approves both in the pull request.
```

<a id="g12"></a>

### G12: An outgoing commit fails a check

Git hooks · **Blocked** · pre-push

- **When:** Commits made with the hooks skipped hold a secret, a private term or an address that isn’t allowed.
- **How often:** Only after someone skips the hooks.
- **Enforces:** No secrets or private terms (D77) · scenarios S1.8

```text
$ git push
✖ pre-push  2 of 3 new commits fail a check
  a1b2c3d  docs(001): add notes          private term at docs/notes.md:22
  e4f5a6b  chore(001): bump a version    author jo***@example.com not allowed
  These commits skipped the commit hooks. Nothing was pushed.
  Fix: amend or drop them, then push again.
```

<a id="g10"></a>

### G10: A push to main

Git hooks · **Blocked** · pre-push

- **When:** Any push whose target is main.
- **How often:** Should be never.
- **Enforces:** No commits to main · scenarios S2.2

```text
$ git push origin HEAD:main
✖ pre-push  push to main
  Main changes only through a pull request that Brad merges.
  Fix: git push -u origin <branch>, then open a pull request.
```

<a id="g11"></a>

### G11: A push that rewrites history

Git hooks · **Blocked** · pre-push

- **When:** A push would drop commits the remote branch already has.
- **How often:** Should be never.
- **Enforces:** Agents never force-push · scenarios S2.3

```text
$ git push --force
✖ pre-push  push would rewrite history
  origin/001-hooks-and-agent-rules would lose 2 commits.
  Pushes never rewrite history, so a review always matches what was pushed.
  Fix: bring main in with git merge instead of a rebase, then push.
```

<a id="c1"></a>

### C1: Merging is denied

Claude Code · **Blocked** · Claude Code, in this repo

- **When:** Any route the guard knows: gh pr merge, the merge API, GraphQL merge or auto-merge, or the app’s auto-merge switch.
- **How often:** Should be never.
- **Enforces:** Brad merges (Gate 3, D73) · scenarios S2.4

```text
● Bash(gh pr merge 12 --squash)
  ⎿ Brad merges pull requests. Ask for the merge in the pull request.
```

<a id="c2"></a>

### C2: Approving is denied

Claude Code · **Blocked** · Claude Code, in this repo

- **When:** gh pr review --approve, or the API equivalent.
- **How often:** Should be never.
- **Enforces:** Brad merges (Gate 3, D73) · scenarios S2.5

```text
● Bash(gh pr review 12 --approve)
  ⎿ Only Brad approves pull requests. Leave a comment instead.
```

<a id="c3"></a>

### C3: Skipping the hooks is denied

Claude Code · **Blocked** · Claude Code

- **When:** --no-verify, HUSKY=0, or a different hooks path.
- **How often:** Should be never.
- **Enforces:** Every hard rule · scenarios S2.6

```text
● Bash(git commit --no-verify -m "feat(001): wip")
  ⎿ Don't skip the git hooks. Fix what they report instead.
```

If you skip them yourself, pre-push still re-checks every outgoing commit (G12).

<a id="c5"></a>

### C5: The browser stays off the repo’s pull request and settings pages

Claude Code · **Blocked** · Claude Code, browser tools

- **When:** The agent opens a bradthome pull request or settings page in a browser.
- **How often:** Should be never.
- **Enforces:** D73 · scenarios S2.9

```text
● navigate(https://github.com/memorex386/bradthome/pull/12)
  ⎿ The browser stays off this repo's pull request and settings pages. Read pull requests with gh, as bradthome-agent.
```

Brad’s Chrome is signed in to GitHub as Brad, so this keeps the agent from acting as Brad there.

<a id="c8"></a>

### C8: Merging is denied in a session started elsewhere

Claude Code · **Blocked** · Claude Code, your user settings

- **When:** A session started in another folder tries to merge or approve a bradthome pull request.
- **How often:** Should be never.
- **Enforces:** Brad merges (Gate 3, D73) · scenarios S2.10

```text
● Bash(gh pr merge 12 -R memorex386/bradthome --squash)
  ⎿ Brad merges bradthome pull requests, from any folder.
```

Other repos aren’t affected.
