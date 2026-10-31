---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D20
---

# Acceptance criteria in Spec Kit's format

## Context and problem statement

**The question:** How do we write acceptance criteria?

Principle 2. Spec Kit is the only toolkit that prescribes a format, and none of them enforce traceability, so we add the check ourselves.

## Considered options

The options are listed in the builder's ranked order.

1. Spec Kit's format, traced to tests (recommended, chosen)
2. EARS requirements
3. Executable Gherkin

## Decision outcome

Chosen option: "Spec Kit's format, traced to tests".

**Acceptance criteria use Spec Kit's format:**
- prioritized user stories
- Given/When/Then scenarios
- FR-### requirements written with MUST
- measurable SC-### success criteria
- [NEEDS CLARIFICATION] markers

Every ID is traced to a test, and a CI check fails otherwise.

## More information

- Decided by: Brad Thome, on the working-agreement decision page (W4).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
