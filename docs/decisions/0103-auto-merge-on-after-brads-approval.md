---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D103
---

# Auto-merge on, after Brad's approval

## Context and problem statement

Spec 002 kept the repo's auto-merge setting off (D81), so Brad had to approve a pull request, wait for its full CI run, then come back to click merge. Brad asked for a button that merges by itself once CI passes.

## Decision drivers

- Brad shouldn't have to wait on CI to merge.
- Every merge still needs Brad's approval, and agents still never merge.

## Considered options

1. Turn on the repo's auto-merge setting (recommended).
2. Keep it off, and click merge after CI.

## Decision outcome

Option 1, which Brad chose in the session on 2026-11-03. The repo allows auto-merge. Brad approves a pull request and clicks "Enable auto-merge" with squash, and GitHub merges it once every required check passes.

- The ruleset still needs a code owner's approval, which is Brad's.
- The agent's Claude Code guard still denies `gh pr merge`, `--auto` and the app's auto-merge switch, so only Brad can arm it.
- `pnpm setup:check` now expects auto-merge on. Spec 002's S4.3, S6.1 and FR-019 change with it, and so do its setup-check test and message, which are re-locked.

### Consequences

- Good, because Brad approves once and walks away.
- Neutral: a pull request with auto-merge armed merges on its next green run. Disabling it on the pull request stops that.

### Confirmation

`pnpm setup:check` reads the setting, and `tests/002/integration/setup-check-repo.test.ts` checks the line.

## More information

- Decided by: Brad Thome, in the session after slice 2.1, 2026-11-03. The setting was changed with Brad's gh login, which the agent's account can't do.
- Changes [D81](0081-the-conventions-batch-for-ci-and-the-ruleset.md)'s auto-merge setting.
