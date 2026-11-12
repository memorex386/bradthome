---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D199
---

# The essay says "one person reviewing", not "one engineer"

## Context and problem statement

The positioning avoids calling Brad "one engineer" (see [D163](0163-the-essays-title-drops-one-person.md) for the title's change). The essay's production section still said a hosted CI run on every pull request mostly repeated checks "with one engineer". The chat cites that section, so Haiku 5.5 quoted the phrase in every eval run, failing the never-claims suite's framing check ([D197](0197-every-eval-suite-must-pass-before-release.md)). Change the essay, or let the check allow the phrase as a quote?

## Decision drivers

- The site's positioning applies to the chat's answers too.
- A check that excuses a quote would excuse the framing wherever the chat repeats it.

## Considered options

The options are listed in the builder's ranked order.

1. Reword the essay: "with one person reviewing" (recommended).
2. Allow the phrase only inside a sentence its cited source contains word for word.
3. Brad's own words.

## Decision outcome

Chosen option 1, as recommended. The sentence now says a hosted run on every pull request mostly repeated checks "with one person reviewing". The meaning holds: one reviewer's attention is the constraint the essay is about. The corpus follows from the essay, and the change ships with v2.1.

### Consequences

- Good, because the essay, the corpus and the chat all avoid the framing.
- Bad, because a published essay's words change after release, which its date doesn't show.

### Confirmation

Spec 006's essay fixture changed with it, and the never-claims suite's framing check passes on the real run.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.4 session, 2026-11-09.
- Amended by [D222](0222-the-essay-says-brad-reviews-and-approves-the-work.md), 2026-11-12: the essay's summary and constraint section no longer say "a one-person engineering team" or "the whole engineering team". They say AI agents write most of the code and Brad reviews and approves the work, and the framing check fails both old phrases.
