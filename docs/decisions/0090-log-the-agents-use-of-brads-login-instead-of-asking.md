---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D90
---

# Log the agent's use of Brad's login instead of asking

## Context and problem statement

Spec 001 made Claude Code stop for Brad's approval before any command that switches gh's login, config folder or token, so the agent can't act as Brad's GitHub account unseen ([D73](0073-keep-the-agent-on-its-own-github-account.md), S2.7, FR-018). Slice 1.5's admin steps each stopped for Brad, and Brad found that this doesn't work for Brad day to day. Brad will always allow those calls, and would rather see each one and be able to revert it later. Should the agent still ask before each one?

## Decision drivers

- Brad's attention goes to gates and decisions, not to approving each admin call.
- Every use of Brad's login stays visible and traceable, so Brad can review and revert it.
- The rules that keep Gate 3 Brad's stay as they are: no merging, no approving, no skipped hooks ([D73](0073-keep-the-agent-on-its-own-github-account.md)).

## Considered options

1. Log each call and show a notice, without asking (Brad's direction)
2. Keep asking before each call
3. Turn the prompt off for a slice, then back on

## Decision outcome

Chosen option: "Log each call and show a notice, without asking". Brad directed it in the session on 2026-11-02, over the agent's suggestion to keep the prompt, as an override the working agreement allows.

- The ask rules for `GH_CONFIG_DIR`, `GH_TOKEN`, `GITHUB_TOKEN`, `GH_ENTERPRISE_TOKEN` and `gh auth` come out of `.claude/settings.json`.
- The guard sees the same commands, appends each one to a log on Brad's PC outside the repo, with any token's value hidden, and shows a notice in the session. If the log can't be written, the notice says so.
- A pull request that used Brad's login lists those calls.
- Claude Code still asks before a `git config bradthome.*` change, an edit to `.claude/settings.local.json`, or an edit to the guard's own files.

### Consequences

- Good, because admin steps run without stopping Brad, and each one is still on record.
- Bad, because nothing stops a call before it runs. The log shows it afterwards, and Brad reverts it if needed.
- Neutral: the agent still uses Brad's login only for admin steps its own account can't do.

### Confirmation

Spec 001's S2.7 and FR-018 now describe the log and the notice, and the C4 mock and evidence match. The locked tests in `tests/001/static/settings.test.ts` and `tests/001/unit/guard.test.ts` check that the commands match no ask rule, that the guard logs them with tokens hidden, and that a merge is still denied. They were re-locked with this change.

## Pros and cons of the options

### Log each call and show a notice

- Good, because Brad isn't interrupted, and the log keeps every call.
- Bad, because a wrong call is caught after it runs, not before.

### Keep asking before each call

- Good, because nothing runs as Brad without Brad's yes.
- Bad, because Brad approves every call and never refuses one, so the prompt adds work without adding safety.

### Turn the prompt off for a slice, then back on

- Good, because the prompt comes back after the admin work.
- Bad, because each switch is another edit to the guard, and the next admin slice has the same problem.

## More information

- Decided by: Brad Thome, in the slice 1.5 session on 2026-11-02, as an override of S2.7 and FR-018. Brad's words are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
- Spec: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md), S2.7 and FR-018.
