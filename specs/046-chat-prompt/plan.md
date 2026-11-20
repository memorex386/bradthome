# Plan for spec 046: A lighter prompt for Ask about Brad

| | |
| --- | --- |
| Spec | [spec.md](spec.md), for approval with this plan at Gate 1 |
| Status | Approved |

## Approach

**The prompt (FR-001–FR-003).** `SYSTEM_PROMPT` keeps its 14 lines, so rules 1, 2, 4, 8 and 11 keep their words and their places (but for "facts" in place of "documents", and rule 8's one added sentence, after the second voice run), and tests that read a rule by its line still find it. The voice line becomes one sentence about who the chat is. Rules 3, 5, 6, 7 and 9 lose their sample phrases and reply shapes. Rule 10's self-check, which repeated rule 3 and the voice line, becomes the home of the guardrails that were in the voice line: no grade, no talk of documents, sources, citations or rules, and no jokes about Brad, hiring, money or availability. Rule 9 says nothing about length (Brad's card). `REMINDER` keeps the three things that slip in a long conversation (Brad's card). [prompt.md](prompt.md) has every line, old and new.

**The checks (FR-004).** `checks.ts` gains `SCRIPTED`, the old prompt's phrases as one pattern, and `openingOf()`, a reply's first four words. `checkAnswer()` adds "no scripted phrase" for every answer, and "a fresh opening" for a case whose turns hold earlier answers. Each check's detail says "none found" or "found", never the words.

**The voice run (FR-005, FR-006).** `voice.ts` gains three groups: the 14 scenarios as today, three common questions asked three times each, and one five-turn conversation whose turns carry the earlier answers. Each reply gets the voice's checks (no documents, no grade, no emoji, never as Brad, three good pills), "no scripted phrase", and "a fresh opening" against the earlier replies in its conversation or to its question. The record gains each reply's group and a list of openings repeated anywhere in the run. A push of this branch's commit to the public branch `evals/046-chat-voice` runs it, as spec 045's run did, since the branch name holds "voice".

**The records (FR-007).** D253 amends D249. Spec 045's spec and D249 get a line saying so. Spec 045's run moves to `specs/045-chat-voice/voice.json`, and its SC-001 test reads it there.

## What exists today

- `apps/chat-api/src/prompt.ts`: `SYSTEM_PROMPT`, `REMINDER`, `NO_SOURCE`, `BOUNDARY`, `stateOf()`.
- `apps/evals/src/checks.ts`, `voice.ts`, `voice.eval.ts`, `cases.ts`; `apps/evals/voice.json` (spec 045's run).
- Tests that pin the old wording: `tests/045/unit/prompt.test.ts`, `tests/045/unit/evals.test.ts` (an old phrase that passed), `tests/045/static/voice-run.test.ts`, `tests/042/unit/looking-for.test.ts` (rule 10's first words). `tests/021/` and `tests/023/` read the prompt but hold only what stays.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep the voice line and only cut "Lead with the good part" | The other sample openers would become the next repeated opening; Brad asked for the scripting gone |
| A prompt with no numbered rules | Rule 11 names rule 6, the tests and the evals read rules by number, and numbered limits are easier to hold in review |
| Shorten rule 11 | Every clause carries part of D242; nothing could go without losing a guardrail |
| Rewrite repeated openings in code | It would hide the habit rather than remove its cause, and code can't write natural openings |
| A full eval run | The evals are off (D244); the voice run is the look Brad asked for, at about $0.03 |

## Cost

- **The voice run, once:** 28 replies. Spec 045's 14 cost $0.0112, so the 23 fresh asks cost about $0.018. The five-turn conversation's four follow-ups each carry the corpus uncached, about $0.003 each, so about $0.012. About $0.03 in all, on the evals key, from Anthropic's list prices in `spend.ts` (Haiku 5.5: $0.10 a million input tokens, $0.50 a million output). A rerun of one group after a fix costs $0.005–0.015.
- **Live answers:** no worse. The output cap stays 800 tokens, $0.0004 at most, and the shorter prompt sends about 450 fewer tokens, read from the cache at $0.01 a million. Spec 045's bound of $0.0035 an answer, and the $2.50 day and $20 month shutoffs, hold.
- **Length, left to the model (Brad's card):** the same at worst, since the cap holds every answer to 800 tokens. Answers may run two or three times longer, about $0.0001–0.0002 more each, and the window's 12,000-character conversation fills sooner, so older turns drop sooner. The voice run shows the real lengths.
- **What could run away:** nothing new. The run is by hand, once; the API's caps, the visitor limit and the spend shutoffs are unchanged.

## Risks

- A natural prompt gives the model more room: a hello may get a long pitch, or an open question may lean toward praise. Rule 10 and the voice checks catch a grade, and Brad reads every reply before the push.
- With "write one short, friendly line" gone, a pay question may get more than one line before `BOUNDARY`. `stateOf()` reads the sentence wherever it sits, and the run shows S9's reply.
- Longer answers with no length line: an answer cut at 800 tokens loses its trailer, and the fill gives three pills (spec 045's S2.4). The run's replies show how long they run.
- Citations in follow-ups: the five-turn conversation checks them (S4.4).

## Test plan

| ID | Test | Where |
| --- | --- | --- |
| S1.1–S1.4, S2.1–S2.8, FR-001–FR-003, SC-002 | The prompt's lines, kept hashes, cut phrases, quoted words, word counts | `tests/046/unit/prompt.test.ts` |
| S2.9 | `stateOf()` and the stream as spec 045 left them | `tests/021/`, `tests/045/` (unchanged), and `tests/046/unit/prompt.test.ts` for prep's prompt |
| S3.1–S3.6, FR-004 | The scripting checks on made-up replies, and the evals' off line | `tests/046/unit/scripting.test.ts` |
| S4.1, S4.2, FR-005 | The run's groups, questions and record, with a fake asker | `tests/046/unit/scripting.test.ts` |
| S4.3–S4.5, FR-006, SC-001 | The committed run: 28 replies, every check passed, cost under $0.05, follow-ups cited | `tests/046/static/voice-run.test.ts` |
| S5.1, S5.2, FR-007 | D253 indexed, spec 045 and D249 noted, no set phrase in pages or specs | `tests/046/static/records.test.ts` |
| SC-003 | Unchanged caps and prices | `tests/046/unit/prompt.test.ts` |

## Tasks

- [ ] **T001** Tests from the approved scenarios, in `tests/046/`, and the old tests' amendments (045, 042)
- [ ] **T002** `SYSTEM_PROMPT` and `REMINDER` as approved (FR-001–FR-003)
- [ ] **T003** The scripting checks and the voice run's groups (FR-004, FR-005)
- [ ] **T004** Spec 045's run moved to its spec folder; the voice run on `evals/046-chat-voice`, about $0.03 (FR-006)
- [ ] **T005** D253, `docs/plan.md`, notes in spec 045 and D249 (FR-007)
- [ ] **T006** Every check locally, the review skill's reviewer, findings fixed or answered
- [ ] **T007** Gate 2: the replies beside spec 045's; push to main on Brad's "push"; main's `ci`, `next` and "Push on main" green

## Rollout and rollback

The push changes nothing live: the chat API runs the old prompt until `pnpm chat-api:deploy`, on Brad's separate go-ahead (D185). With evals off, the deploy runs no eval check and says so. Rolling back is a revert on main and, if deployed, a redeploy of the previous commit's API.
