---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D183
---

# Only previews and next may call the chat API

## Context and problem statement

The browser calls the API's own Cloud Run address ([D170](0170-the-chat-api-runs-on-cloud-run-scaled-to-zero.md)), so the CSP's `connect-src` must allow it. The chat shows only on previews and `next` until v2.1 ([D177](0177-five-slices-with-the-chat-live-only-after-its-evals.md)). How narrow is the change?

## Decision drivers

- bradthome.com must not reach the API before v2.1.
- Spec 003's locked tests and the live CSP should change only when they must.
- Slice 4.2's "done when" says previews and `next` reach the API.

## Considered options

The options are listed in the builder's ranked order.

1. Previews and `next` only, in the deploy step that already adds noindex (recommended)
2. No CSP change until slice 4.3

## Decision outcome

Chosen option 1, as recommended. The preview and `next` deploys write their copy of `firebase.json` with the noindex header already. That copy also adds the API's one origin to `connect-src`. `firebase.json`, which live and the release channel serve, stays as it is, so spec 003's lock doesn't change. The API answers only an `Origin` that is a channel of the `bradthome` Hosting site, such as `https://bradthome--next-….web.app`, and refuses every other origin, bradthome.com and `bradthome.web.app` included. v2.1 moves the origin into `firebase.json` with spec 003's card and relock.

### Consequences

- Good, because live's headers and spec 003's lock are untouched.
- Good, because the refusal is in the API, not only in the browser.
- Bad, because a script can send any `Origin` it likes, so the origin check stops browsers on live, and ALTCHA and the limits stop scripts.

### Confirmation

Spec 021's tests show the preview copy's `connect-src` gains exactly the one origin, `firebase.json` doesn't, and the API refuses bradthome.com's origins.

## Pros and cons of the options

### Previews and next only

- Good, because a browser on `next` can call the API now, which 4.3 needs.

### Wait for 4.3

- Good, because 4.2 changes nothing on the site.
- Bad, because 4.2 could show the API working only outside a browser.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.2 session, 2026-11-08.
