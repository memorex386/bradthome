---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D152
---

# Contact shows in the hero and closes each page

## Context and problem statement

D29 puts contact in the first screen a recruiter sees on a phone. On `/v2` at 390 × 844 that screen ends at the hero's "Read the résumé" link. Where should brad@bradthome.com show, so it's in that screen without crowding the approved hero?

## Considered options

The options are listed in the builder's ranked order. Each also adds a "Get in touch" section at the end of `/v2` and the role pages, with the address large, a Copy button, LinkedIn, GitHub and the résumé, and a "Contact" link in the header.

1. The address itself as a mail link, beside "Read the résumé", with Copy in the end section (recommended)
2. The address and its Copy button in the hero, under the buttons
3. A quiet "Email Brad" link in the hero that jumps to the end section

## Decision outcome

Chosen option 1. The hero's quiet links read "Read the résumé" and brad@bradthome.com. A "Get in touch" section closes `/v2` and each role page, and the header's sections end with "Contact", linking to it.

### Consequences

- Good, because the address is readable and one tap away in the first screen, and the hero keeps its approved shape.
- Bad, because Copy sits at the end of the page, so a visitor who wants to copy from the first screen follows the header's link first.

### Confirmation

Spec 017's tests check the address is inside the first screen of `/v2` and each role page at 390 × 844, and the section and header link on each page.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.9 session, 2026-11-05.
