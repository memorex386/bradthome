---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D202
---

# A named role gets typical requirements, labeled as inferred

## Context and problem statement

A visitor can paste a posting or just name a role, such as "staff mobile engineer" ([D176](0176-interview-prep-ships-as-designed-and-never-stores-a-posting.md)). A posting lists its own requirements. A role's name doesn't, and the chat answers only from the corpus ([D174](0174-the-chat-answers-only-from-the-public-corpus-with-sources.md)). Where do a named role's requirements come from?

## Decision drivers

- Naming a role is in the designs, and is quicker than finding a posting.
- Nothing about Brad may come from outside the corpus.

## Considered options

The options are listed in the builder's ranked order.

1. The model lists the role's typical requirements, and the result says they're inferred (recommended)
2. Ask for a posting instead

## Decision outcome

Chosen option 1, as recommended. For a named role, the model lists the requirements such a role usually has, from general knowledge, and the result labels them as typical requirements inferred from the role's name. That's the only general knowledge prep uses: the evidence and the gaps still come only from the corpus.

### Consequences

- Good, because a visitor without a posting still gets a useful answer.
- Bad, because a role's typical requirements are the model's view, which the label makes plain.

### Confirmation

Spec 024's eval suite has a named-role case, and the window's test shows the label.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.5 session, 2026-11-09.
