---
status: accepted
date: 2026-10-31
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D74
---

# Pin the reviewer, and measure it on frozen cases

## Context and problem statement

The [working agreement](../working-agreement.md) says that checks which can't give the same verdict every time, like the reviewer agent, use frozen cases, a pinned model and pass rates over several runs. Slice 1.3 creates the reviewer, so this applies for the first time. When does the reviewer get them?

## Decision drivers

- The working agreement is locked, and it asks for all three.
- The reviewer advises. It never approves and is never a required check.
- Each change to the reviewer should cost little time and no paid API usage.

## Considered options

The options are listed in the builder's ranked order.

1. Pin it now, and add five frozen cases now (recommended)
2. Pin it now, and build the frozen cases with the chat's evals in slice 4.4
3. Don't pin it

## Decision outcome

Chosen option: "Pin it now, and add five frozen cases now", because the agreement asks for both, and the reviewer is new now.

- The reviewer is pinned to `claude-opus-5-5` by its exact ID. A newer model takes over only through a pull request that runs the cases again.
- There are five frozen cases. Each is a diff with one planted bug, drawn from slice 1.3's own risks. Each case runs three times whenever the reviewer or its model changes. A run finds the bug when a finding names the bug's file and the scenario it breaks.
- The runs use Brad's Claude plan, not a paid API key, and the pull request reports the pass rate.

### Consequences

- Good, because a change of model becomes deliberate and visible.
- Good, because the reviewer's misses can be measured.
- Bad, because each change to the reviewer costs fifteen runs of time and plan usage.
- Neutral, because a model passed when the reviewer starts would override the pin, so the review skill never passes one.

### Confirmation

Spec 001's scenarios S6.1 to S6.3, and its success criterion SC-004: the bug is found in at least 12 of 15 runs, and in at least 2 of 3 runs for every case.

## Pros and cons of the options

### Pin it now, and add five frozen cases now

- Good, because the agreement holds from the reviewer's first day.
- Bad, because it makes slice 1.3 bigger.

### Pin it now, and build the cases in slice 4.4

- Good, because one eval setup would serve the reviewer and the chat.
- Bad, because the reviewer goes unmeasured until phase 4, which needs a logged exception to the agreement.

### Don't pin it

- Good, because it's no work.
- Bad, because the reviewer would change with each new model, unmeasured, and the locked agreement would have to change.

## More information

- Decided by: Brad Thome, on the slice 1.3 decision page (Q3).
- Evidence: [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) accept a full model ID, such as `claude-opus-5-5`, read 2026-10-31.
- Spec: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md), Story 6.
