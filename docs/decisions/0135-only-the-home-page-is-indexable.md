---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D135
---

# Only the home page is indexable

## Context and problem statement

The role pages show the home's words in another order. Once v2 is live, a search engine could index four near-copies of one page. How should search engines treat them?

## Decision drivers

- One page should rank for Brad's name, and the role pages are for links Brad sends.
- Previews and `next` already send noindex for every page (D91, D119).

## Considered options

The options are listed in the builder's ranked order.

1. Role pages carry a noindex tag and a canonical link to themselves; only the home is indexable (recommended)
2. Role pages point their canonical link at the home and stay indexable

## Decision outcome

Chosen option 1. /mobile, /fullstack and /ai each carry `<meta name="robots" content="noindex">` and a canonical link to their own address on bradthome.com. The home carries no noindex tag and a canonical link to `https://bradthome.com/`, where it lives from v2.0. The titles are "Brad Thome · Mobile engineer", "Brad Thome · Full-stack engineer" and "Brad Thome · Applied AI".

### Consequences

- Good, because search shows one page, and no signal is mixed: a noindexed page doesn't claim another page's content.
- Bad, because a role page found only through search can't be, which is fine for links Brad sends.

### Confirmation

Spec 014's tests check each page's title, robots tag and canonical link.

## More information

- Decided by: Brad Thome, on the slice 3.6 session's card, 2026-11-05.
