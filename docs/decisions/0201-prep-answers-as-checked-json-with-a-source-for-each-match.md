---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D201
---

# Prep answers as checked JSON, with a source for each match

## Context and problem statement

Interview prep turns a job posting into the fit with evidence, honest gaps and questions to ask Brad ([D176](0176-interview-prep-ships-as-designed-and-never-stores-a-posting.md)). The prep designs show each match with its own source, and a "working through it" state while the answer is made. The chat cites its sources through Anthropic's citations ([D174](0174-the-chat-answers-only-from-the-public-corpus-with-sources.md)), but citations can't be combined with structured output. How does the API build prep's answer?

## Decision drivers

- Each match must show the evidence it rests on, as designed.
- Every source an answer names must be checked in code against the corpus (D174).
- The progress state should show real progress, not a timer.

## Considered options

The options are listed in the builder's ranked order.

1. Structured output, with source IDs the API checks (recommended)
2. Cited text in headed sections, split by the window

## Decision outcome

Chosen option 1, as recommended. Haiku 5.5 returns prep's answer as JSON in a fixed schema: the role, its requirements, the matches with the corpus IDs each rests on, the gaps, and the questions to ask Brad. The API streams the partial answer, so the window shows each step as it fills, then checks the whole: an ID not in the corpus is dropped, a match left with no ID is dropped, and every string passes the pronoun rewriter. Only the checked answer is shown as the result.

### Consequences

- Good, because each match links to its own sources, each one checked.
- Good, because the progress state comes from the answer as it's written.
- Bad, because the model writes the IDs itself, rather than Anthropic's citations tying them to quoted text, so the evals' judge has to grade each match against its sources.
- Bad, because prep's prompt differs from the chat's, so it has its own cache.

### Confirmation

Spec 024's API tests drop an unknown ID and a match left with none, and its eval suite grades each match against its sources.

## Pros and cons of the options

### Checked JSON

- Good, because it draws the designs' sections without parsing prose.

### Cited text

- Good, because it uses the same citations as the chat.
- Bad, because the sources come back as one list for the whole answer, so a match can't show its own.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.5 session, 2026-11-09.
