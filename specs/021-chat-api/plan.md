# Plan for spec 021: The chat API

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved 2026-11-08 |
| Status | Approved |

## Approach

`apps/chat-api` is a small Hono app built as plain functions, so the tests run it in-process with `app.request()`, a fake model and a fake store, and Cloud Run runs the same app through `@hono/node-server`.

- **`app.ts`** wires the steps in the spec's table in order: origin, body, ALTCHA, visitor limit, spend, then the model (FR-001, FR-003–FR-006). Each step is its own module with its own tests. `createApp(deps)` takes the model, the store, the clock, the corpus, the keys and the logger, so nothing reaches the network in a test.
- **`origin.ts`** allows `^https://bradthome--[a-z0-9-]+\.web\.app$` and nothing else (FR-001, D183). Hono's `cors` takes the same function.
- **`request.ts`** parses the body with zod: up to 10 UI messages, text parts only, the last the visitor's, 1,000 and 4,000 characters (FR-003).
- **`altcha.ts`** creates and verifies challenges with `altcha-lib` 2, PBKDF2 at ALTCHA's default cost, 5-minute expiry, signed with `chat-altcha-key`, and keeps used signatures in ALTCHA's `CappedMap` until they expire (FR-004, D184).
- **`limit.ts`** keeps `HMAC-SHA256(daySalt, address) → count` in a map that clears when the UTC day changes, with a fresh random salt each day (FR-005, D173).
- **`spend.ts`** prices token counts from one table, `PRICES`, keyed by model, and reads and increments `chat-spend/day-YYYY-MM-DD` and `chat-spend/month-YYYY-MM` through a `SpendStore` interface. The real store is `@google-cloud/firestore` with `FieldValue.increment`; the tests use a fake (FR-006, D182).
- **`prompt.ts`** builds the system prompt, the corpus documents and the fenced conversation. Each source is a `text/plain` file part titled with its ID, with `citations: { enabled: true }`, and the last carries `cacheControl: { type: 'ephemeral', ttl: '1h' }` (FR-007, FR-008, FR-012).
- **`answer.ts`** calls `streamText` with no tools and 800 output tokens, maps each document citation to its corpus source, drops unknown IDs, classifies the state from the fixed sentences and the citations, and writes the `data-meta` part. On finish it adds the cost and writes the log line (FR-007, FR-009).
- **`log.ts`** has one function, `logAnswer(fields)`, whose type allows only the numbers and IDs in the spec. It's the only place that writes to stdout (FR-009).
- **`corpus.ts`** reads the bundled `corpus.json` and parses it with spec 020's `corpusSchema`, or throws at start-up (S6.6).
- **`server.ts`** reads the ALTCHA secret from the environment, which Cloud Run fills from Secret Manager, the model from `CHAT_MODEL`, and serves on `PORT`. It signs in to Anthropic with `federation.ts`, which trades the service account's Google identity token for a short-lived Anthropic token (S8.4, FR-013, D187).

The deploy script (D185) fetches `https://bradthome.com/corpus.json`, checks it against the schema, bundles the server with esbuild into one file beside it and a minimal `package.json`, and runs `gcloud run deploy chat-api --source` from that folder. It then reads `gcloud run services describe` and fails if the region, instance range, service account, ALTCHA secret, timeout or model differ, or if an Anthropic key is set (D187).

The preview and `next` config adds the origin to `connect-src` in `previewConfig` (scripts/ci/preview-deploy.ts), which both deploys already call, from one constant, `CHAT_API_ORIGIN`, in `apps/chat-api/src/origin.ts` (FR-002). Spec 003's tests only require that the noindex header is added, so its lock doesn't change.

The privacy note's chat section goes in `privacy.ts`, with the 20 questions and 30 days from the API's constants (FR-011). Spec 018's `/privacy` snapshot gets a new baseline.

## Setup, in the order the build needs it

Each step waits for Brad's card. Costs are at list price, in `us-central1`.

