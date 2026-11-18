---
status: accepted
date: 2026-11-18
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D245
---

# Lighthouse CI serves the build as Firebase Hosting serves it

## Context and problem statement

Spec 041 took the home's gzipped HTML past the roughly 14.6 KB that the first network round trip carries, and Brad raised spec 003's phone LCP budget to 2.1 s until a later slice won the 2.0 s back (D30's note). Measured on 2026-11-18 on main `b7b5cc4`, Lighthouse CI's own static server compresses only with gzip, so the home leaves it as about 16.6 KB and LCP is 2.03 s, while bradthome.com serves Chrome the same page with brotli as 13,099 bytes. Served with brotli, the unchanged build measures 1.94–1.95 s. Should the budget be met by changing the page, or by measuring the page as visitors get it?

## Decision drivers

- The budget should measure the page visitors get, so a red job means a slower page.
- No change to the page's words, sparkles (D230) or motion for a measurement's sake.
- Room for the next content slice.

## Considered options

1. Measure as Firebase serves: Lighthouse CI loads the build from a server in the repo that compresses as Firebase Hosting does (recommended)
2. Slim the HTML under gzip's first round trip
3. Both

## Decision outcome

Chosen option 1, on Brad's card in spec 043's session, 2026-11-18.

- `scripts/site/serve.ts` serves `apps/site/dist` with brotli at its highest quality to requests that accept it, gzip to those that accept only gzip, and fonts and images as built, as bradthome.com does.
- `lighthouserc.json` starts it through Lighthouse CI's start command, and the LCP budget is 2.0 s again.
- The Firebase emulator stays the e2e tests' server; it serves brotli at a lower quality (15,766 bytes for the home), so it isn't Lighthouse's.

### Consequences

- Good, because the budget measures what a phone gets from bradthome.com: 13,116 bytes against production's 13,099.
- Good, because the page doesn't change.
- Bad, because brotli leaves about 1.5 KB before the HTML misses the first round trip again; D246's budget says when.
- Bad, because the server is one more file to keep in step with Firebase, should Firebase change how it compresses.

### Confirmation

Spec 043's tests check the server's encodings and paths, the config's start command, URLs and budget, and that its brotli matches; main's lighthouse job after the push is the measured evidence.

## Pros and cons of the options

### Measure as Firebase serves

- Good, because it's faithful and changes nothing a visitor sees.
- Bad, because it leaves the HTML's growth to D246's budget.

### Slim the HTML under gzip

- Good, because the page gets lighter for every server.
- Bad, because about 2.3 KB of trims for a 2.1 KB gap changes the sparkles' markup and spec 039's diagrams, and the next section undoes it.

### Both

- Good, because it leaves the most room.
- Bad, because the trims buy no LCP under brotli, only bytes, for the most change.

## More information

- Evidence: spec 043's plan, "Measured before the build", 2026-11-18.
- Decided by: Brad Thome, on the session's card in spec 043.
- Amends D30's note of 2026-11-17: the phone LCP budget is 2.0 s again.
