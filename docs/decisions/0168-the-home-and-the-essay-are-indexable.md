---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D168
---

# The home and the essay are indexable

## Context and problem statement

D135 made the home the only indexable version of the home page. The essay is indexable on v1 today. Which pages may search engines index at v2.0?

## Considered options

The options are listed in the builder's ranked order.

1. The home and the essay (recommended)
2. Only the home

## Decision outcome

Chosen option 1. The home and the essay carry no noindex, and `/sitemap.xml` lists exactly those two. The role pages, `/privacy` and `/design-system` carry noindex. `/robots.txt` allows every path and names the sitemap.

### Consequences

- Good, because the essay keeps the search presence it has.
- Bad, because the sitemap is a static file to keep in step by hand.

### Confirmation

Spec 019's S2.1–S2.3.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.11 session, 2026-11-06.
- Spec: [spec 019, the v2.0 relaunch](../../specs/019-relaunch/spec.md).