| Step | Who | What it costs |
| --- | --- | --- |
| Anthropic: workspaces `bradthome-chat` ($25 a month, alerts at $12 and $25) and `bradthome-evals` ($5, alerts at $2 and $5) in VINDecoded's organization ([D186](../../docs/decisions/0186-the-chats-workspaces-live-in-vindecodeds-anthropic-organization.md)) | Done 2026-11-08: Claude set them in the Console with Brad signed in, after Brad's go-ahead | Nothing until used |
| The chat's API key, in `bradthome-chat` | Brad, who never shows it to Claude. Replaced on 2026-11-08 by workload identity federation: the `google-cloud` issuer, the Anthropic service account `bradthome-chat-api` and its rule, set in the Console by Claude after Brad's yes, with Brad signed in (D187) | – |
| Turn on Firestore, Native mode, in `us-central1` | Done 2026-11-08 by Claude, after Brad's yes | $0 inside the free tier: 50,000 reads and 20,000 writes a day |
| Turn on Secret Manager, and create `chat-anthropic-key` (deleted 2026-11-08 by T011, D187) and `chat-altcha-key`, empty, readable only by `chat-api@bradthome.iam.gserviceaccount.com` | Done 2026-11-08 by Claude, after Brad's yes, with the service account, its Firestore role and the request-log exclusion | About $0.06 a month each |
| Both first versions: the Anthropic key, and a long random string | Brad, in the Cloud Console | – |
| The `chat-api` service account with Firestore user and the two secret accessor roles, the Cloud Run service (0 to 2 instances, public, 120 s), a Logging exclusion for its request logs, and Google's $5 monthly spend cap on it | Claude, after Brad's yes | $0 inside Cloud Run's free tier. Each deploy uses a few of Cloud Build's 2,500 free minutes a month, and its image stays under Artifact Registry's free 0.5 GB |

Until the key is in, the API is built and tested against the fake model. After it, the check runs a handful of real questions from `next`, a few cents in all.

## What exists today

- `apps/site/src/corpus/corpus.ts`: `corpusSchema`, the shape the API reads. Live serves `/corpus.json` since v2.0.1.
- `scripts/ci/preview-deploy.ts`: `previewConfig`, used by the preview and `next` deploys.
- `apps/cost-guard/`: the pattern for a deployed workspace package and its hand-run deploy script.
- The `bradthome` project already has Cloud Run, Cloud Build, Artifact Registry and Logging on. Firestore and Secret Manager aren't.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Citations by `[id]` markers in the text, parsed from the stream | Anthropic's citations API ties each citation to a document, so the ID can't be made up mid-text. The AI SDK maps it to a source part |
| One document holding the whole corpus | A citation would point at a character range, not a source's ID |
| `hono-rate-limiter` for the visitor limit | It keys by address in its store. A map of daily codes is a few lines and never holds an address |
| Read the corpus from main's build | The API should answer from what's public on bradthome.com, which is live's corpus |
| A Dockerfile | Cloud Run's Node buildpack runs a bundled file with no Dockerfile to maintain |

## Decisions

- D182, `docs/decisions/0182-the-chats-spend-totals-live-in-firestore.md`
- D183, `docs/decisions/0183-only-previews-and-next-may-call-the-chat-api.md`
- D184, `docs/decisions/0184-altcha-signs-with-its-own-secret.md`
- D185, `docs/decisions/0185-the-chat-api-deploys-by-hand-from-a-repo-script.md`
- Tier 3, decided here: Haiku 5.5's thinking off, at low effort, after the first live check found its default thinking could use the whole 800-token budget on a follow-up and leave no answer; the paths and refusal bodies in the mocks; 10 messages, 1,000 and 4,000 characters; 800 output tokens; a 1-hour cache; UTC days and months; ALTCHA's PBKDF2 at its default cost with a 5-minute expiry; a 120-second timeout; the `data-meta` part; the fixed sentences; the documents named by date; the corpus taken from live at deploy time.

## Measured after setup

Checked on 2026-11-08 against the deployed service, with `tests/021/live/probe.ts`. Its numbers are in [evidence/probe.json](evidence/probe.json).

