---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D146
---

# A GitHub App opens the previews' refresh pull request

## Context and problem statement

The weekly refresh opens a pull request when a snapshot changes (D48). A pull request opened with a workflow's own token starts no other workflow, so CI, the gate and the preview would never run on it.

## Considered options

The options are listed in the builder's ranked order.

1. A GitHub App with contents and pull-requests write on this repo only, its client ID as a repo variable and its private key as a secret (recommended)
2. A fine-grained token from bradthome-agent, stored as a secret
3. The workflow's own token, with Brad closing and reopening the pull request to start CI

## Decision outcome

Chosen option 1. The previews workflow makes a short-lived installation token with GitHub's `create-github-app-token` action, from the `PREVIEWS_APP_CLIENT_ID` variable and the `PREVIEWS_APP_KEY` secret, and asks it for contents and pull-requests write. It commits through GitHub's API, which signs the commit, on a new branch, and opens the pull request. Brad creates the App and adds the variable and secret; the agent doesn't.

### Consequences

- Good, because the refresh's pull request runs every check and gets a preview, and the key never expires.
- Bad, because there's one more App and secret to keep, and the workflow can't open a pull request until Brad adds them.

### Confirmation

Spec 016's tests check the workflow's steps and the pull request script against a fake GitHub.

## More information

- Decided by: Brad Thome, on the slice 3.8 session's card, 2026-11-05.
