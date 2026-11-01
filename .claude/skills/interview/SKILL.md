---
name: interview
description: Interview Brad until a full-track spec can be written, the first stage of the loop. Use when a new feature or slice starts, or a spec still has open questions. Tier-1 questions go to Brad one at a time on a decision page, never in chat.
---

# Interview

Stage 1 of the full track in [docs/working-agreement.md](../../../docs/working-agreement.md). Keep asking until you could write `specs/NNN-name/spec.md` without guessing. Adapted from Matt Pocock's grilling skill and Spec Kit's clarify command; see [LICENSE](LICENSE).

## Map the decisions as a tree

Every decision branches into the ones that hang off it. Work the tree in rounds. The frontier is every decision whose prerequisites are settled, so it can be asked now without guessing at an answer you haven't heard. A question that depends on another one still open waits for a later round. Each round's answers move the frontier out; recompute it and ask the next round.

Check each area of the slice for gaps, and mark it clear, partial or missing:

- scope and non-goals, and who the change is for
- the data, its states and how they change
- each flow, with its error, empty and loading states
- performance, privacy, security and accessibility targets
- outside services and how they fail
- edge cases and failure handling
- constraints and trade-offs already decided elsewhere
- terms, and the one name each thing goes by
- how done is measured: scenarios that pass or fail

Skip anything that wouldn't change what's built or how it's tested.

## Facts are yours, decisions are Brad's

Never ask Brad for something you can look up in the repo, the docs, the tools or the web. Look it up first, and say what you found. When a lookup is slow, ask the rest of the frontier while it runs.

Sort every question by tier ([D28](../../../docs/decisions/0028-every-decision-goes-on-a-decision-page.md)):

- **Tier 1, Brad's:** scope, principles, architecture, anything public, money and privacy. One at a time, on a decision page. Use the decision-page skill.
- **Tier 2, conventions:** in one batch, on a decision page.
- **Tier 3, details inside an approved spec:** decide them yourself, and list them in the spec and the pull request.

Each question gives the context, two to four ranked options with what each leads to, and your recommendation first. Word it so it reads on its own on a phone.

## Done

The interview is done when the frontier is empty: every branch visited and nothing silently assumed. Then:

1. Record each tier-1 and tier-2 answer with the record-decision skill.
2. Write the spec from [docs/templates/spec.md](../../../docs/templates/spec.md). Anything still open stays marked `[NEEDS CLARIFICATION: …]`.
3. For anything a person sees, or any flow with more than one step, make the "Show it" mocks before Gate 1.

Don't build anything until Brad approves the spec at Gate 1.

## Privacy

Brad's notes are private. Paraphrase them; never quote them ([D68](../../../docs/decisions/0068-paraphrase-brads-notes-in-public-records.md)). Never put a private term, a personal detail or a machine path in a question, a page or a record.
