---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D43
---

# A separate GitHub account for the agent

## Context and problem statement

**The question:** How do agents work in the repo, and who can merge?

GitHub won't let a pull request's author approve it, so this is how GitHub enforces Gate 3. Brad creates the account, since agents can't. This changes [D16](0016-brads-own-commits-use-brad-bradthome-com.md).

## Considered options

The options are listed in the builder's ranked order.

1. A separate account for the agent, with Brad's approval required (recommended, chosen)
2. The agent uses Brad's account with a limited token
3. No change

## Decision outcome

Chosen option: "A separate account for the agent, with Brad's approval required".

The agent gets its own GitHub account. It commits and opens pull requests, main requires one approval, and Brad approves and merges from Brad's own account. The agent's commits are signed by the agent's account, so [D16](0016-brads-own-commits-use-brad-bradthome-com.md) now covers only Brad's own commits.

## More information

- Decided by: Brad Thome, on the foundation decision page (R9).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
