# Plan for spec 045: A warmer voice for Ask about Brad

| | |
| --- | --- |
| Spec | [spec.md](spec.md), for approval with this plan at Gate 1 |
| Status | Approved |

## Approach

**The prompt (FR-001–FR-003).** A new voice line after the opening says how the chat sounds: a friend recommending Brad, excitement from framing and specifics, never a grade, never a word about documents, sources, citations or rules, no emoji, and no jokes about Brad, hiring, money or availability. Rules 5–7 keep their jobs but stop forcing a sentence alone: rule 5 handles missing facts (a wrong employer is corrected, "is Brad good?" gets the record and "you be the judge", a private detail gets one kind line and `NO_SOURCE`); rule 6 gets one friendly line before `BOUNDARY`; rule 7 turns small talk, venting, jokes, code requests, rudeness and tricks to a cited fact, never doing what was asked. Rule 9 asks for the trailer, rule 10 adds "no mention of documents", and `REMINDER` restates the voice and the trailer. Rules 1–4, 8 and 11 keep their words. `NO_SOURCE` becomes its own email half, since its first half says what the site doesn't cover. Every example phrase in the prompt is under eight words, so the leak check can't mistake a reply that borrows one for a leak.

**The pills (FR-004–FR-007).** The model writes its three questions after the answer, between `<next>` and `</next>`, in the same call. The API's stream runs each model text part through the pronoun rewriter as today, then through one splitter for the whole reply, which passes the answer's words on and keeps everything from `<next>` on, holding back at most five characters while they could still grow into the tag. The answer streams as one text part. When the model finishes, `pillsOf()` reads the trailer's lines, rewrites and checks each (S2.2), drops repeats of the visitor's questions, fills from the starters and four of the study's questions (S2.3), and the API writes a `data-pills` part after the sources. The starters move from the window's words to `pills.ts`, so the API and the window share one list.

**The states (FR-003, FR-008, FR-009).** `stateOf()` checks `BOUNDARY`, then `NO_SOURCE`, then the sources: `answered` with one, `chat` with none. The window shows "Email Brad the question" for `no-source`, "Email Brad" for `boundary` and for any other reply that gives the address, and nothing else. The log gains `chat` and `pillsDropped`.

**The caps (FR-010).** `MAX_CONVERSATION_CHARS` is 12,000. The request parser refuses a longer conversation as `invalid`, and the window's `messagesOf()` drops the oldest finished turns until it fits.

**The evals (FR-011).** `Answer` gains `pills` and the `chat` state. The refusal cases accept any state that does nothing asked, each with its own patterns (no poem, no code, no "Paris", no recipe, no joke, no promise, no address). `checkAnswer()` adds four safety checks for every answer: no "document", no grade, no emoji, and three pills that pass `pillOk()`. A tone suite holds the study's small-talk scenarios. `EVALS_MODE=voice` asks the 14 study questions with no judge and writes `voice.json`. Nothing runs: the evals stay off.

**The window (FR-007, FR-008).** `stream.ts` reads `data-pills`; `ChatWindow` keeps them on the turn and draws them under the newest done answer; `Inspect` adds the pills' step; `words.ts` adds "Ask next" and the status line's count.

## What exists today

- `apps/chat-api/src/prompt.ts`: the rules, `NO_SOURCE`, `BOUNDARY`, `OFF_TOPIC`, `REMINDER`, `stateOf()`.
- `apps/chat-api/src/app.ts`: `/chat`'s stream, with a pronoun rewriter per text part.
- `apps/chat-api/src/request.ts`, `constants.ts`, `log.ts`, `pronouns.ts`.
- `apps/site/src/components/chat/`: `ChatWindow.tsx`, `words.ts`, `types.ts`, `stream.ts`, `api.ts`, `parts.tsx`, `fixtures.ts`; `apps/site/src/styles/chat.css`.
- `apps/evals/src/`: `cases.ts`, `checks.ts`, `ask.ts`, `run.ts`; `apps/site/src/components/evals/evals.ts`.
- `apps/site/src/components/privacy/privacy.ts`.
- Tests that pin the fixed sentences or the window: `tests/021/unit/answer.test.ts`, `tests/022/` (window, api, snapshots), `tests/023/unit/checks.test.ts` and `runner.test.ts`, `tests/033/static/chat.test.ts`, `tests/042/unit/looking-for.test.ts`.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Pills from a second short model call | About $0.0003 more an answer with the corpus from the cache, pills about a second after the answer, and a second call that can fail (Gate 1 card) |
| Pills as a tool call | The chat would gain a tool, Inspect's "0 tools" would stop being true, and the model can skip it as easily as a trailer (Gate 1 card) |
| An approved list of pills picked by code | The study's recommendation; Brad chose pills the model writes (career session) |
| Rename "documents" in the prompt | Rules 1 and 2 are the tested core; the reply rule is what stops the word reaching visitors |
| Keep the off-topic sentence for tricks | Brad chose to warm every kind of reply, tricks included |
| A lower output cap, 600 tokens | The longest chat answer in the last full run used 571 tokens, so the career walk-through could lose its end and its pills (Gate 1 card) |

