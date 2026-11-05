---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D142
---

# The résumé PDFs list jobs newest first

## Context and problem statement

Spec 015's PDFs printed Experience in the page's order: Hopper, the featured job and the cards, then the jobs the page shows as one dated line. That put RealPage, 2018–2019, after BookShout and Bottle Rocket, which are older. A reader of a résumé expects dates in order. Brad read the PDFs on `next` and asked for date order.

## Considered options

Brad asked for this change through the career session on 2026-11-05, as a light change ([#45](https://github.com/memorex386/bradthome/issues/45)).

## Decision outcome

In the PDFs only, Experience lists every job newest first by start date: Hopper, Bleacher Report, RealPage, BookShout, Bottle Rocket, then the enterprise IT years. The jobs the page shows as one dated line print as a heading with no bullets. The pages keep their order from D134 and spec 012.

### Consequences

- Good, because the PDF reads as a dated résumé, with no gaps out of order.
- Bad, because the PDF's job order no longer matches the page's, though its claims still do.

### Confirmation

Spec 015's tests check the order in the résumé model and in each printed PDF.

## More information

- Decided by: Brad Thome, through the career session, 2026-11-05.
