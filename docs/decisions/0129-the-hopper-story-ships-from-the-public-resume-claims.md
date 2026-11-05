---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D129
---

# The Hopper story ships from the public résumé claims

## Context and problem statement

Slice 3.3 builds the Hopper section of the new home page. The content model already holds Brad's public résumé facts about Hopper (spec 005). Brad's fuller notes on the work, such as the team, numbers, the agent workflow step by step and a colleague's quote, aren't written yet. Should the section wait for them?

## Decision drivers

- Hopper is the main story, and the new home should show it soon.
- Every sentence on the site rests on a public claim.
- New facts should arrive as content, not as another slice.

## Considered options

The options are listed in the builder's ranked order.

1. Build the section now from the public claims, laid out so new claims and a quote are content changes (recommended)
2. Wait for Brad's notes, then build the section once
3. Build it now with the board's draft words, and correct them later

## Decision outcome

Chosen option: "Build now from the public claims". The section shows each public Hopper claim as written, grouped by its topic, with its evidence receipt. A new claim, a new topic or a claim with the topic "Quote" shows after the next export with no layout work.

### Consequences

- Good, because the Hopper story is on previews and `next` now, and Brad's notes come later as a small content change.
- Good, because no sentence rests on a draft.
- Bad, because until Brad's notes and links arrive, every receipt asks the visitor to ask Brad.

### Confirmation

Spec 011's tests check every sentence in the section against `content/claims.yaml`, and that a planted claim, topic or quote shows without a layout change.

## More information

- Decided by: Brad Thome, on 2026-11-04, before the slice 3.3 session started.
