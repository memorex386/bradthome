---
status: accepted
date: 2026-10-31
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D73
---

# Keep the agent on its own GitHub account

## Context and problem statement

Slice 1.3 is done when the agent can't merge. Today nothing on GitHub stops a merge into main. The agent's account has write access, and rulesets on a private repo need GitHub Pro, so slice 1.4 has to settle that first. Until then, the local rules are the only guard.

Claude Code's deny rules hold even in its bypass mode, so they can block merging from any account. Two gaps remain. On Brad's PC, the agent can reach Brad's own GitHub login, through the GitHub CLI and through the browser. Anything acting as Brad gets around Gate 3, even once a ruleset exists. How far does "the agent can't merge" go?

## Decision drivers

- Gate 3, the merge, is Brad's alone ([D23](0023-brad-approves-the-constitution-specs-plans-and-merges.md), [D43](0043-a-separate-github-account-for-the-agent.md)).
- Admin steps, such as slice 1.4's ruleset, still need doing.
- Claude Code loads a repo's own rules only in sessions started in that repo's folder.

## Considered options

The options are listed in the builder's ranked order.

1. Keep the agent on its own account here, and ask before it uses Brad's (recommended)
2. Block the merge commands, and keep Brad's login available
3. Only the deny rules D47 named

## Decision outcome

Chosen option: "Keep the agent on its own account here, and ask before it uses Brad's", because it makes "the agent can't merge" true on every route the tools can see, and admin steps still happen with Brad's approval.

- Merging, approving and enabling auto-merge on pull requests are denied from any account, including through the desktop app's auto-merge tool.
- In this repo, the GitHub CLI in Claude Code works as bradthome-agent. A command that switches its login, config folder or token asks Brad first. This uses Claude Code's ask rules, which prompt even in bypass mode.
- The browser tools can't open the repo's pull request or settings pages.
- A copy of the guard in Brad's Claude Code user settings, limited to this repo, covers sessions started in other folders.

### Consequences

- Good, because the agent can't act as Brad on GitHub without Brad's approval.
- Good, because the agent still does admin steps, one approval at a time.
- Bad, because Claude Code's rules match command text. They stop mistakes, not a determined attacker. GitHub's ruleset becomes the hard stop once it exists.
- Bad, because the browser rule sees which page loads, not what's clicked on it.

### Confirmation

Spec 001's scenarios S2.4 to S2.11 cover each route, and each one is tried once in a real Claude Code session (SC-006).

## Pros and cons of the options

### Keep the agent on its own account, and ask before it uses Brad's

- Good, because every route the tools can see is covered.
- Bad, because Brad approves each admin command.

### Block the merge commands, and keep Brad's login available

- Good, because admin steps need no extra approvals.
- Bad, because any other command can still act as Brad, and only a written rule covers the browser.

### Only the deny rules D47 named

- Good, because it's the smallest change.
- Bad, because sessions in other folders, Brad's login and the browser stay uncovered.

## More information

- Decided by: Brad Thome, on the slice 1.3 decision page (Q2).
- Evidence: [Claude Code permission modes](https://code.claude.com/docs/en/permission-modes) says deny rules apply in every mode and explicit ask rules still prompt in bypass mode, read 2026-10-30.
- Evidence: [Claude Code permissions](https://code.claude.com/docs/en/permissions) says a folder added to a session gives file access, not configuration, read 2026-10-30.
- Evidence: on 2026-10-30, GitHub's API refused to list rulesets for this private repo on the free plan.
- Spec: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md), Story 2.
- Partly changed by [D90](0090-log-the-agents-use-of-brads-login-instead-of-asking.md) on 2026-11-02: the agent's use of Brad's login is logged and announced instead of asked. The rest stands.
- Set aside for now by [D160](0160-work-runs-under-brads-account-while-the-agents-is-suspended.md) on 2026-11-06: while the agent's account is suspended, the agent works as Brad's account. The merge and approve denials still hold.
