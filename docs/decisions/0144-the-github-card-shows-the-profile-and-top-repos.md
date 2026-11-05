---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D144
---

# The GitHub card shows the profile and top repos

## Context and problem statement

The design board's GitHub card has a contribution heatmap and a yearly count. GitHub's public REST API has no contribution data; its GraphQL API does, with a token, and counts private work only when the profile shows it.

## Considered options

The options are listed in the builder's ranked order.

1. The profile and the two most-starred repos, from the public REST API with no token (recommended)
2. Add the heatmap and yearly count, through GraphQL with the workflow's token

## Decision outcome

Chosen option 1. The card shows Brad's avatar, name, username and GitHub bio, the two most-starred public repos that aren't forks or archived, with their descriptions and stars, and the public repo count.

### Consequences

- Good, because it's one public API with no token, and the numbers are ones GitHub shows on the profile.
- Bad, because the card doesn't show recent activity.

### Confirmation

Spec 016's tests check the snapshot's fields against recorded responses, and the card's words against the snapshot.

## More information

- Decided by: Brad Thome, on the slice 3.8 session's card, 2026-11-05.
