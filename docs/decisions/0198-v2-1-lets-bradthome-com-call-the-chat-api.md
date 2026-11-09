---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D198
---

# v2.1 lets bradthome.com call the chat API

## Context and problem statement

Only previews and `next` may call the chat API ([D183](0183-only-previews-and-next-may-call-the-chat-api.md)): live's Content-Security-Policy leaves the API out of `connect-src`, and the API refuses bradthome.com's origin. For the chat to go live as v2.1, both change. Spec 003 locks the CSP, and spec 021 sets the origins. Brad approves both changes now?

## Decision drivers

- The narrowest change: one host in `connect-src`, one origin in the API's list.
- Spec 003's lock changes only with Brad's approval and a relock.

## Considered options

The options are listed in the builder's ranked order.

1. Approve both now (recommended). The Cloud Run redeploy and the release still each wait for their own yes.
2. Ask for each when it's built, with its diff.

## Decision outcome

Chosen option 1, as recommended. `firebase.json`'s CSP adds the API's address to `connect-src`, spec 003's tests are amended and relocked, and the API allows `https://bradthome.com` beside previews and `next`. This supersedes D183's "previews and next only" for the origin list, from v2.1.

### Consequences

- Good, because live can call the API, and nothing else is opened.
- Bad, because live's CSP now names a third-party host, the chat API on Cloud Run.

### Confirmation

Spec 003's relocked CSP test, spec 021's origin tests, and the release record's check that the chat answers on bradthome.com.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.4 session, 2026-11-09.
- The redeploy waits for Brad's yes on a card ([D185](0185-the-chat-api-deploys-by-hand-from-a-repo-script.md)), and the release for Brad's separate go-ahead ([D113](0113-releases-run-from-a-tag-behind-brads-approval.md)).
