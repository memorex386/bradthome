---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D155
---

# Analytics send from the site's one module

## Context and problem statement

Slice 3.10 counts page views and the charter's three visitor measures with Umami Cloud (D40). Umami's standard snippet loads its tracker from `cloud.umami.is` and posts to `gateway.umami.is`, and spec 003's locked Content-Security-Policy allows neither.

## Considered options

The options are listed in the builder's ranked order.

1. The site's own sender, in its one module, posting to Umami's documented collection API (recommended, chosen)
2. Umami's tracker, copied into the site and pinned
3. Umami's tracker, loaded from Umami's host

## Decision outcome

Chosen option 1. About 60 lines in `components/analytics/analytics.client.ts`, bundled into the one module `PreviewLink.astro` loads (D147), post each page view and event to `https://gateway.umami.is/api/send`. The policy gains that one host, in `connect-src` only (D159), and `script-src` doesn't change.

### Consequences

- Good, because no third-party code runs on the page, and the site decides exactly what's sent: no query string, no hash, and only the referrer's origin.
- Good, because spec 003's one-script check doesn't change.
- Bad, because the site keeps its own small client for Umami's API, instead of Umami's maintained tracker. Umami's API docs are the contract, and the tests' fake follows them.

### Confirmation

Spec 018's end-to-end tests record every request against a fake Umami, and its static test checks the module's import.

## More information

- Decided by: Brad Thome, on the slice 3.10 session's card, 2026-11-05.
- This is a strong reason to differ from Umami's standard snippet, as D50 asks: the narrowest policy, and a payload the privacy note can state exactly.
