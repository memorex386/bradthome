---
status: accepted
date: 2026-11-10
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D210
---

# The footer links the public repo

## Context and problem statement

The home page's footer said "The redesign, in progress.", which stopped being true once v2.0 shipped. The site is built in public, with its specs, tests and decisions in its repo (D9), and the landing study's default was a footer that says so (T6). What should the home and role pages' footer say?

## Decision drivers

- Every sentence is a public claim or an existing label.
- The footer keeps "How the chat is tested" (D196) and "Privacy" (spec 018).

## Considered options

The options are listed in the builder's ranked order.

1. "Built in the open: specs, tests and decisions on GitHub", linking the repo, on the home and role pages (recommended)
2. The same line on every page, in place of each page's note
3. "The redesign, in progress.", as it was

## Decision outcome

Chosen option 1. The study stated it as a default on 2026-11-09, Brad didn't object, and on spec 027's Gate 1 card (2026-11-10) Brad picked the home and role pages only. The last six words link `https://github.com/memorex386/bradthome`, and "How the chat is tested" and "Privacy" follow. The footer takes a `built` prop for it, and the evals, privacy and gallery pages keep their own notes.

### Consequences

- Good, because a visitor can go from the page to the record of how it was built.
- Bad, because the line is longer than the note it replaces, and wraps on a phone.

### Confirmation

Spec 027's tests read the footer's words, link, targets and contrast on `/` and each role page, and check that the other pages keep their notes.

## More information

- Decided by: Brad Thome, at spec 027's Gate 1 (2026-11-10).
- Builds on [D9](0009-the-site-repo-is-the-public-portfolio.md) and [D196](0196-evals-shows-the-whole-run-linked-from-inspect-and-the-footer.md).
