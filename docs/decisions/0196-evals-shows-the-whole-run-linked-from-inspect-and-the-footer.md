---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D196
---

# /evals shows the whole run, linked from Inspect and the footer

## Context and problem statement

Each eval run writes results JSON to the repo, and a public `/evals` page is built from it. What does the page show, and where is it linked?

## Decision drivers

- A visitor can see how the chat is tested, with the real run, its date, model and cost.
- Nothing private is shown. The cases test categories and patterns, never a private detail.

## Considered options

The options are listed in the builder's ranked order.

1. Everything, linked from the chat's Inspect panel and the footer (recommended).
2. Everything, linked from Inspect only.
3. Verdicts only, without the answers.

## Decision outcome

Chosen option 1, as recommended. `/evals` shows the run's date, model, judge, total cost, the corpus it ran on and each suite's pass rate, then each case: its question, the answer, its sources, each check's result, its cost and its time. Inspect and the footer link to it.

### Consequences

- Good, because the evidence behind the chat is public, as the rest of the site's is.
- Bad, because the injection cases are public too. They're common patterns, and the chat's defenses don't depend on them being secret.

### Confirmation

Spec 023's tests build the page from a fixture and the real results, check the links, and scan the built page for private terms.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.4 session, 2026-11-09.