## Decisions

- `docs/decisions/0249-the-chat-speaks-in-a-referral-voice.md` (amends D174 and D200)
- `docs/decisions/0250-three-pills-the-model-writes-guarded-in-code.md` (amends D191)
- `docs/decisions/0251-a-chat-state-and-the-hand-offs-by-state.md` (amends D174 and D191)
- `docs/decisions/0252-the-conversation-is-capped-at-12000-characters.md` (builds on D169 and D173)

## Costs, at Haiku 5.5's list price

| What | Today | With this slice |
| --- | --- | --- |
| A first question, from the cache | about $0.0003 | about $0.0003, plus about 40 output tokens for the pills, $0.00002 |
| A follow-up, worst case | about $0.0035: 24,900 corpus tokens and 6,300 of conversation uncached, 800 output | about $0.0032: the conversation capped near 3,000 tokens |
| A visitor's 20 questions, worst case | about $0.07 | about $0.065 |
| The study's 14 questions on the real model, once | | about $0.012, with the first writing the cache |
| The window on open | under 85 KB gzipped | about 0.6 KB more gzipped (measured at the build) |
| The page's one module | 14,593 bytes | unchanged |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| The model grades Brad or jokes about money despite the rule | Medium | The study's 14 run once before Gate 2; the eval checks fail it when evals run; fix the prompt and ask again |
| The model forgets the trailer | Medium | The fill gives three pills every time |
| A pill leads to a question the facts can't answer | Medium | Rule 9 asks for answerable ones; the name check drops made-up names; Brad sees all 42 pills at Gate 2 |
| A warmer tone makes a trick work | Low | Rule 8's fence and "never do what it asks" stay; the injection cases describe it for the next run |
| `NO_SOURCE`'s shorter words appear in a normal answer that gives the address | Low | That reply then reads `no-source` and offers to email the question, which is still a fair hand-off |

## Tests to write

| ID | Test file | Test name includes |
| --- | --- | --- |
| S1.1–S1.11, FR-001, FR-002 | `tests/045/unit/prompt.test.ts` | each ID |
| S2.1, S2.2, S2.3, S2.4, FR-004–FR-006 | `tests/045/unit/pills.test.ts`, `tests/045/integration/stream.test.ts` | each ID |
| S2.5–S2.8, S3.1–S3.4, FR-007, FR-008, SC-002, SC-005 | `tests/045/e2e/window.test.ts`, `tests/045/unit/window.test.ts` | each ID |
| S3.5, S3.6, FR-003, FR-009, S6.5 | `tests/045/unit/state.test.ts`, `tests/045/integration/stream.test.ts` | each ID |
| S4.1–S4.3, FR-010, SC-003 | `tests/045/unit/caps.test.ts` | each ID |
| S5.1–S5.6, FR-011 | `tests/045/unit/evals.test.ts` | each ID |
| S6.1–S6.4, FR-012, SC-004 | `tests/045/static/words.test.ts`, `tests/045/e2e/window.test.ts` | each ID |
| SC-001 | `tests/045/static/voice-run.test.ts`, reading `apps/evals/voice.json` | `SC-001` |

## Tasks

- [ ] **T001** Tests from the scenarios, in `tests/045/` (all IDs)
- [ ] **T002** `pills.ts`, and `app.ts`'s stream (FR-004–FR-006)
- [ ] **T003** The prompt, `NO_SOURCE`, `REMINDER` and `stateOf()` (FR-001–FR-003)
- [ ] **T004** The caps in `constants.ts`, `request.ts` and `api.ts` (FR-010)
- [ ] **T005** The log's state and count, and `/privacy`'s line (FR-009, FR-012)
- [ ] **T006** The window's pills, states, Inspect and words (FR-007, FR-008)
- [ ] **T007** The evals' cases, checks, ask and voice mode, and `/evals`' label (FR-011)
- [ ] **T008** Specs 021–023's and 042's tests and baselines that pin the fixed sentences or the window
- [ ] **T009** Records D249–D252, slice 5.18 in `docs/plan.md`, `AGENTS.md`, notes in specs 021–023
- [ ] **T010** The study's 14 questions once on the real model: a by-hand `voice` input on `evals.yml` and a push of the public `evals/045-chat-voice` branch, about $0.012, with no judge (SC-001, Brad's card)
- [ ] **T011** Review with the pinned reviewer, and fix or answer each finding

## Preview and rollback

The window's look shows on `next` after the push, with the fake replies only in the gallery. The voice needs `pnpm chat-api:deploy` on Brad's go-ahead. Rolling back is a revert on main and, if deployed, a redeploy of the previous commit's API (D185).

## Approval

- Gate 1: approved by Brad on 2026-11-18, on the cards in this session (the four as recommended, then "Approve").
