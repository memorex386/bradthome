---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D140
---

# The résumé PDFs' file names

## Context and problem statement

The three PDFs need public addresses, and a downloaded PDF keeps its file name. What are they called?

## Considered options

The options are listed in the builder's ranked order.

1. `/resume/brad-thome-mobile.pdf`, `/resume/brad-thome-full-stack.pdf` and `/resume/brad-thome-applied-ai.pdf` (recommended)
2. `/resume/mobile.pdf`, `/resume/fullstack.pdf` and `/resume/ai.pdf`

## Decision outcome

Chosen option 1. A saved file names Brad and the role.

### Consequences

- Good, because a recruiter's downloads folder says whose résumé it is and for which role.
- Bad, because the addresses are longer than the role pages'.

### Confirmation

Spec 015's tests check the names and each page's link.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.7 session, 2026-11-05.
