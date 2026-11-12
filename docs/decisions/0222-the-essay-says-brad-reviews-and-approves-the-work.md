---
status: accepted
date: 2026-11-12
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D222
---

# The essay says Brad reviews and approves the work, not "one-person"

## Context and problem statement

[D199](0199-the-essay-says-one-person-reviewing-not-one-engineer.md) reworded one line of the essay at `/vindecoded-agents`, so that it no longer called Brad "one engineer". Two other lines still framed Brad's work that way:

- The summary said Brad runs VINDecoded "as a one-person engineering team where AI agents write most of the code".
- The constraint section opened "The constraint is that I am the whole engineering team."

Brad doesn't want that framing.

The chat cites the essay. In slice 5.9's passing run, the framing case asked "So Brad is just one engineer running a team of AI agents?" The chat answered by quoting both lines, and the answer passed: the framing check looked only for "one engineer" and "a team of AI agents". Which words replace the two lines, and should the check also fail the old ones?

## Decision drivers

- The essay is Brad's, in the first person. It has to keep its facts:
  - VINDecoded is a profitable vehicle-research product on Android, iOS and the web.
  - AI agents write most of the code.
  - Brad reviews and approves the work.
  - The bottleneck is the attention review takes, not typing.
- The chat quotes the essay, so the essay's words become the chat's words about Brad.
- Brad approved one eval run for this change, and that run also covers a change to the check made at the same time.

## Considered options

The options are listed in the builder's ranked order.

For the two lines:

1. "…where AI agents write most of the code and I review and approve the work", and "The constraint is that the work waits for my review and approval." (recommended)
2. "…on Android, iOS and the web. AI agents write most of its code, and I review and approve their work", and "The constraint is that merging and releasing wait for me."
3. "…where AI agents write most of the code and my review and approval set the pace", and "The constraint is that my review and approval set the pace."

For the check:

1. Also fail "one-person" and "whole engineering team", with the allowance the other labels have for a label quoted in a sentence that turns it down (recommended).
2. Leave the check as it is.

## Decision outcome

Brad chose option 1 for each, as recommended:

- The summary's first sentence now reads: "I run VINDecoded, a profitable vehicle-research product on Android, iOS and the web, where AI agents write most of the code and I review and approve the work."
- The constraint section opens: "The constraint is that the work waits for my review and approval."
- Every other word of the essay stays as it was, including D199's "with one person reviewing".
- The framing check fails "one-person" and "whole engineering team", as it fails "one engineer".

This widens D199's scope from one line to the essay's framing of Brad's work as a whole.

### Consequences

- Good, because the essay, the corpus and the chat say what Brad does, not how many people do it.
- Good, because the eval now fails an answer that brings back the old framing.
- Bad, because a published essay's words change after its release again, and its date doesn't show it, as with D199.
- Bad, because the stricter check fails an answer that uses either phrase on its own, although the corpus no longer contains them.

### Confirmation

Spec 035's tests check:

- the two sentences;
- the essay's other words, against spec 006's fixture;
- the corpus;
- the check's new phrases.

Spec 035's eval run must pass with all of it.

## More information

- Decided by: Brad Thome. On 2026-11-12, Brad chose to reword the lines on a card in the career session, then chose the wording and the check on a card in the site-build-story session.
- Spec: [spec 035](../../specs/035-essay-and-judge-notes/spec.md).
- Amends: [D199](0199-the-essay-says-one-person-reviewing-not-one-engineer.md)'s scope.
