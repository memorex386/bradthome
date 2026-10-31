---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D17
---

# Use Anthropic's Claude Code loop as the backbone

## Context and problem statement

**The question:** Which named method is our backbone?

Claude ranked Spec Kit first, for recognition. Brad chose Claude Code's own loop, trusting the vendors' guidance while keeping control of the outcome.

Brad also asked whether to add acceptance criteria to the loop. Yes: Anthropic's loop doesn't prescribe a spec format, so [D20](0020-acceptance-criteria-in-spec-kits-format.md) fills that gap. Brad's control comes from the approved spec, locked tests and his gates ([D21](0021-lock-tests-written-from-approved-scenarios.md), [D23](0023-brad-approves-the-constitution-specs-plans-and-merges.md)).

Codex and GitHub guidance describe the same loop.

## Considered options

The options are listed in the builder's ranked order.

1. Spec Kit, adapted (recommended)
2. OpenSpec
3. Claude Code's own loop (chosen)
4. Kiro-style specs

## Decision outcome

Chosen option: "Claude Code's own loop".

**The backbone is Anthropic's recommended Claude Code loop.** The steps: interview → spec → build in a fresh session → a pass/fail check → a reviewer subagent → a person approves.

Acceptance criteria are added in Spec Kit's format ([D20](0020-acceptance-criteria-in-spec-kits-format.md)). Specs and plans live in the repo. AGENTS.md stays the source of truth, so other agents can follow the same loop.

## More information

- Decided by: Brad Thome, on the working-agreement decision page (W1).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
