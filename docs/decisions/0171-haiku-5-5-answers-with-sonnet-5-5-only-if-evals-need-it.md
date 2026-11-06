---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D171
---

# Haiku 5.5 answers, with Sonnet 5.5 only if evals need it

## Context and problem statement

Which Claude model answers the chat, and what does an answer cost? The corpus is about 10,000 tokens today and is cached on every answer.

## Decision drivers

- The cheapest model that passes every must-pass eval case should ship.
- The budget is $25 a month ([D169](0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Haiku 5.5, with Sonnet 5.5 only if Haiku fails a must-pass case (recommended)
2. Sonnet 5.5, switching to Haiku 5.5 when the day's spend nears its limit
3. Opus 5.5

## Decision outcome

Chosen option 1, as recommended. The chat uses `claude-haiku-5-5`, about $0.0005 an answer from a warm cache and $0.002 from a cold one. Slice 4.4's evals run both models. If Haiku fails a must-pass case that no prompt change fixes, `claude-sonnet-5-5` replaces it, at about $0.01–0.03 an answer plus thinking tokens, which Sonnet 5.5 can't turn off. Each model change is its own eval run, recorded in the pull request.

### Consequences

- Good, because the budget covers many times the expected traffic.
- Bad, because Haiku may write less well, which the evals will show.

### Confirmation

The API reads its model from one setting, and slice 4.4's gate fails a change to it that hasn't run the evals.

## Pros and cons of the options

### Haiku first

- Good, because it's about 15–20 times cheaper than Sonnet.
- Bad, because its writing may be plainer.

### Sonnet first

- Good, because it writes better.
- Bad, because it costs 15–20 times as much, and its thinking can't be turned off.

### Opus 5.5

- Bad, because it costs about $0.02–0.07 an answer, which short answers from a small corpus don't need.

## More information

- Decided by: Brad Thome, on a choice card in the phase 4 planning session, 2026-11-06.
- Evidence, checked 2026-11-06: [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing), [models overview](https://platform.claude.com/docs/en/about-claude/models/overview), [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).
