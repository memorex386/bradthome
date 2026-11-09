---
status: superseded by 0200
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D197
---

# Every eval case must pass before the chat ships

## Context and problem statement

The chat goes live only after its evals pass ([D177](0177-five-slices-with-the-chat-live-only-after-its-evals.md)), and Haiku 5.5 answers unless the evals need Sonnet 5.5 ([D171](0171-haiku-5-5-answers-with-sonnet-5-5-only-if-evals-need-it.md)). What pass rule must a run meet?

## Decision drivers

- A wrong claim about Brad is the chat's main risk ([D174](0174-the-chat-answers-only-from-the-public-corpus-with-sources.md)).
- A rule that tolerates misses invites quiet retries.

## Considered options

The options are listed in the builder's ranked order.

1. 100% on every suite (recommended).
2. 100% on never-claims, injection and cost, with facts at 90%.

## Decision outcome

Chosen option 1, as recommended. Every case in every suite passes: facts, never-claims, injection and boundaries, and cost and time. A flaky case is fixed or rewritten, never retried quietly. If Haiku 5.5 fails, the failures and Sonnet 5.5's cost go to Brad before any switch.

### Consequences

- Good, because a release means every frozen case held on the real model.
- Bad, because one flaky case blocks a release until it's understood.

### Confirmation

The `evals` workflow fails when any case fails, and `/evals` shows each suite's rate.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.4 session, 2026-11-09.
