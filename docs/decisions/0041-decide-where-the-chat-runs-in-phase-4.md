---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D41
---

# Decide where the chat runs in phase 4

## Context and problem statement

**The question:** Where will the chat run? (provisional)

Brad chose option 3. Hosting (R5) is still open.

## Considered options

The options are listed in the builder's ranked order.

1. A Cloudflare Worker with the AI SDK, Turnstile and a daily budget (recommended)
2. Firebase Cloud Run on Blaze
3. Decide in phase 4 (chosen)

## Decision outcome

Chosen option: "Decide in phase 4".

Where the chat runs gets decided in phase 4. The foundation stays neutral.

## More information

- Decided by: Brad Thome, on the foundation decision page (R7).
- Later: [D52](0052-firebase-hosting-on-blaze-with-the-api-on-cloud-run.md) settled the hosting.
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
