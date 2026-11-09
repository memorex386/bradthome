---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D191
---

# Inspect shows what the reply carries

## Context and problem statement

The chat designs show more than the API's reply carries (spec 021). The reply gives the answer, its sources, the model, the token counts and the total time. The designs also draw step timings, a full trace, thumbs up and down, a timeline answer (A7), and progress steps before the answer. How much of that does slice 4.3 build?

## Decision drivers

- Inspect is built in the browser from the reply, and nothing is stored for it ([D175](0175-the-chat-logs-numbers-only-never-what-visitors-type.md)).
- `apps/chat-api/` is being changed by another session.
- Nothing shown should claim more than the API measured.

## Considered options

The options are listed in the builder's ranked order.

1. What the reply carries, plus the cost worked out from the model's price (recommended)
2. The same, without the cost
3. Add step timings to the API

## Decision outcome

Chosen option 1, as recommended. Inspect shows the model, the sources and their IDs, the tokens read from the cache, the question's new tokens, the answer's tokens, the total time, and the cost, worked out in the browser from the model's list price, with a link to the API's code. It leaves out step timings, the trace, thumbs and the timeline answer. While it answers, the window says it's checking the browser, then writing, with Stop. The evals link comes with slice 4.4's `/evals`.

### Consequences

- Good, because every number shown is the API's own.
- Good, because the API doesn't change.
- Bad, because the browser keeps its own copy of the prices, which a test holds equal to the API's.

### Confirmation

Spec 022's tests check Inspect's numbers against a fixed reply, and that the browser's prices match the API's.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.3 session, 2026-11-08.
