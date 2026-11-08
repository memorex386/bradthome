---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D187
---

# The chat API signs in to Anthropic through workload identity federation

## Context and problem statement

The chat API shipped with an Anthropic API key in the Secret Manager secret `chat-anthropic-key`, which Cloud Run put in `ANTHROPIC_API_KEY` ([D184](0184-altcha-signs-with-its-own-secret.md)). When the key was created, the Claude Console offered workload identity federation, which works with Google Cloud. Brad chose to ship with the key and switch as a follow-up. A static key never expires and can leak from wherever it's copied. Should the API keep it, or trade its Google identity for short-lived Anthropic tokens?

## Decision drivers

- No long-lived secret that could leak, so nothing to rotate.
- The API already runs as its own Google service account, `chat-api@bradthome.iam.gserviceaccount.com`, which the metadata server can vouch for.
- The pinned `@ai-sdk/anthropic` takes `authToken` as a function that it calls before every request, so no custom `fetch` is needed.
- The repo is public.

## Considered options

The options are listed in the builder's ranked order.

1. Federation, with the rule's IDs in the repo
2. Federation, with the IDs in a Secret Manager secret
3. Keep the API key

## Decision outcome

Chosen option 1, as recommended. Brad approved the change to spec 021 at Gate 1 on 2026-11-08, as an amendment to that spec: S8.1 and FR-010 now name only the ALTCHA secret, and S8.4 and FR-013 are new.

- In VINDecoded's organization ([D186](0186-the-chats-workspaces-live-in-vindecodeds-anthropic-organization.md)), the Console's Google Cloud setup registered the issuer `https://accounts.google.com`, an Anthropic service account `bradthome-chat-api`, and a rule `bradthome-chat-api`. The rule matches the Google service account's unique ID as `sub`, its email as a claim and the audience `https://api.anthropic.com`. It covers only the `bradthome-chat` workspace, and its tokens last 10 minutes.
- `apps/chat-api/src/federation.ts` asks the metadata server for a Google identity token, trades it at `POST /v1/oauth/token`, and keeps the token until 2 minutes before it expires. Questions that arrive together share one exchange. If the exchange fails, the question answers `failed`, as any model error does, and no token reaches a log line.
- The organization, rule, service account and workspace IDs are in `apps/chat-api/src/constants.ts`. They aren't secrets, since the rule accepts only a token Google signed for the API's own service account.
- The deploy mounts only `chat-altcha-key`. It fails if the service still has `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN`.
- Once the live probe passes on federation, the old key is deleted in the Console and the secret `chat-anthropic-key` in Secret Manager, each after Brad's yes.

Brad chose the narrowest scope, `workspace:inference`. The Console offers only `workspace:developer` and `org:admin`, so the rule uses `workspace:developer`, the same access a key in the workspace has. The rule covers only `bradthome-chat`, which holds nothing but the chat. Only the Admin API can narrow the scope, and that needs an admin key. Brad chose to keep `workspace:developer` and narrow it if the Console adds the option.

### Consequences

- Good, because no static Anthropic key exists for the chat, so nothing can leak or needs rotating.
- Good, because each token lasts 10 minutes and works only from the API's own Cloud Run identity.
- Bad, because the API makes one more request about every 8 minutes while it runs, and an outage of Anthropic's exchange stops answers just as an outage of its API would.
- Neutral, because the VINDecoded organization's ID is now public in the repo.

### Confirmation

Spec 021's tests check:

- the metadata request and the exchange's fields
- that a token is reused until 2 minutes before it expires
- that questions at the same moment share one exchange
- that a refused exchange answers `failed` without a token in any output
- that the model call carries a bearer token and no API key
- that the deploy fails when the service still holds an Anthropic key

The live probe after the deploy, `node tests/021/live/probe.ts`, shows the API answering through federation, and the Console's authentication events show the exchanges.

## Pros and cons of the options

### Federation, with the IDs in a Secret Manager secret

- Good, because it keeps the organization's ID private.
- Bad, because it adds a secret and a mount for values that grant nothing on their own.

### Keep the API key

- Good, because nothing changes.
- Bad, because a static key stays in Secret Manager and in the running service.

## More information

- Decided by: Brad Thome, on cards in the federation session, 2026-11-08.
- Evidence, checked 2026-11-08: [Workload identity federation](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation), [Use WIF with Google Cloud](https://platform.claude.com/docs/en/manage-claude/wif-providers/gcp).
