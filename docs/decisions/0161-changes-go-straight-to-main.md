---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D161
---

# Changes go straight to main

## Context and problem statement

The agent's account is suspended, and work runs under Brad's account meanwhile ([D160](0160-work-runs-under-brads-account-while-the-agents-is-suspended.md)). Every change has reached main through a pull request that Brad squash-merges (D101's Gate 2), opened as a draft and then marked ready (D100). Brad would rather skip pull requests and have changes land on main directly while the work runs under Brad's account. How do changes reach main now?

## Considered options

The options are listed in the builder's ranked order.

1. Push straight to main after Brad says push, with every check run locally first and main's CI on each push (recommended)
2. Keep pull requests, opened from Brad's account

## Decision outcome

Chosen option 1, until the agent's account is restored.

- A change is committed on a short branch, as before, since pre-commit still blocks commits on main. When every check passes locally, the session shows Brad the change and waits. Brad's "push" in the session is Gate 2. The session then pushes the branch to main, with `git push origin HEAD:main`.
- pre-push no longer blocks a push to main. It still checks every new commit for secrets, private terms and addresses, checks branch and tag names, blocks any push that rewrites history, and blocks a push that deletes main.
- `.github/rulesets/main.json` makes the repository admin role the one bypass actor, in always mode, so Brad's direct pushes pass. Every rule stays, so anyone else still needs a pull request with every check.
- Main's CI runs on each push. A red main is fixed forward at once, in the next push.
- A pull request that's still opened, such as the weekly previews refresh, keeps its text check, lock check and gate.

This change itself lands through one pull request, since the old pre-push hook blocks pushes to main and hooks are never skipped.

### Consequences

- Good, because changes land without a pull request each time.
- Good, because every local check still runs before a push, and CI still runs on main.
- Bad, because nothing on GitHub stops a red change before it's on main. CI catches it after, and the preview channel per pull request doesn't run for direct pushes. The `next` channel still deploys main on each push.
- Bad, because the admin bypass lets Brad's account skip every rule, including signed commits and the required checks.

### Confirmation

Spec 001's pre-push tests show a push to main passes and a deletion of main is blocked, and spec 002's ruleset tests want the admin role as the one bypass actor, always. `pnpm ruleset:check` shows the live ruleset's bypass until it's switched to always.

## More information

- Decided by: Brad Thome, on a choice card, 2026-11-06.
- Amends Gate 2 in [D101](0101-a-lighter-loop-one-session-and-two-gates.md) and the draft-then-ready flow in [D100](0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md), and the rule in [D27](0027-the-conventions-batch-for-templates-ids-and-records.md) that the required checks apply to admins too, for as long as D160 holds.
- Specs: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md) (S2.2, FR-002) and [002, CI and rulesets](../../specs/002-ci-and-rulesets/spec.md) (S5.1, FR-017).
