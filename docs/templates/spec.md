# Spec NNN: [Name]

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit
     Replace every [bracketed] note. Delete the optional sections that don't apply.
     Full track: the builder writes this after the interview and "Show it". Brad approves it at Gate 1. -->

| | |
| --- | --- |
| Track | Full |
| Status | Draft · Approved · Built · Merged |
| Branch | `NNN-short-name` |
| Mocks and flows | [link to the canvas or artifact] |
| Plan | [plan.md](plan.md) |
| Decisions | [links to records, or "none"] |

## Summary

[One paragraph: what this slice does and why. Use Brad's words where possible.]

## Scope

**In:** [what this slice delivers]

**Out:** [what it deliberately leaves out, and where that work goes]

## User stories and acceptance scenarios

### Story 1: [Title] (P1)

[The story in plain language: who wants what, and why.]

**Why this priority:** [the value, and why it comes first]

**Independent test:** [how this story can be checked on its own, and what that proves]

- **S1.1** Given [a starting state], when [an action], then [an observable result].
- **S1.2** Given [a starting state], when [an action], then [an observable result].

### Story 2: [Title] (P2)

[Same shape. Number its scenarios S2.1, S2.2.]

## Edge cases

- [What happens when …?] Covered by [S#.# or FR-###].

## Functional requirements

- **FR-001** The site MUST [a specific, checkable capability].
- **FR-002** The site MUST [a specific, checkable capability]. [NEEDS CLARIFICATION: what's still unclear]

## Success criteria

- **SC-001** [A measurable outcome that names no tools. For example: "On a mid-range phone, the page shows its main content within 2.5 seconds."]

## Mocks and flows

Optional: include this section when anything in the slice is visible.

[Link to the mocks. List the states shown, such as default, empty, loading, error, reduced motion, dark theme, phone and desktop.]

## Key entities

Optional.

- **[Entity]:** [what it represents and its key attributes, with no implementation detail]

## Assumptions

- [Reasonable defaults chosen where the request was silent.]

## Open questions

- [NEEDS CLARIFICATION: …]

This list must be empty before Gate 1.

## Decisions made while writing this spec

- Tier 1: [link to the record]
- Tier 2: [the convention applied]
- Tier 3: [the detail chosen, and why]

## Traceability

Every S, FR and SC ID above appears in at least one test's name. The traceability check fails the build if one doesn't.

## Approval

- Gate 1: approved by Brad on [date] ([link to the approval])
