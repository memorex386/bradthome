---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D57
---

# Six layers of cost stops

## Context and problem statement

**The question:** Which cost stops, and how fast?

Completes [D56](0056-layered-spending-caps-with-an-automatic-shutdown.md). Brad asked whether this is where observability and evals come in: observability is the reactive layer and evals the proactive one. Google's stops lag hours to a day, and Anthropic bills the chat's tokens outside Google's caps, so the fast stops live in our code and at Anthropic.

## Considered options

The options are listed in the builder's ranked order.

1. All of these layers (recommended, chosen)
2. All of these but the disaster stop
3. Option 2 from the last page, alone: unlink billing at $5

## Decision outcome

Chosen option: "All of these layers".

Costs stop in six layers:
- Before release: evals check the cost of each answer against a limit, along with its quality, before any prompt or model change merges (slice 4.4).
- Within seconds: the API measures what each answer costs, keeps hourly and daily totals, and switches the chat off at a limit. Bot checks, rate limits and a maximum instance count slow abuse (slice 4.2).
- At Anthropic: the chat's key sits in its own workspace with a monthly spend limit.
- Within a day: a $5 monthly spend cap on Cloud Run.
- Disaster: if the project passes $25 in a month, a function unlinks billing and everything stops (slice 2.2, the cost guard).
- Email alerts at $1, $3, $5 and $25.

## More information

- Decided by: Brad Thome, on the slice-plan decision page (F7).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