- Cold start: 3.4 s to the first byte of `/health` after 20 idle minutes, then 0.1 s warm, from this PC. A deploy starts an instance to check the new revision, so only a request after an idle spell is truly cold, and the probe's `--cold` adds one reading each time it's run that way. Slice 4.3 hides it behind the ALTCHA solve and the answering state.
- The caller's address: Cloud Run appends the caller's address as the rightmost `X-Forwarded-For` entry, and keeps any entries the caller sent to its left, so the limiter's rightmost-entry rule holds. The socket's own address is an internal `169.254.x` address, so the connection fallback never helps there, and the header is always present. Checked with a throwaway echo service on Brad's yes, deleted minutes later.
- The corpus's real token count: 20,725 tokens as cited documents, about twice spec 020's estimate from characters, since each document carries its title, label and citation markup.
- What an answer costs on Haiku 5.5, by the API's own pricing: $0.0043 for the first answer, which writes the 1-hour cache, then about $0.0002–0.0004 warm (SC-004's limit is $0.002). Time to the end of the answer: 0.9–2.7 s warm.
- ALTCHA's work: 160–270 ms to solve in Node on this PC. Slice 4.3 measures it on a phone.
- The first live run found Haiku 5.5's default thinking could use the whole 800-token budget on a follow-up and leave no answer, and that an answer used a pronoun for Brad. Both were fixed and redeployed (`bcd7123`). The second run answered all five as designed: two answers with sources, the boundary, the off-topic question and an injection attempt each with its fixed reply.
- From a browser: on `next`, `fetch` of `/challenge` answers 200; on bradthome.com, the live CSP blocks it (SC-003).
- On federation (D187), after `5f7b8d0` deployed with no key mounted, the probe answered all five as designed: two answers with sources in 3.0 s and 1.6 s, then the boundary, off-topic and injection replies. The Console's authentication events showed one successful exchange under the `bradthome-chat-api` rule, which all five questions shared.
- The $5 Cloud Run spend cap is set on the project's Cloud Run service, alerting at 50%, 80% and 100%, and Cloud Run's request logs for `chat-api` are excluded, as the probe's empty request-log query showed.

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A script forges a preview `Origin` | Medium | ALTCHA, the visitor limit and the spend shutoffs still apply, and Anthropic's $25 limit sits behind them |
| A prompt injection gets past the fence | Medium | No tools, citations checked in code, fixed sentences; 4.4's injection suite |
| Firestore is slow or down | Low | Fails closed as `paused` (S5.5) |
| The AI SDK's citation mapping changes in an update | Low | The versions are pinned, and S6.2's test runs the real mapping on a recorded Anthropic stream |
| Cloud Run's request logs keep addresses | Certain without the exclusion | The setup adds it, and the probe checks no request log is kept |

## Tests to write

| ID | Test file | Test name includes |
| --- | --- | --- |
| S1.1–S1.3, FR-001 | `tests/021/unit/origin.test.ts` | each ID |
| S1.4, FR-002 | `tests/021/unit/preview-config.test.ts` | each ID |
| S2.1, S2.2, FR-003, FR-008 | `tests/021/unit/request.test.ts` | each ID |
| S3.1–S3.3, FR-004 | `tests/021/unit/altcha.test.ts` | each ID |
| S4.1–S4.5, FR-005 | `tests/021/unit/limit.test.ts` | each ID |
| S5.1–S5.5, FR-006 | `tests/021/unit/spend.test.ts` | each ID |
| S6.1–S6.6, FR-007, FR-012 | `tests/021/unit/answer.test.ts`, with the fake model and a recorded stream | each ID |
| S7.1–S7.3, FR-009, SC-001, SC-002 | `tests/021/unit/log.test.ts`, and a whole-suite marker scan | each ID |
| S8.1, S8.3, FR-010 | `tests/021/unit/deploy.test.ts`, with a fake gcloud | each ID |
| S8.2, SC-003–SC-005 | `tests/021/live/probe.ts`, run by hand after setup, results in `evidence/` | – |
| S9.1, S9.2, FR-011 | `tests/021/unit/privacy.test.ts` | each ID |

## Tasks

- [x] **T001** Tests from the scenarios, against the module interfaces
- [x] **T002** The package and each module, until the unit tests pass
- [x] **T003** The preview config and the privacy section, with new baselines from `pnpm test:visual`
- [x] **T004** The deploy script
- [x] **T005** Setup, each step on Brad's card
- [x] **T006** Deploy, the probe and a handful of real questions from `next`; record the measurements
- [x] **T007** Review with the pinned reviewer, and fix or answer each finding: six findings, all fixed (races on the limit and ALTCHA, nested fence tags, `useChat`'s follow-up parts, a stderr leak the wider scan found, and the address fallback)
- [x] **T008** Plan and AGENTS.md updates
- [x] **T009** Gate 2: Brad said push. `b3fc8ca` and `bcd7123` are on main, with `ci` and `next` green
- [x] **T010** Workload identity federation (S8.4, FR-013, D187): the issuer, the Anthropic service account and the rule in the Console on Brad's yes, `federation.ts`, the deploy's check for an Anthropic key, and their tests
- [x] **T011** After Brad says push: deploy, run the probe on federation and record it, then, each on Brad's yes, delete the chat's key in the Console and the secret `chat-anthropic-key`, which takes its accessor role with it. Done 2026-11-08: `5f7b8d0` deployed, the probe answered all five on federation, and Brad said yes to both deletions. `gcloud secrets list` shows only `chat-altcha-key`, and the Console lists no key in `bradthome-chat` (FR-013)

## Preview and rollback

No pull requests while D161 holds, so `next` shows the CSP change once it's on main. Rolling back the API is `gcloud run services update-traffic` to the previous revision, or deleting the service, which stops all spend. Rolling back the site is a revert commit.

## Approval

- Gate 1: approved by Brad on a card in the slice 4.2 session, 2026-11-08
