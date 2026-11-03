---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D96
---

# The Stop hook lets a tests stage end its turn

## Context and problem statement

Spec 001's Stop hook sends the agent back while the type check or any unit test fails, after a turn that changed code (FR-022). In a full-track tests stage, the new spec's tests fail on purpose until the build adds the code. On 2026-11-03 spec 003's tests session was sent back dozens of times in a row, Claude Code's limit didn't end the loop, and Brad had to step in. Which failing tests should stop counting against a turn?

## Decision drivers

- A tests stage must be able to end its turns, including its harness setup and the lock.
- The build stage keeps the hook's push to finish its spec's tests.
- Type errors and failures in other specs' tests still send the agent back.
- The rule rests on facts git already has, not on the agent's say-so.

## Considered options

1. Until the build starts
2. Until the spec is on main
3. Only failures from missing modules or files

## Decision outcome

Chosen option: "Until the build starts". Brad picked the recommendation on the decision page. The lock is the boundary the loop already has: the tests stage ends with `pnpm lock`, and every code change after it is the build.

- A spec's tests wait for their build while main has no `tests.lock` for it and, since its `tests.lock` was first committed, the branch changed no code outside its `tests/NNN/`. Commits merged in from main don't count. A `tests.lock` that isn't committed yet counts as the tests stage still running.
- When the type check passes and every failing unit test file is in such a spec's `tests/NNN/`, the Stop hook lets the turn end and shows a one-line notice naming the spec.
- Otherwise it sends the agent back with every failure, the waiting spec's included.

### Consequences

- Good, because a tests stage no longer loops, and nothing else the hook catches changes.
- Good, because the build still blocks from its first code change, so FR-022 drives it to green.
- Bad, because the hook runs a few more git commands when tests fail.
- Neutral: CI still runs every test, so a branch whose tests fail can't pass `ci / gate`.

### Confirmation

Spec 001's S5.4, its tests-stage edge case and FR-022 describe the rule. `tests/001/unit/stop-hook.test.ts` checks the decision, and `tests/001/integration/stop-hook-waiting.test.ts` checks which specs wait on scratch repos with real git, and a real tests-stage turn. Spec 001 was re-locked with this change.

## Pros and cons of the options

### Until the build starts

- Good, because the tests stage ends its turns, and the build still gets pushed to green.
- Bad, because the rule needs the commit that first added the lock, and ignores merges from main.

### Until the spec is on main

- Good, because it's the simplest rule, and a stuck build can't loop either.
- Bad, because during the build the hook no longer pushes the agent to pass its own spec's tests.

### Only failures from missing modules or files

- Good, because it needs no git.
- Bad, because spec 003's static tests fail as ordinary assertions while a file isn't there yet, so most of them would still block and the loop would go on.

## More information

- Decided by: Brad Thome, on the decision page for [#15](https://github.com/memorex386/bradthome/issues/15), which also approved the light change at Gate 1.
- Spec: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md), S5.4 and FR-022.
