---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D177
---

# Five slices, with the chat live only after its evals

## Context and problem statement

In what order and size are slices 4.1–4.5 built, and can any start before the others are planned? The charter requires evals before an AI feature goes live ([D34](0034-no-fixed-spending-ceiling.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Five slices, with the chat live only after 4.4's evals pass (recommended)
2. The eval harness before the API
3. The API and the chat window as one slice

## Decision outcome

Chosen option 1, as recommended. The slices run 4.1 corpus, 4.2 API, 4.3 chat window, 4.4 evals and `/evals`, then 4.5 interview prep. Slices 4.2 and 4.3 show only on previews and `next`. The chat goes live on bradthome.com as v2.1, released only once 4.4's must-pass cases pass, and prep ships as v2.2. Slice 4.1 can start now, since it needs no setup or money. Slice 4.2 waits on Brad's Anthropic and Google Cloud setup. Each slice still gets its own spec at its own Gate 1.

### Consequences

- Good, because nothing reaches visitors before the evals pass.
- Bad, because the chat isn't live until four slices are done.

### Confirmation

The release for v2.1 is cut only after slice 4.4's must-pass suite runs green on main.

## Pros and cons of the options

### Five slices, live after evals

- Good, because each slice is small enough to review and preview.

### Evals before the API

- Good, because the prompt is tested first.
- Bad, because the harness gets built before there's an API to test against.

### API and window together

- Good, because it means fewer gates.
- Bad, because one large slice is harder to review.

## More information

- Decided by: Brad Thome, on a choice card in the phase 4 planning session, 2026-11-06.
