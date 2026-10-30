---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D25
---

# The working agreement's conventions batch

## Context and problem statement

**The question:** Approve the conventions batch

These are the tier-2 batch, taken from the method and the vendors' guidance.

## Considered options

The options are listed in the builder's ranked order.

1. Approve all (recommended, chosen)
2. Approve all except the ones I name below
3. Discuss each one

## Decision outcome

Chosen option: "Approve all".

**Conventions:**
- GitHub Flow, with squash merges into a protected main.
- Conventional Commits, with the spec number as the scope.
- Signed commits as brad@bradthome.com ([D16](0016-brads-own-commits-use-brad-bradthome-com.md)).
- A fresh agent session for each stage.
- AGENTS.md runs about 100–150 lines, pointing into `docs`. CLAUDE.md only imports it.
- After the same mistake happens twice, update AGENTS.md or a skill.
- Specs use Spec Kit's `specs/NNN-name` layout.
- The reviewer checks correctness against the spec and skips style.

## More information

- Decided by: Brad Thome, on the working-agreement decision page (W9).
- Later: [D43](0043-a-separate-github-account-for-the-agent.md) changed the signing: the agent signs its own commits.
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
