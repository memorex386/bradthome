---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D166
---

# Hopper's end date goes public at v2.0

## Context and problem statement

The new site and the résumé PDFs show Hopper ending in Oct 2026 (D138), while LinkedIn still says Present. v2.0 makes that date public on bradthome.com. Go ahead as is?

## Considered options

The options are listed in the builder's ranked order.

1. Go ahead with Oct 2026 (recommended)
2. Hold the release until LinkedIn matches
3. Show Hopper as Present on the site

## Decision outcome

Chosen option 1. v2.0 ships with Hopper's Oct 2026 end date, as the content files and PDFs show it. LinkedIn is Brad's to update and isn't changed here.

### Consequences

- Good, because the site and PDFs say the same thing.
- Bad, because LinkedIn and the site differ until Brad updates LinkedIn.

### Confirmation

Specs 011, 012 and 015 already test the date.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.11 session, 2026-11-06.
- Spec: [spec 019, the v2.0 relaunch](../../specs/019-relaunch/spec.md).
