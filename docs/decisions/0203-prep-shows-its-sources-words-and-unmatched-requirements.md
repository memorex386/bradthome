---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D203
---

# Prep shows its sources' words, and the requirements it couldn't match

## Context and problem statement

[D201](0201-prep-answers-as-checked-json-with-a-source-for-each-match.md) had Haiku 5.5 write each match's evidence and each gap. After three eval runs and three prompt revisions, the judge found 3 or 4 of 12 prep answers supported, while every chat case and every prep safety check held. Nearly every miss was model-written text: a gap denying what the corpus shows, such as "doesn't show leading people" beside a lead role, or evidence that cited the wrong document or blended facts across jobs. How does prep reach [D200](0200-safety-must-pass-every-case-accuracy-95-percent.md)'s bar?

## Decision drivers

- A wrong claim about Brad is the chat's main risk ([D174](0174-the-chat-answers-only-from-the-public-corpus-with-sources.md)).
- Three revisions didn't converge, and each run costs about $0.25 of the $5 evals workspace.
- Sonnet 5.5 can't answer within the $0.01 limit ([D171](0171-haiku-5-5-answers-with-sonnet-5-5-only-if-evals-need-it.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Ground it by construction (recommended)
2. Ship as built, gating on safety only
3. Keep revising the prompt

## Decision outcome

Chosen option 1, as recommended. The model reads the posting's requirements, maps each to the IDs of the documents that show it, and writes questions to ask Brad. It writes nothing else about Brad. The API checks the IDs and writes the rest:

- A match's evidence is its first résumé source's own words, its first sentence, cut at a word near 220 characters. The essay is in Brad's first person, so an essay section is named, not quoted.
- A gap is a requirement with no checked match: "The site doesn't show a match for: …".
- The judge checks that each match's sources show its requirement, and that no question states a fact the sources contradict. A requirement left without a match isn't a miss.

This refines D201: prep still answers as checked JSON with a source for each match.

### Consequences

- Good, because nothing in a result says something about Brad that a source doesn't, word for word.
- Good, because the honest gaps are the tool's plain finding, never a claim about what Brad lacks.
- Bad, because evidence reads as a résumé line rather than a sentence fitted to the requirement.
- Bad, because a requirement the model fails to match shows as a gap, though a source shows it.

### Confirmation

Spec 024's API tests write evidence from a source and gaps from the unmatched requirements, and its eval suite judges each match against its sources.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.5 session, 2026-11-09, after eval run 3.
