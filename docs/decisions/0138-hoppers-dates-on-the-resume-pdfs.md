---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D138
---

# Hopper's dates on the résumé PDFs

## Context and problem statement

D67 made Hopper's end date public, and the site shows Hopper as Apr 2022 – Oct 2026. Which dates do the résumé PDFs show?

## Considered options

Brad chose on 2026-11-05, before the slice's session started; the options weren't kept.

## Decision outcome

The PDFs show Hopper as Apr 2022 – Oct 2026, the same as the site, so the site and the PDFs never disagree. Brad's LinkedIn profile is outside the repo and stays as it is.

### Consequences

- Good, because the PDFs read their dates from the same job file as the site.

### Confirmation

Spec 015's tests check Hopper's dates in the résumé model and in each printed PDF.

## More information

- Decided by: Brad Thome, on 2026-11-05, recorded in slice 3.7.
