---
status: accepted
date: 2026-11-12
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D224
---

# The tiles' years count themselves, from the months the claims give

## Context and problem statement

The role tiles ([D223](0223-the-role-tiles-are-the-switch.md)) show Brad's years of mobile and full-stack work. A fixed figure goes stale, and a rounded one overstates. How should the years be counted and kept true, and where do their start months come from?

## Decision drivers

- Every figure rests on a public claim, and a claim never carries a count that goes stale.
- The number is in the page with no script and for crawlers, and grows without a release.
- The one module stays small ([D147](0147-link-previews-ship-one-small-script.md)), with no scroll handler, and the CSP doesn't change.

## Considered options

1. Exact whole years with a "+", counted in whole months from each start month: built for the build's month and counted again in the one module from the visitor's clock, never lower than the built count (recommended)
2. The same, counted only in the browser
3. A fixed figure in each release

## Decision outcome

Chosen option 1, on Brad's cards of 2026-11-12 and at spec 036's Gate 1.

- Mobile counts from May 2015 and full-stack from Sep 2016: 11+ and 10+ in Nov 2026. Mobile turns 12+ in May 2027, and full-stack 11+ in Sep 2027. A count is the whole months since the start, over 12, rounded down.
- The build writes each count for its own month in Dallas–Fort Worth's time, as spec 033's counts are dated, with its start month in `data-since`. `years.client.ts` in the one module counts again from the visitor's clock and only ever raises a figure, so a clock behind the build never lowers it. On Brad's Gate 1 card the module may grow by at most 384 bytes; the years measured 331, and the slice 357 in all.
- The start months are two public claims, in the words Brad approved on the Gate 1 cards. Each carries its start month and no count; the mobile claim leads with the jobs, with VINDecoded on the side. The build fails if a tile's first claim stops saying its start month.
- The notes' "Years of experience" heading gets a subject of its own, `content/career/years-of-experience.yaml`, in a new hand-written `career` folder beside `education`, so `pnpm content:export` writes the claims as `years-of-experience-1` and `-2`. The corpus labels them "Résumé · Years of experience" and links each to its tile.
- Applied AI has no start month in the record, so its tile says "Founding", as before.

### Consequences

- Good, because the figures stay true for years with no release, and never round up.
- Good, because the number is in the HTML, and a test checks every month to 2040.
- Bad, because the tiles' bars and the detail's timeline are drawn for the build's month, so a snapshot holds them to one day.
- Bad, because the content model has one more folder for the export and the corpus to read.

### Confirmation

Spec 036's unit tests count every month from each start to Dec 2040, the anniversaries and a clock behind the build; its browser tests read the built HTML and the page under set clocks, and measure the module.

## More information

- Decided by: Brad Thome, on the hero study's cards (2026-11-12) and at spec 036's Gate 1 (2026-11-12).
- Spec: [spec 036](../../specs/036-hero-tiles/spec.md).
