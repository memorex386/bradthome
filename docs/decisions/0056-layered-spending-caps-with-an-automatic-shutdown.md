---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D56
---

# Layered spending caps with an automatic shutdown

## Context and problem statement

**The question:** How do we cap spending on Google Cloud?

Brad picked option 1 and asked for an automatic shutdown if costs spiral quickly, possibly using option 2. Both of Google's stops depend on billing data that lags hours to a day, so a fast stop has to live in our own code. F7 put that to Brad rather than guessing.

## Considered options

The options are listed in the builder's ranked order.

1. Layered caps: a spend cap on the API, alerts on everything, limits in code (recommended, chosen)
2. A hard stop for everything at the limit
3. Alerts only

## Decision outcome

Chosen option: "Layered caps: a spend cap on the API, alerts on everything, limits in code".

Google Cloud spending gets layered caps, not alerts alone, and must shut down automatically if costs spiral quickly. F7 sets the exact layers.

## More information

- Decided by: Brad Thome, on the foundation decision page (F6).
- Later: F7 set the layers ([D57](0057-six-layers-of-cost-stops.md)).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
