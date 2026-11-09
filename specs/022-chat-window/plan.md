# Plan for spec 022: The chat window

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved 2026-11-08 |
| Status | Approved |

## Approach

The window is one React component, `ChatWindow.tsx`, whose state is the conversation: a list of turns, each with its question, status, words, sources and numbers, plus the chat being off. It takes a `Transport`, so the tests and the gallery give it their own, and an `initial` state, so the gallery draws each held state on the server with no script.

- **`api.ts`** is the real transport. For each question it fetches `/challenge`, solves it, calls back so the window moves from K1 to A3, then posts `{ altcha, messages }`. A refusal's JSON maps to K2, A10, A11, A12 or the unavailable answer (`refusalOf`). An answer's body goes to the stream reader. `messagesOf` builds spec 021's UI messages from the finished turns, keeping the newest four within the API's limits (S2.6).
- **`stream.ts`** reads the AI SDK's UI message stream as server-sent events and yields text, sources, numbers and errors. It's about 70 lines, in place of the AI SDK's 50 KB client (D188).
- **`altcha.ts`** solves with `altcha-lib`'s `solveChallenge` and its WebCrypto PBKDF2 on the page, with a 30-second limit. The challenge's cost is spec 021's, about a second on a phone; the manual pass measures it.
- **`corpus.ts`** fetches `/corpus.json` once, on the first opened source, and turns a bradthome.com link into a path on the current site (S3.2).
- **`inspect.ts`** prices the reply's tokens from a copy of the API's `PRICES`, which a test holds equal, since the API's module also imports Node's crypto and can't load in a browser (D191).
- **`words.ts`** holds every word, with the 20 questions from the API's constants (FR-011).
- **`Ask.astro`** renders the button and an empty `<dialog>` in the hero, unless the build is a release (D190). The button is hidden by CSS when scripting is off (S1.5), as spec 017's Copy is.
- **`ask.client.ts`**, imported by the one module, wires the button: the first press `import()`s `mount.tsx`, which holds React and draws the window into the dialog, then `showModal()`. Escape and the backdrop close it, and the dialog returns focus to the button. The whole file sits behind `__BRADTHOME_CHAT__`, a constant `astro.config.mjs` defines from the flag, so a release build's bundler drops it and the chunk.
- **`chat.css`** styles it on spec 009's tokens, with a few warm `light-dark()` pairs for the limit and failure notes, and keeps all motion in the no-preference query.
- **The gallery** maps `fixtures.ts`'s held states to frames at `/design-system#chat`.
- **The release flag** is `scripts/site/release.ts`, and `release.yml`'s build step sets `BRADTHOME_RELEASE=1`.

## The script budget

Measured on this branch's build, against the same build with the release flag:

| What | Gzipped |
| --- | --- |
| The one module, on every phase 3 page | 3.5 KB, up from 2.4 KB in a release build, for the loader and Vite's chunk preloader |
| The window's chunk, on the first open | 8.0 KB |
| React and react-dom, on the first open | 67.5 KB |
| A shared helper chunk, on the first open | 1.0 KB |
| Total on the first open | about 77 KB |

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| The AI SDK's `useChat` | About 50 KB more for streaming the window already does in 70 lines (D188). |
| ALTCHA's own widget | A checkbox the visitor doesn't need, about 30 KB, and a worker that needs `worker-src blob:`. |
| A Web Worker for the solve | The challenge's cost is low enough for the page; a worker adds a CSP rule. |
| A mock API mode in the site for "Show it" | Shipping fake replies in the site's code. The gallery draws each state on the server instead, and the tests fake the API in Playwright. |
| A check of the address in the browser | Live would still load the check (D190). |

## Risks

| Risk | What we do |
| --- | --- |
| The e2e tests' CSP, from `firebase.json`, refuses the API's origin | The fake API's test rewrites the page's header with the preview's own `withChatApi`, as previews and `next` serve it. |
| The solve is slow on an old phone | A 30-second limit ends in K2, and the manual pass times it on a phone. |
| The API changes under the federation session | The tests use the API's own constants and shapes, so a change fails them. |
| A release build differs from what CI tests | S9.1 builds with the flag and finds no trace of the chat. |
| Spec 003's lock changes | The amendment is one folder's exception, with its card (D188) and a relock. |
| Other specs' checks see the button | Specs 009–018's snapshots, spec 011's Tab order, the one module's size budgets in specs 016–018 and spec 017's mail-link check change with dated notes in each spec. The chat's buttons meet spec 009's 44-pixel rule. |

## Tests to write

| ID | Test file | Test name includes |
| --- | --- | --- |
| S2.3–S2.6, S5.1, S5.2, S6.1–S6.5, FR-003 | `tests/022/unit/api.test.ts`, against spec 021's API in-process | each ID |
| S2.3, S2.4, S3.2, S4.1, S4.2, S5.1, S5.2, S6.1, S8.2, S10.1, FR-006, FR-011 | `tests/022/unit/window.test.ts` | each ID |
| S1.4, S9.1, S9.2, S9.3, FR-001, FR-009, FR-010, SC-002, SC-005 | `tests/022/integration/build.test.ts`, with a release build and a next build | each ID |
| S10.2 | spec 003's amended `tests/003/static/site.test.ts` | FR-002 |
| S1.1–S1.5, S2.1–S2.7, S3.1, S3.3, S5.1, S5.2, S6.1–S6.5, S8.1, S8.2 | `tests/022/e2e/chat.test.ts`, with the fake API | each ID |
| S7.1–S7.4, FR-007, SC-004 | `tests/022/e2e/a11y.test.ts` | each ID |
| S10.1, SC-001 | `tests/022/e2e/visual.test.ts`, baselines in `tests/snapshots/022/` | each ID |
| SC-003 | CI's lighthouse job | – |
| SC-006 | `evidence/manual-pass.md`, by hand | – |

## Tasks

- [x] **T001** Tests from the scenarios, and spec 003's amended check with its relock
- [x] **T002** The build, until the unit, integration and e2e tests pass, with new baselines from `pnpm test:visual`: spec 022's 52, and specs 009–018's home and gallery snapshots, which now show the button
- [x] **T003** The release flag in `release.yml`
- [ ] **T004** The manual pass: keyboard, screen reader, reduced motion, and a few real questions on `next` after the push
- [x] **T005** Review with the pinned reviewer, and fix or answer each finding: four findings, all fixed. A page the API refuses shows the unavailable answer rather than K2, since the API's 403 has no CORS header and the browser sees only a failed fetch; the fake API's refusal drops its CORS header to match. The status and copy words moved to `words.ts`. The site's analytics skips clicks inside the chat, behind the release constant
- [x] **T006** `docs/plan.md`, `docs/release.md` and AGENTS.md: the flag, and 4.3 built
- [ ] **T007** Gate 2: Brad says push; then main's `ci` and `next` green, and live without the chat

## Preview and rollback

No pull requests while D161 holds, so the window first shows on `next` once it's on main. Until then the gallery and the home show it in a local build. Rolling back is a revert commit; live never has the chat, so a revert changes nothing there.

## Approval

- Gate 1: approved by Brad on a card in the slice 4.3 session, 2026-11-08
