---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D150
---

# The GitHub card shows the profile only

## Context and problem statement

D144 put Brad's two most-starred public repos on the GitHub card. They're years-old Android and iOS WebView libraries, and the card read as a pointer to them rather than to Brad. Should the card keep them?

## Considered options

1. The profile only: avatar, name, username, bio and the public repo count, with no repos
2. Keep the two most-starred repos (D144)

## Decision outcome

Chosen option 1. The GitHub snapshot no longer fetches the repos, and the card shows the avatar (D145), name, username, bio, the public repo count, `github.com` and the snapshot's date. The contribution heatmap stays out, as D144 chose. This supersedes D144's repos.

### Consequences

- Good, because the card is about Brad, and the refresh makes one call fewer to GitHub.
- Bad, because the card shows no code, so a visitor follows the link to see any.

### Confirmation

Spec 016's tests check that the snapshot and the card carry no repos.

## More information

- Decided by: Brad Thome, on a choice card in the career session, 2026-11-05, relayed to the slice 3.8 session.
