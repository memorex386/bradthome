---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D141
---

# The home opens the full-stack résumé PDF

## Context and problem statement

D6 has each role page offer its matching PDF, and D136 kept the hero's "Read the résumé" on LinkedIn until slice 3.7. The role pages now open their own PDFs. Which one does the home, `/v2`, open?

## Considered options

The options are listed in the builder's ranked order.

1. The full-stack PDF, whose Hopper order is closest to the home's (recommended)
2. The mobile PDF
3. The applied AI PDF

## Decision outcome

Chosen option 1. `/v2`'s "Read the résumé" opens `/resume/brad-thome-full-stack.pdf`, and each role page's opens its own. This replaces D136.

### Consequences

- Good, because every page's résumé link stays on the site, and the home's matches its "mobile & full-stack" eyebrow.

### Confirmation

Spec 015's tests, and specs 010 and 014's, check the link on every page.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.7 session, 2026-11-05.
