---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D147
---

# Link previews ship one small script

## Context and problem statement

Every phase 3 page shipped no script (specs 009–014). A hover card must close with Escape (WCAG 1.4.13), and a tap on a phone must open the card without following the link. Neither works without script.

## Considered options

The options are listed in the builder's ranked order.

1. One small first-party module, loaded only on pages with previews (recommended)
2. No script: a separate preview button per link, with the browser's popover
3. No script: the new declarative interest popovers, in Chrome and Edge only

## Decision outcome

Chosen option 1. `PreviewLink.astro` loads `previews.client.ts`, which Astro bundles as one file under `_astro/`, never inline, so the Content-Security-Policy is unchanged. With no script, or no popover support, each link is a plain link. Specs 009–014's no-script checks now allow exactly this module, and v1's pages still ship none.

### Consequences

- Good, because the cards open on hover, focus and tap, and close with Escape, in every current browser.
- Bad, because phase 3's pages now run a script of a few kilobytes.

### Confirmation

Spec 016's end-to-end tests check the one script on each page, and spec 003's static check allows it in one component only (D148).

## More information

- Decided by: Brad Thome, on the slice 3.8 session's card, 2026-11-05.
