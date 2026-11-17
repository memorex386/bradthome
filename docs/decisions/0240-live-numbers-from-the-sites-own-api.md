---
status: accepted
date: 2026-11-17
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D240
---

# Live numbers come from the site's own API

## Context and problem statement

VINDecoded's new card (D239) shows two live numbers: the latest iOS release and the PRs merged in the last 30 days. Apple's lookup API is public and needs no key. VINDecoded's repo is private, so its count needs a token, and Google Play has no public API at all. A visitor's browser can't hold a token, and D48 keeps visitors from calling outside services. Where do the live numbers come from, how often are they fetched, and what does the card show when they can't be?

## Decision drivers

- No visitor calls Apple or GitHub, and no token reaches a browser.
- No number of visits may raise the calls to Apple or GitHub, or the cost.
- The card reads whole with no script, and when the API is down.
- Nothing of the private repo but the count leaves the server, and nothing about a visitor is kept (D175).
- The CSP and the one module stay as they are, within an allowance Brad sets (D147).

## Considered options

The options are listed in the builder's ranked order, for each part Brad chose on the session's cards.

- **Where:** a read-only route on the chat API, which the CSP already allows (recommended); the visitor's browser; the build alone.
- **How often:** refresh on read, when a source's cache is over an hour old, behind a lease (recommended); Cloud Scheduler, hourly.
- **The PR tile with no script:** the weekly refresh's dated count (recommended); a line with no number; a fetch at every build.

## Decision outcome

Chosen, each as recommended, on Brad's cards of 2026-11-17:

- **The route.** `GET /pulse` on the chat API answers the release (version, release day, and the rating and its count from 100 ratings, D143) and the merged-PR count, each with the time it was fetched. It answers only the origins `/chat` answers (D183), with five minutes' browser cache, and never 5xx. It reads only `merged_at` and `updated_at` from the repo's closed pull requests, and answers the count alone.
- **The cache.** Each source's last good answer sits in a `pulse` collection in Firestore. A visit reads it; when a source was last tried over an hour ago, one request claims a lease in a transaction and refetches, each call capped at 4 s. So each source is called at most once an hour, 24 times a day, whatever the traffic. A failed source keeps its last good numbers, with their age. No Cloud Scheduler and no new service.
- **The secrets.** The token and the repo's `owner/name` sit in Secret Manager as `pulse-github-token` and `pulse-github-repo`, which only the chat API's service account can read. Brad creates the fine-grained token, read-only on the repo's pull requests, and adds both values; the agent created the empty secrets on Brad's card and never handles their values. The repo's name stays out of the public code. The deploy mounts each secret once it has a version.
- **The log.** One numbers-only line per refresh: the source, its state and the milliseconds. Nothing per visit.
- **The card.** It's built with the weekly refresh's numbers: the Monday previews job writes the release, from Apple's lookup, and the count, from the deployed `/pulse`, never GitHub, to `pulse.json`, each with the day it changed (seeded with v12.7.8 of Nov 10 and 296 merged PRs on 2026-11-17). The App Store snapshots keep their shape, so the link previews don't change with each release, and screenshots hide the built numbers, so the weekly refresh never moves a baseline. With script, the one module asks `/pulse` once, as the card nears the viewport, swaps in the answer with no motion, and dates the numbers in the live line; a visit that never comes near the card never wakes Cloud Run. The module may grow by 2,304 bytes, 1,024 gzipped (Brad's card; 2,084 and 870 as built).
- **The weekly job's App.** The previews job opens its refresh pull request with a GitHub App (D146), which was never created, so a week with a change fails at the token step; with this slice that's most weeks. On a card on 2026-11-17, while checking Gate 1, Brad chose to create it as D146 designed: Brad creates the App, installs it on the repo, and adds its client ID and private key as `PREVIEWS_APP_CLIENT_ID` and `PREVIEWS_APP_KEY`. Until then the Monday run goes red when something changed, and the built numbers keep their "as of" day.
- **`/privacy`** says what's fetched and from where, that Apple and GitHub never see the visit, and that nothing about it is kept, in Brad's three approved points.

### Consequences

- Good, because visitors never reach Apple or GitHub, no token leaves Secret Manager, and the calls to each are bounded by the clock, not the traffic.
- Good, because the card always shows real, dated numbers: the build's, then the API's.
- Good, because the integration is itself public work: a route, a cache, a lease, fakes and a record in the repo.
- Bad, because a visit that reaches the card now wakes Cloud Run, and the first after an hour's quiet may wait for a refresh, up to about 4 s, while the built numbers show.
- Bad, because the token expires and the org may revoke it; the count then ages in plain view until Brad makes a new one.
- Bad, because the one module grows by about 2 KB.

### Confirmation

Spec 041's tests run the route against a memory store and fakes of Apple and GitHub, checking the origins, the headers, the lease, the fallbacks, the count and the log, and that nothing calls either; the e2e tests route the API's address to a fake and check the card live, built, with a source down, with the API down, and with no script. The deploy's tests check the secrets it mounts.

## More information

- Decided by: Brad Thome, on spec 041's cards, 2026-11-17.
- Spec: [spec 041](../../specs/041-vindecoded-pulse/spec.md).
- Builds on [D48](0048-the-test-and-quality-batch.md), [D143](0143-app-store-cards-show-a-rating-only-from-100-ratings.md), [D146](0146-a-github-app-opens-the-previews-refresh-pull-request.md), [D147](0147-link-previews-ship-one-small-script.md), [D170](0170-the-chat-api-runs-on-cloud-run-scaled-to-zero.md), [D175](0175-the-chat-logs-numbers-only-never-what-visitors-type.md), [D182](0182-the-chats-spend-totals-live-in-firestore.md), [D183](0183-only-previews-and-next-may-call-the-chat-api.md) and [D185](0185-the-chat-api-deploys-by-hand-from-a-repo-script.md).
