---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D137
---

# The résumé PDFs' contact line

## Context and problem statement

Each résumé PDF (slice 3.7) needs contact details at the top. They're public, and the repo and the PDFs are permanent. What goes there?

## Decision drivers

- Nothing public shows a phone number or a private address (AGENTS.md's privacy rules).
- The PDF and the site say the same things.

## Considered options

Brad chose the line on 2026-11-05, before the slice's session started; the options weren't kept.

## Decision outcome

Each PDF's contact line is brad@bradthome.com, bradthome.com, linkedin.com/in/brad-thome and github.com/memorex386, with "Dallas–Fort Worth" as the location, as the hero's eyebrow has it. A PDF never shows a phone number.

### Consequences

- Good, because a recruiter can reach Brad from the PDF alone, through addresses that are already public.
- Good, because the location reads the same on the site and the PDFs.

### Confirmation

Spec 015's tests check the line in the source and in each printed PDF, and that no phone number appears in either.

## More information

- Decided by: Brad Thome, on 2026-11-05, recorded in slice 3.7.
