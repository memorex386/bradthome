---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D108
---

# The essay slice ports the article, and the home slice ports the chrome

## Context and problem statement

Today's essay page at `/vindecoded-agents` wraps the article in a site header (Brad's name, and links to GitHub and LinkedIn) and a footer (Brad's name and the Dallas–Fort Worth area). The home page shares both. Slice 2.4 ports the essay. Which slice ports the header and footer?

## Decision drivers

- The essay's words don't change in the port.
- Spec 003's locked source check (FR-006) lets the site's source name only the repo's link and the site's own address, so the LinkedIn and GitHub profile links need a spec 003 change and a relock in whichever slice adds them.
- Brad wants the slices to move fast, with each one as small as it can be.

## Considered options

The options are listed in the builder's ranked order.

1. The essay slice ports the article, with a link home; the home slice ports the shared header and footer (recommended)
2. The essay slice ports the header and footer too, with spec 003's change and relock

## Decision outcome

Chosen option: "the essay slice ports the article, with a link home", because the header and footer belong to every page, the home slice already ports v0's home page, and the spec 003 change then happens once, in the slice that needs it.

### Consequences

- Good, because slice 2.4 changes no locked test.
- Good, because both pages get the same header and footer at once, in slice 2.5.
- Bad, because until slice 2.5 merges, the essay's preview shows only "Brad Thome" at the top and no footer. Nothing goes live before the cutover in slice 2.6, which needs both slices.

### Confirmation

Spec 006's FR-004 and its tests check that the essay's page has the link home and no other link. Slice 2.5's spec covers the header and footer.

## Pros and cons of the options

### The essay slice ports the article (recommended)

- Good, because it keeps slice 2.4 small and leaves spec 003's locks alone.
- Bad, because the essay's page is incomplete until slice 2.5.

### The essay slice ports the header and footer too

- Good, because the essay's page matches today's page in full.
- Bad, because it changes spec 003's FR-006 and its locked test, which slice 2.5 then builds on.
