---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D162
---

# The new home moves to / and /v2 redirects there

## Context and problem statement

Phase 3's home grew at `/v2`, off live (D127), while `/` served v1's one-card home. At v2.0 the new home becomes the site's home. What happens to `/v2`, and to v1's home?

## Considered options

The options are listed in the builder's ranked order.

1. `/` serves the new home, and `/v2` redirects to `/` with a 301 (recommended)
2. `/v2` is removed and answers 404
3. `/v2` keeps serving the page, with a canonical link to `/`

## Decision outcome

Chosen option 1. `pages/index.astro` renders the new home and v1's home template is retired. `firebase.json` redirects `/v2` to `/` with a 301, and every link that named `/v2` names `/`.

### Consequences

- Good, because a shared `/v2` link from a preview or `next` still lands on the home.
- Good, because one page is the home, with no copy to keep in step.
- Bad, because the redirect stays in `firebase.json` until it's no longer needed.

### Confirmation

Spec 019's S1.1–S1.4 check the home, the build and the 301.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.11 session, 2026-11-06.
- Spec: [spec 019, the v2.0 relaunch](../../specs/019-relaunch/spec.md).
