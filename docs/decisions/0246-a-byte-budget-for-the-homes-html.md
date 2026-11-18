---
status: accepted
date: 2026-11-18
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D246
---

# A 14,000-byte brotli budget for the home's HTML

## Context and problem statement

Under D245 the home leaves the server as 13,116 bytes with brotli, about 1.5 KB under the first round trip. Specs 041 and 042 each added about 1 KB gzipped, and the first anyone knew of 041's was a red Lighthouse job on main. Should a fast test say when the home's HTML is too big?

## Decision drivers

- A slice that grows the page should find out from a fast test, before Lighthouse goes red.
- The budget must leave room for HTTP's headers inside the first round trip.

## Considered options

1. Yes: 14,000 bytes with brotli, for the home (recommended)
2. No byte budget: Lighthouse's LCP budget alone

## Decision outcome

Chosen option 1, on Brad's card in spec 043's session, 2026-11-18. A test builds the site, compresses the home's `index.html` with brotli at its highest quality, and fails over 14,000 bytes, with the size, the budget and the fix. Moving the budget is Brad's call.

### Consequences

- Good, because the next slice that grows the home sees it in its own tests, with the size in the message.
- Good, because 14,000 bytes is about 0.6 KB under the first round trip, room for the headers.
- Bad, because the tests build the site once more.
- Neutral, because the role pages, at 13.4–13.7 KB on 2026-11-18, aren't budgeted, since Lighthouse doesn't load them.

### Confirmation

`tests/043/integration/budget.test.ts`.

## More information

- Evidence: spec 043's plan, 2026-11-18.
- Decided by: Brad Thome, on the session's card in spec 043.
