---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D22
---

# Enforce hard rules in three layers

## Context and problem statement

**The question:** Where are the hard rules enforced?

Instructions only advise (Anthropic, VS Code). Thoughtworks rates checks that run before a commit at Trial.

## Considered options

The options are listed in the builder's ranked order.

1. All three layers (recommended, chosen)
2. CI and branch protection only
3. Agent hooks only

## Decision outcome

Chosen option: "All three layers".

**Hard rules are enforced in three layers:**
- git hooks
- Claude Code hooks
- required CI checks, with branch protection

## More information

- Decided by: Brad Thome, on the working-agreement decision page (W6).
- Evidence: [Anthropic, Claude Code best practices](https://code.claude.com/docs/en/best-practices).
- Evidence: [Thoughtworks Technology Radar, feedback sensors for coding agents](https://www.thoughtworks.com/radar/techniques/feedback-sensors-for-coding-agents).
- Later: [D45](0045-a-private-term-script-plus-a-secret-scanner.md), [D47](0047-the-repo-and-tooling-batch.md) and [D54](0054-husky-gitleaks-and-two-license-files.md) named the tools.
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
