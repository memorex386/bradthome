# Plan for spec 024: Interview prep

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved 2026-11-09 |
| Status | Approved at Gate 1, 2026-11-09 |

## Approach

### The API (`apps/chat-api/`)

- **`prep.ts`** holds prep's prompt, schema and checks. The system prompt is fixed; the corpus goes in as the chat's documents, citations off, with the 1-hour cache breakpoint on the last; then the posting in `<posting>` tags (`fencedPosting`, the chat's `fenced` with its own tag), then a reminder. The schema (zod) is `{ kind, role, requirements[], matches[{ requirement, evidence, sources[] }], gaps[], questions[] }`, in that order, so the answer fills in the order P2 shows. `checkPrep` drops unknown IDs and matches left without one, caps counts and lengths, rewrites pronouns in every string, and names the state (S5.5, S5.6).
- **`app.ts`** gains `POST /prep` and its `OPTIONS`. It shares the chat's origin, ALTCHA, limiter and spend checks through small helpers pulled out of `/chat`, so the order can't drift (S5.1). The model call is `streamText` with `output: Output.object({ schema })`; its `partialOutputStream` gives the counts for `data-prep-progress`, and the final output is checked and sent as `data-prep` with `data-meta`.
- **`request.ts`** gains `parsePrepRequest` and `wordsOf` (S5.2). **`limit.ts`**'s `take` and `giveBack` take a count, and a refusal carries `left` (S5.3, S5.9). **`log.ts`** gains the `chat.prep` event and the `not-a-posting` and `no-fit` states, still copied field by field (S6.1). **`constants.ts`** gains `PREP_QUESTIONS = 3`, `MAX_POSTING_WORDS = 3_000`, `MAX_POSTING_CHARS = 24_000` and `PREP_MAX_OUTPUT_TOKENS = 1_500`.

### The window (`apps/site/src/components/chat/`)

- **`ChatWindow.tsx`** gains the mode switch and keeps two views: the chat as today, and **`Prep.tsx`**, prep's view, with its own state (entry, working, done, failed, check-failed, limited). The limit with none left and the pause are shared, as today.
- **`api.ts`** gains `prep(posting, signal, onSending)`, which solves ALTCHA, posts to `/prep` and maps refusals as `ask` does, with `left` for the limit. **`stream.ts`** yields the two new data parts.
- **`words.ts`** gains `PREP`, every prep word, rewritten from the designs to call Brad "Brad"; **`example.ts`** holds the invented example posting. **`fixtures.ts`** gains the held prep states, which the gallery draws at `/design-system#prep`.
- **`chat.css`** gains prep's styles on the same tokens, with all motion in the no-preference query.

### The flag

`scripts/site/release.ts` comes back with `isRelease()` and `prepDefine()`, defining `__BRADTHOME_PREP__` in `astro.config.mjs`. The switch, `Prep.tsx`'s import and the gallery's prep section sit behind it, so a release build's bundler drops them. `release.yml`'s build step sets `BRADTHOME_RELEASE=1`. v2.2 removes all of it, as v2.1 did (D190). Spec 023's S6.1 test, which checks the flag is gone, gets a dated note in spec 023 and expects the flag only until v2.2.

### The evals (`apps/evals/`)

- **`prep-cases.ts`**: the prep suite's invented postings, each with its expected states, sources it must cite, words it must and mustn't hold.
- **`prep-ask.ts`**: asks through the API's own `createApp`, as `ask.ts` does, capturing every log line the request writes.
- **`checks.ts`** gains the prep checks: never-claims over the notes, no prompt part, the state, the posting in no log line (any run of 40 characters from it), $0.01 and 30 seconds.
- **`judge.ts`** gains `PREP_RUBRIC` and a prompt with the whole corpus in a cached block.
- **`run.ts`** runs both suites and passes a run when the chat's and prep's rules both hold (S7.4). **`results.ts`** gains the prep suite and states; `/evals` shows them.
- **`scripts/lib/fingerprint.ts`** adds `prep.ts` and the prep eval files (S7.6).

### Cost of a run

| What | Estimate |
| --- | --- |
| One prep answer on Haiku 5.5, cold (cache write of the 22.8k-token corpus, a 1k-token posting, 1.2k tokens out) | about $0.0057 |
| The same, warm | about $0.0012 |
| The judge on Sonnet 5.5, per prep case, corpus cached | about $0.01–0.03, and $0.09 for the first case's cache write |
| The chat's 49 cases, run again for the fingerprint | about $0.08 |
| A whole run with 14 prep cases | about $0.40–0.60 |

The evals workspace has spent about $0.84 of its $5. A card states the estimate before the first real run, and the total after.

## The states and where they're drawn

Every state in the spec's table is the real window, drawn on the server from `fixtures.ts` in the gallery, and checked by `tests/024/e2e/` with a fake API in Playwright, as spec 022 does.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Cited text in sections | Sources come back for the whole answer, not each match (D201). |
| Streaming the partial answer's words into P2 | It would show sources and claims before they're checked. Counts are enough for the designed steps. |
| A separate prep window or page | The designs put prep in the same window, behind the switch. |
| One accuracy allowance across both suites | The chat's 49 cases would absorb prep's misses. |
| Sonnet 5.5 for prep | Its cache write alone is about $0.09, past the $0.01 limit (D171). |

## Risks

| Risk | What we do |
| --- | --- |
| Structured output fails with documents on Haiku 5.5 | The first eval run shows it; the fallback is the JSON-tool mode with the same schema. |
| Haiku invents a match from a source that doesn't say it | The ID check catches made-up IDs; the judge grades the rest; misses are public on `/evals`. |
| An injection inside a posting changes the answer | Fence, reminder, fixed schema with no free field for instructions, and the injection cases. |
| A long posting breaks $0.01 | The longest-posting case measures it; the cap bounds it at about $0.0013 of input. |
| A posting reaches a log through an error | The AI SDK's error output is silenced as for the chat, and the log line is built field by field; S6.1's test plants a posting in every failure path. |
| The flag drifts from what CI tests | S9.1 builds with and without it. |

## Tests to write

The site's unit tests don't compile JSX, so the held states, drawn on the server, are checked in the built gallery.

| ID | Test file | Test name includes |
| --- | --- | --- |
| S5.1–S5.9, S6.1, S6.2, FR-001–FR-004, SC-004 | `tests/024/unit/prep-api.test.ts` | each S and FR ID |
| S2.1, S5.3, S5.4, S6.2–S6.4, FR-008, FR-011, FR-012 | `tests/024/unit/prep-window.test.ts` | each S and FR ID |
| S1.1, S1.2, S2.1–S2.5, S3.1, S3.2, S4.1–S4.8, S5.3, S5.8, S9.1, S9.2, FR-005, FR-006, FR-009, FR-013, SC-005, SC-006 | `tests/024/integration/build.test.ts`, with and without the flag | each S and FR ID |
| S1.1–S4.8, S6.3, S8.1–S8.4, FR-007, SC-001 | `tests/024/e2e/prep.test.ts`, with baselines in `tests/snapshots/024/` | each S and FR ID |
| S7.1–S7.6, FR-010, SC-002, SC-003 | `tests/024/unit/prep-evals.test.ts` (scripted model), and the real run in CI | each S and FR ID |
| S9.3 | `tests/024/static/release.test.ts`, written when v2.2 removes the flag | S9.3 |
| SC-007 | `evidence/manual-pass.md` | — |
