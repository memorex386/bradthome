# Plan for spec 023: Evals, and the chat live as v2.1

| | |
| --- | --- |
| Spec | [spec.md](spec.md) |
| Status | Approved at Gate 1, 2026-11-09 |

## Approach

### The evals

- **`apps/evals/src/corpus.ts`** builds the corpus from the commit's content with spec 020's `corpusOf`, and parses it with the API's schema, as spec 021's tests do.
- **`apps/evals/src/cases.ts`** holds the frozen cases as data: `{ id, suite, turns?, question, expect: { state, cites?, includes?, excludes? } }`. There are four suites: `facts`, `never`, `injection` and `limits`.
- **`apps/evals/src/checks.ts`** is pure: the global never-claims patterns, the state, cite, include and exclude checks, the prompt-leak check, and the cost and time limits. Each check returns `{ name, pass, detail }`, and the detail never quotes private text.
- **`apps/evals/src/judge.ts`** builds the judge's prompt from the answer and its cited sources' text, calls Sonnet 5.5 with `generateText`, and parses `{"verdict":"supported"|"unsupported","reason":"…"}` with zod. Anything else fails.
- **`apps/evals/src/ask.ts`** makes one `createApp` per run, with `createAnthropic({ apiKey })` for the model, a spend store in memory, a tiny ALTCHA cost and the `next` origin. It asks each case through `app.request`, solving the challenge as the window does, and reads the UI message stream into text, sources and `data-meta`. The cost comes from the API's own `costOf`.
- **`apps/evals/src/run.eval.ts`** is the Vitest file. A sequential `describe` runs one test per case, in order, so the first answer writes the cache and the rest read it. `afterAll` writes `apps/evals/results.json`. `vitest.evals.config.ts` includes only `apps/evals/src/**/*.eval.ts`, so `pnpm test` never calls a model.
- **`apps/evals/src/fingerprint.ts`** hashes `prompt.ts`, the model settings from `constants.ts`, `judge.ts`, `checks.ts` and `cases.ts`, with LF line endings (D194).
- **`apps/evals/src/results.ts`** is the zod schema for `results.json`, shared by the runner, the check and the page.

### Where the evals are enforced

- **`scripts/ci/evals.ts`** checks `results.json` parses, passed, and matches the code's fingerprint. Run by the new `ci / evals` job, which `ci / gate` needs, and by the pre-push hook through `scripts/lib/`.
- **`.github/workflows/evals.yml`** runs on a push to `evals/**` and `workflow_dispatch`, with `contents: read`. It runs `pnpm evals` with `ANTHROPIC_EVALS_KEY` in that step's env only, then uploads `apps/evals/results.json` with `if: always()`. The other workflows already run only on main, pull requests or tags, so nothing deploys from `evals/**`.

### The page

- **`apps/site/src/pages/evals.astro`**, on `DesignBase` like the privacy note, with words in `components/evals/words.ts` and styles in `styles/evals.css` on spec 009's tokens. It imports `apps/evals/results.json` and parses it with the shared schema, so a malformed file fails the build. Each case is a `<details>` element, with failed cases open, so it works without script. It's noindex.
- The footer adds "How the chat is tested" beside Privacy. Inspect adds a link to `/evals` beside "The code".

### v2.1

- Delete `scripts/site/release.ts`, `scripts/site/empty.css`, the `__BRADTHOME_CHAT__` define and guards, the aliases, and `release.yml`'s `BRADTHOME_RELEASE`. Turn the tests in specs 010, 015, 019 and 022 that build with the flag into checks that it's gone.
- Add `CHAT_API_ORIGIN` to `firebase.json`'s `connect-src`, and amend spec 003's CSP test to allow exactly that host. Relock spec 003 with `pnpm lock` (D198). `preview-deploy.ts` already skips an address the policy holds, so it needs no change.
- Add `https://bradthome.com` to `origin.ts`. Spec 021's tests change from refusing it to answering it.
- Update the privacy note's chat section, and its date.
- After main is green, ask Brad to redeploy Cloud Run with `pnpm chat-api:deploy`.
- Rehearse as `docs/release.md` describes, then release `v2.1.0` on Brad's separate go-ahead, check production, and write `docs/releases/v2.1.0.md`.

## The cost of a run

Estimated from spec 021's measured numbers, a corpus of about 20,700 tokens and Haiku 5.5's prices:

| Part | Count | Each | Total |
| --- | --- | --- | --- |
| The first answer, writing the 1-hour cache | 1 | $0.0043 | $0.004 |
| Answers reading the cache | about 50 | $0.0004 | $0.02 |
| The judge, on fact answers only | about 20 | $0.004 | $0.08 |
| One run | | | about $0.11 |

The first real run's measured total goes on a card before any second run. The slice's budget allows about 40 runs, but it should need fewer than 10.

## Tasks, in order

1. Tests from the scenarios, in `tests/023/`: the checks, the judge's parsing, the fingerprint and the CI check, the runner with a scripted model, the workflow's shape, the page from a fixture, the links, the flag's removal, the CSP and the origin. They fail first.
2. The evals harness, until its tests pass with a scripted model.
3. The page, the footer and Inspect links, and the snapshot baselines.
4. The CI job, the pre-push hook and the workflow.
5. Push `evals/023` for the first real run. Bring its cost to Brad on a card, fix any failures through the prompt, and run again. If Haiku 5.5 can't pass, bring the failures and Sonnet 5.5's cost to Brad (D171).
6. The release changes: the flag, the CSP and relock, the origin and the privacy note.
7. The review, every check locally, then show Brad and push after "push". Watch `ci` and `next`.
8. The Cloud Run redeploy on Brad's card, the rehearsal, the release on Brad's go-ahead, the production check and the release record.

## Risks

| Risk | What happens |
| --- | --- |
| Haiku 5.5 slips a pronoun or a framing | The prompt is tightened through a fresh run. If it keeps failing, it goes to Brad (D171). |
| The footer link changes every page's snapshot | Baselines are remade in the pinned container with `pnpm test:visual --update`. |
| A judge verdict is wrong | Its reason shows on `/evals`. A case it misjudges is rewritten, not retried. |
| The evals workspace's $5 runs out | The run fails with the workspace's limit error, and the spend goes to Brad. |
