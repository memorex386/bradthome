---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D47
---

# The repo and tooling batch

## Context and problem statement

**The question:** Approve the repo and tooling batch

Tier-2 batch. Follow-up F4 proposes husky instead of lefthook.

## Considered options

The options are listed in the builder's ranked order.

1. Approve all (recommended, chosen)
2. Approve all except the ones I name below
3. Discuss each one

## Decision outcome

Chosen option: "Approve all".

The repo and tooling batch (R13) is approved:
- Main's ruleset: PRs only, squash merges, linear history, signed commits, required checks, no force pushes or deletions, no bypass, and one required approval ([D43](0043-a-separate-github-account-for-the-agent.md)).
- Secret scanning and push protection on.
- Dependabot, never auto-merged and exempt from the spec-ID rule.
- CodeQL default setup.
- Only collaborators can open PRs and issues.
- SSH commit signing.
- lefthook and commitlint.
- Skills live in `.agents/skills`, copied to `.claude/skills` with a check for drift.
- CLAUDE.md imports AGENTS.md ([D25](0025-the-working-agreements-conventions-batch.md)).
- A read-only reviewer subagent, plus deny rules for merging and for locked tests.

## More information

- Decided by: Brad Thome, on the foundation decision page (R13).
- Later: [D54](0054-husky-gitleaks-and-two-license-files.md) replaced lefthook with husky.
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
