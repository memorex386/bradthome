---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D186
---

# The chat's workspaces live in VINDecoded's Anthropic organization

## Context and problem statement

The chat and its evals each need an Anthropic workspace with its own spend limit ([D169](0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md)). Brad's only Anthropic Console organization is VINDecoded's. Should the workspaces go there, or in a new organization for the site?

## Decision drivers

- Brad wants this to move fast.
- Each workspace's own limit stops its spend whichever organization holds it.

## Considered options

The options are listed in the builder's ranked order.

1. A new individual organization for the site
2. Workspaces in VINDecoded's organization

## Decision outcome

Chosen option 2, which Brad chose over the builder's first recommendation. `bradthome-chat` and `bradthome-evals` are workspaces in VINDecoded's organization, billed to it. `bradthome-chat` stops at $25 a month and `bradthome-evals` at $5, as D169 set. The Console's email alerts take whole dollars, so each alerts just under half and at the limit: $12 and $25, and $2 and $5. The organization's own $1,000 limit still sits above both.

### Consequences

- Good, because there's no new account or billing to set up.
- Good, because each workspace's limit and its own keys keep the chat's spend apart within the organization.
- Bad, because the site's spend shows in, and is billed to, VINDecoded's account.

### Confirmation

The plan's setup table records both limits and alerts, read back from the Console on 2026-11-08.

## More information

- Decided by: Brad Thome, in the slice 4.2 session, 2026-11-08, after first choosing a new organization on a card.
