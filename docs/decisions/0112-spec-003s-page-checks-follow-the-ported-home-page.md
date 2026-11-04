---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D112
---

# Spec 003's page checks follow the ported home page

## Context and problem statement

Spec 003 built the skeleton's placeholder page ([D93](0093-the-empty-page-says-the-site-is-being-rebuilt-in-public.md)) and locked tests that check it: its line and its one link to the repo (S1.1, FR-005), that only that link takes focus (S1.4), that the first link on the page has the accent color (S1.2), and that the site's source names no host but the repo's and the site's own (FR-006). Slice 2.5 replaces the placeholder with today's home page and adds the header and footer to every page, which breaks each of those checks. How should the slice handle spec 003's locks?

## Decision drivers

- Locked tests change only with a spec change Brad approves, in the same pull request ([D101](0101-a-lighter-loop-one-session-and-two-gates.md)).
- The checks behind them still matter: the page's words, a visible focus ring, the theme's colors, and no request to another host.
- Header and project links are links a visitor chooses to follow, not requests the page makes.

## Considered options

1. Amend spec 003's scenarios and requirements in place, and relock (recommended)
2. Retire spec 003's page scenarios in favour of spec 007, and delete those tests
3. Amend the page checks, but keep FR-006 as it is by moving every outside link into content data

## Decision outcome

Chosen option: "amend spec 003 in place, and relock", because it keeps every check spec 003 makes, pointed at the real page, and keeps the request rule exactly as strict.

- S1.1 and FR-005: the page shows today's heading and line, with that line as its description, and its links (spec 007).
- S1.2: the theme check reads the link color from a link in the page's text, since the header's name is ink.
- S1.4: Tab reaches the page's links in order, starting with the header's name, and each shows a focus ring.
- FR-006: the source may also link Brad's GitHub and LinkedIn profiles and vindecoded.com. The page still requests nothing from another host (S1.3).
- `tests.lock` is rewritten for the changed files in the same pull request.

### Consequences

- Good, because no check is lost, and the request rule doesn't change.
- Bad, because spec 003's tests now name spec 007's words, so a later change to the home page's words changes a locked test too, until the phase 3 redesign replaces them.

### Confirmation

`pnpm lock --check` and CI's locked-tests job pass with the new hashes, and spec 003's amended tests pass against the built site.

## Pros and cons of the options

### Amend in place (recommended)

- Good, because every check stays and the trace stays whole.
- Bad, because spec 003 and spec 007 both check the home page.

### Retire the page scenarios

- Good, because only spec 007 checks the home page.
- Bad, because it deletes locked tests and leaves gaps in spec 003's trace.

### Links from content data

- Good, because FR-006's test doesn't change.
- Bad, because it moves the header's two links into data only to get past a check, which hides what the rule allows.
