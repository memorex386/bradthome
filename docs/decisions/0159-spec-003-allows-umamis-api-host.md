---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D159
---

# Spec 003 allows Umami's API host

## Context and problem statement

Spec 003's locked policy has no `connect-src`, so `default-src 'self'` blocks the sender's requests to Umami (D155). A locked test changes only with its spec, by Brad's choice.

## Considered options

The options are listed in the builder's ranked order.

1. Amend FR-006, FR-019 and S4.1 to add exactly `connect-src 'self' https://gateway.umami.is`, and relock spec 003 (recommended)
2. Keep spec 003, and send nothing

## Decision outcome

Chosen option 1. `scripts/site/csp.ts` writes the fixed directive, `tests/003/` checks the exact value, and spec 003 is relocked in spec 018's pull request.

### Consequences

- Good, because the policy names one outside host, for requests only; no outside script, style, image or frame is allowed.
- Bad, because every page, v1's included, may now send a request to that host, though only the phase 3 module does.

### Confirmation

`pnpm lock --check` passes on spec 003, and its tests check `connect-src` in every CI run.

## More information

- Decided by: Brad Thome, approving spec 018 at Gate 1 on the slice 3.10 session's card, 2026-11-05.
