---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D52
---

# Firebase Hosting on Blaze, with the API on Cloud Run

## Context and problem statement

**The question:** Hosting that scales without lock-in

Replaces R5. Brad wants scale, no lock-in and an easy justification, at $5–10 a month. Containers are the standard portable backend, and Brad already uses Firebase and Cloud Run. Brad asked how to cap costs; that question is F6. This updates [D7](0007-host-the-site-on-firebase-hosting.md).

## Considered options

The options are listed in the builder's ranked order.

1. Google Cloud: Firebase Hosting on Blaze, with the Hono API as a container on Cloud Run (recommended, chosen)
2. Cloudflare: the static site, with the Hono API on Workers
3. Both: Cloudflare in front for DNS, email and bot checks, with the API on Cloud Run
4. Vercel Pro

## Decision outcome

Chosen option: "Google Cloud: Firebase Hosting on Blaze, with the Hono API as a container on Cloud Run".

Hosting is on Google Cloud. The site stays on Firebase Hosting, moved to the Blaze plan, with preview channels. The Hono API runs as a container on Cloud Run. There's no DNS move, and email forwarding stays with Squarespace.

## More information

- Decided by: Brad Thome, on the foundation decision page (F2).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
