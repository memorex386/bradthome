---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D175
---

# The chat logs numbers only, never what visitors type

## Context and problem statement

Are the chat's questions and answers logged, what is kept, and for how long? What a visitor types can contain personal data, and the site promises nothing that identifies a visitor ([D32](0032-non-goals.md)).

## Decision drivers

- Keep the least that the cost layers and the evals need.
- The privacy note must say exactly what's kept.

## Considered options

The options are listed in the builder's ranked order.

1. Numbers only, no text (recommended)
2. The questions' text, kept for 30 days
3. Full traces in PostHog's LLM analytics

## Decision outcome

Chosen option 1, as recommended. The API stores nothing a visitor types, and no answer text. Each answer writes one log line to Cloud Logging, kept for its default 30 days, with:

- the token counts and cost
- the time taken
- the model
- the source IDs it cited
- whether it refused, and why

The Inspect panel is built in the visitor's browser from the reply itself, so nothing is stored for it. The evals use frozen cases written by hand, never visitors' questions. The visitor limit's daily code ([D173](0173-limits-show-the-designed-states-at-20-questions-a-day.md)) is held in memory only. Slice 4.2 adds a chat section to the privacy note at `/privacy` that says all this. That section also says Anthropic processes each question to answer it.

### Consequences

- Good, because a log holds no personal data to protect, leak or delete.
- Bad, because gaps in the corpus show only as counts of answers with no source, not as the questions themselves.

### Confirmation

Slice 4.2's tests show a log line carries no question or answer text, and the privacy note's test checks its chat section.

## Pros and cons of the options

### Numbers only

- Good, because it's the least data that still runs the cost layers.

### Questions kept 30 days

- Good, because it shows what visitors ask.
- Bad, because it stores personal data, which the privacy note and the chat input would have to say.

### Full traces in PostHog

- Bad, because it's a new vendor that holds visitors' text.

## More information

- Decided by: Brad Thome, on a choice card in the phase 4 planning session, 2026-11-06.
- Evidence, checked 2026-11-06: [GDPR, Articles 4 and 5](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng), [EDPB expert report on LLM privacy risks (2025)](https://edpb.europa.eu/system/files/2025-04/ai-privacy-risks-and-mitigations-in-llms.pdf).
