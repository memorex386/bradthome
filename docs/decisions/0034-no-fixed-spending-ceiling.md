---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D34
---

# No fixed spending ceiling

## Context and problem statement

**The question:** What's the monthly spending ceiling?

Claude recommended $0 until the chat. Brad chose option 3: as things start to cost money, each gets a ceiling, evals and observability. How [D32](0032-non-goals.md) and [D34](0034-no-fixed-spending-ceiling.md) fit together went to Brad with the charter.

## Considered options

The options are listed in the builder's ranked order.

1. $0 until the chat (recommended)
2. A small ceiling now
3. Decide per tool (chosen)

## Decision outcome

Chosen option: "Decide per tool".

There's no fixed spending ceiling. Each paid tool or service is its own tier-1 decision, and anything that costs money gets a cap, monitoring and, for AI features, evals.

With [D32](0032-non-goals.md), that works out as: servers and hosting stay free until the chat, and paid tools can be proposed one at a time before that.

## More information

- Decided by: Brad Thome, on the charter decision page (C6).
- Later: The reading of [D32](0032-non-goals.md) + [D34](0034-no-fixed-spending-ceiling.md) was confirmed with the charter ([D36](0036-approve-the-charter.md)).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
