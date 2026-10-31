---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D21
---

# Lock tests written from approved scenarios

## Context and problem statement

**The question:** How are tests controlled?

Principle 8. 2026 evidence showed agents faking TDD's failing step, at 3–8.5× the tokens, with no clear quality gain. Freezing approved scenarios works.

## Considered options

The options are listed in the builder's ranked order.

1. Approved scenarios, locked tests (recommended, chosen)
2. Brad also approves the test code
3. Strict TDD everywhere
4. Tests after code

## Decision outcome

Chosen option: "Approved scenarios, locked tests".

**Tests are written from approved scenarios and then locked.**
- Brad approves the scenarios.
- Tests are written from them before code, checked for coverage, then locked by a hook and a CI check.
- Changing a locked test takes a spec change Brad approves.
- Mutation testing is a measured signal until there's a baseline.
- No strict TDD rule.

## More information

- Decided by: Brad Thome, on the working-agreement decision page (W5).
- Evidence: [Birgitta Böckeler, TDD in the agent loop](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
