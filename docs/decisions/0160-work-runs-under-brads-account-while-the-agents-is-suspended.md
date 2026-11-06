---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D160
---

# Work runs under Brad's account while the agent's is suspended

## Context and problem statement

GitHub suspended the agent's account, bradthome-agent, on 2026-11-06, and hid its pull requests. Brad is appealing. The agent can't push, open pull requests or read the repo as that account until it's restored. Which account does the work run under meanwhile?

## Considered options

The options are listed in the builder's ranked order.

1. Brad's own account, memorex386, until the agent's account is restored (recommended)
2. A new agent account
3. Pause the rebuild until the appeal is decided

## Decision outcome

Chosen option 1. Commits, pushes and gh run as memorex386, signed with a key of Brad's, with brad@bradthome.com as the address. `scripts/lib/gh.ts` names the working login: `AGENT_SUSPENDED` is true, so `WORKING_LOGIN` is memorex386. `pnpm setup:check` passes when gh in Claude Code acts as that login, and `pnpm install` no longer points gh at the agent's folder, and takes it back out of a checkout an earlier install pointed there.

### Consequences

- Good, because the rebuild keeps moving, with the same hooks and checks.
- Good, because switching back is one constant in `gh.ts`, the agent's settings folder and the local git config.
- Bad, because the agent's work and Brad's share one account, so the history no longer shows which wrote what. The co-author trailer still marks the agent's commits.
- Bad, because the guard's log of commands that use Brad's login no longer catches ordinary gh calls, since every call now uses it.

### Confirmation

Spec 001's setup-check tests expect memorex386 as the working login, and `pnpm setup:check` passes on Brad's PC.

## More information

- Decided by: Brad Thome, on a choice card, 2026-11-06.
- Supersedes [D60](0060-the-agents-username-is-bradthome-agent.md), [D61](0061-the-agents-email-is-agent-bradthome-com.md) and [D62](0062-the-agents-public-profile.md) for now, and the rule in [D73](0073-keep-the-agent-on-its-own-github-account.md) that the agent works only as its own account. This reverses when the agent's account is restored.
- Specs: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md) (S2.8, FR-018). Goes with [D161](0161-changes-go-straight-to-main.md).
