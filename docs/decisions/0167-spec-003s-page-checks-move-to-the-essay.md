---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D167
---

# Spec 003's page checks move to the essay

## Context and problem statement

Spec 003's Story 1 checks the page at `/`: its words, v0's colors, no script, the Tab order and four snapshots. Since D112 that was v1's home, which v2.0 retires. Where do the checks point?

## Considered options

The options are listed in the builder's ranked order.

1. Move them to the essay, which keeps v1's layout, colors and fonts (recommended)
2. Point them at the new home
3. Retire the page-only checks

## Decision outcome

Chosen option 1. Spec 003's S1.1–S1.5, FR-005 and its 404 check read the essay at `/vindecoded-agents`, the page that keeps v1's `Base.astro` layout, tokens and fonts (D121). Specs 009–018 check the new home. The 003 baselines are remade, and spec 003 is relocked.

### Consequences

- Good, because the foundation spec 003 built stays checked on a real page.
- Good, because no check is repeated for the new home.
- Bad, because the essay's words are now checked by two specs.

### Confirmation

Spec 003's relocked tests, and spec 003's approval log.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.11 session, 2026-11-06.
- Spec: [spec 019, the v2.0 relaunch](../../specs/019-relaunch/spec.md).
