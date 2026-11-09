---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D195
---

# Sonnet 5.5 judges answers against their cited sources

## Context and problem statement

Most eval checks are deterministic: the cited source IDs, required words, banned patterns and the reply's state. One isn't: whether an answer says only what its cited sources say. That needs a second model as judge. Which one?

## Decision drivers

- A judge shouldn't be the model it grades.
- The evals workspace has $5 a month ([D169](0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Sonnet 5.5 (recommended), about $0.004 per judged answer.
2. Haiku 5.5, about $0.0005 per judged answer, grading its own kind of output.
3. No judge: deterministic checks only.

## Decision outcome

Chosen option 1, as recommended. Sonnet 5.5 sees one answer and the text of the sources it cited, never the whole corpus, and returns a verdict and one-line reason in a fixed JSON shape. It grades only answers that state facts. The judge's cost counts in the run's total, but not in the answer's cost limit.

### Consequences

- Good, because an unsupported claim worded freely is caught.
- Bad, because a judge can be wrong. Its reason is shown on `/evals`, so a wrong verdict is visible.

### Confirmation

Spec 023's tests run the judge's parsing against scripted verdicts, and the real run records each verdict and reason.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.4 session, 2026-11-09.
