---
status: accepted
date: 2026-11-17
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D243
---

# Interview prep shows a fixed card of Brad's wants, with no verdict

## Context and problem statement

Interview prep (spec 024) maps a pasted posting to Brad's public facts, with matches in the sources' own words, gaps and questions, and nothing about Brad in the model's words (D201–D203). Brad chose, on 2026-11-17, that the lines of "What I'm looking for" (D241) show in prep too. How do they show without the model wording them, choosing them, or turning them into a verdict on the role?

## Decision drivers

- No model writes, picks or judges anything about Brad in prep (D203).
- A want is never a match's evidence: it says what Brad wants, not what Brad has done.
- The card never says "fit" or "not a fit"; the interviewer reads the lines beside the result.

## Considered options

1. A fixed card after the result: Role, Team and How I build, then the track the role's title names in code, or all three (recommended)
2. The same card, always with all three tracks
3. The model picks the track, or says how the role matches Brad's wants

## Decision outcome

Chosen option 1, on spec 042's Gate 1 card ("Title-word rule").

- After an answered or no-match result's sections, before its actions, a card "What Brad is looking for" shows the Role, Team and How I build lines, then the track's line, and "In Brad's words, from the site's What I'm looking for", linking `/#looking-for`. Nothing shows for "not a posting", an error, the limit, or while working.
- The track comes from the role's title, in code: one track when the title names that track's words alone (mobile, Android, iOS, Kotlin, Swift, SwiftUI, Jetpack Compose, React Native, Flutter, KMP or Multiplatform; full-stack, front-end, web, React, TypeScript, JavaScript or Node; AI, ML, LLM, GenAI, machine learning, artificial intelligence, agent or agentic), and all three otherwise. "React Native" is mobile's alone.
- The page hands the lines over in the dialog's `data-wants`, which the window's own chunk reads, so the one module gains nothing and no request is made.
- Prep's prompt leaves the wants out of its documents, and the API drops a cited want like an unknown ID, so a want is never a match.

### Consequences

- Good, because an interviewer sees what Brad wants beside what Brad has shown, in Brad's words, with no verdict.
- Good, because the rule is plain to read and test, and no model call is added.
- Bad, because a title that names two tracks, or none, shows all three lines, so the card is longer then.
- Bad, because the rule reads only the title's words: a posting titled "Software Engineer" for a mobile team shows all three.

### Confirmation

Spec 042's tests check the card's lines and order for an AI posting and a named Android role, the rule's table, the states with no card, a cited want dropped, and the wants left out of prep's documents.

## Pros and cons of the options

### The title-word rule

- Good, because it shows the one line that matters when the title says it.

### Always all three

- Good, because there's no rule to get wrong.
- Bad, because it's longer every time.

### The model chooses or compares

- Bad, because it breaks D203: the model would pick or word something about Brad.

## More information

- Spec: [spec 042](../../specs/042-looking-for/spec.md), slice 5.15.
- Amends: spec 024's prep view and documents; builds on D201–D203.
- Related: [D241](0241-what-im-looking-for-as-a-fit-list.md), [D242](0242-a-want-source-kind-and-rule-11.md).
