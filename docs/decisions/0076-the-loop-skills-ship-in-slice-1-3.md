---
status: accepted
date: 2026-10-31
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D76
---

# The loop's skills ship in slice 1.3

## Context and problem statement

With Spec Kit covering the spec, plan, tasks and build stages ([D75](0075-adopt-spec-kits-skills-with-our-templates.md)), the loop still needs skills for the rest. Four stages have no close public match: decision pages, decision records, locking tests and opening pull requests. Three have MIT-licensed starting points: the interview, in Spec Kit's clarify and Matt Pocock's grilling skill; the reviewer, in Pocock's code review and Superpowers' read-only reviewer; and the retro, in Pocock's retro. The show-it skill would adapt one of Brad's own skills, which live in a private repo. Which skills ship in slice 1.3?

## Decision drivers

- Every full-track slice uses these stages, starting with slice 1.4.
- Adapted public skills keep their license notices.
- Nothing shows on screen before slice 2.1.

## Considered options

The options are listed in the builder's ranked order.

1. Every loop skill except show-it (recommended)
2. Only what this slice's checks need
3. All of them now, show-it included

## Decision outcome

Chosen option: "Every loop skill except show-it", because each later slice needs them, and show-it isn't needed before slice 2.1.

- Slice 1.3 ships interview, decision-page, record-decision, lock-tests, review, open-pr and retro, written for this repo.
- A skill adapted from a public one keeps its copyright notice and license.
- show-it, and whether to publish Brad's own skills, come with slice 2.1.

### Consequences

- Good, because from slice 1.4 on, every stage has written instructions any agent can load.
- Bad, because it makes slice 1.3 bigger.
- Neutral, because Superpowers isn't installed as a plugin, since its own workflow would compete with this loop.

### Confirmation

Spec 001's scenarios S7.1, S7.2 and S7.5.

## Pros and cons of the options

### Every loop skill except show-it

- Good, because the loop is complete for the slices before 2.1.
- Bad, because it's the most writing this slice.

### Only what this slice's checks need

- Good, because slice 1.3 stays smaller.
- Bad, because slice 1.4 runs without the other skills, and a slice has to be added to the plan for them.

### All of them now, show-it included

- Good, because it's done at once.
- Bad, because it forces the decision on Brad's own skills before any slice needs show-it.

## More information

- Decided by: Brad Thome, on the slice 1.3 decision page (Q5).
- Evidence: [Matt Pocock's skills](https://github.com/mattpocock/skills), MIT, version 1.3.2 released 2026-10-29, and [Superpowers](https://github.com/obra/superpowers), MIT, version 7.0.1 released 2026-10-21, read 2026-10-30.
- Spec: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md), Story 7.
