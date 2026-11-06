---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D170
---

# The chat API runs on Cloud Run, scaled to zero

## Context and problem statement

[D41](0041-decide-where-the-chat-runs-in-phase-4.md) left where the chat runs for phase 4, and [D52](0052-firebase-hosting-on-blaze-with-the-api-on-cloud-run.md) put the Hono API ([D37](0037-astro-react-and-a-separate-hono-api.md)) on Cloud Run. Does that still hold, and how is the API reached?

## Decision drivers

- Answers should stream as they're written.
- D57's $5 Cloud Run cap should hold.
- Industry standard by default ([D50](0050-industry-standard-by-default.md)), with no new vendor.

## Considered options

The options are listed in the builder's ranked order.

1. Cloud Run, scaled to zero, called directly by the browser (recommended)
2. Cloud Run with one warm instance
3. Cloud Run behind a Firebase Hosting `/api` rewrite
4. Cloudflare Workers

## Decision outcome

Chosen option 1, as recommended. The Hono API runs as a container on Cloud Run in `us-central1`, in the `bradthome` project. It keeps no instance warm and runs 2 instances at most. The browser calls the service's own address with CORS, so answers stream, and the CSP's `connect-src` adds that one origin. Slice 4.2 measures the cold start and checks how the visitor's address reaches the service. If a test there shows Hosting streams a rewrite's reply after all, 4.2 may move behind the rewrite as a tier-3 choice.

### Consequences

- Good, because the API costs about nothing inside Cloud Run's free tier, well under the $5 cap.
- Good, because Cloud Run streams chunked replies and server-sent events with no setup.
- Bad, because the first question after a quiet spell waits for the container to start.
- Bad, because the API has its own origin, so it needs CORS and a CSP entry.

### Confirmation

Slice 4.2's tests read the service's settings and fail if minimum instances rise above 0 or maximum instances above 2.

## Pros and cons of the options

### Scaled to zero, called directly

- Good, because it streams, costs almost nothing and keeps D52.
- Bad, because of the cold start.

### One warm instance

- Good, because there's no cold start.
- Bad, because it costs about $9.72 a month at list price, which alone would trip the $5 cap.

### Behind a Hosting rewrite

- Good, because the API shares the site's origin, so there's no CORS and no new CSP entry.
- Bad, because Hosting has a 60-second limit and is reported to hold a streamed reply until it ends.

### Cloudflare Workers

- Good, because it has no cold start and Turnstile built in.
- Bad, because it reverses D52 and adds a second cloud bill outside the cost guard.

## More information

- Decided by: Brad Thome, on a choice card in the phase 4 planning session, 2026-11-06.
- Evidence, checked 2026-11-06: [Cloud Run pricing](https://cloud.google.com/run/pricing), [maximum instances](https://docs.cloud.google.com/run/docs/configuring/max-instances), [request timeout](https://docs.cloud.google.com/run/docs/configuring/request-timeout), [Hosting with Cloud Run](https://firebase.google.com/docs/hosting/cloud-run), [spend-cap budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps).
