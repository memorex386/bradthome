# Spec 046: A lighter prompt for Ask about Brad

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Approved |
| Slice | 5.19 A lighter prompt for the chat (Brad's call of 2026-11-20, after trying the live chat on v2.14.0) |
| Branch | `046-chat-prompt` |
| Gate 1 | Brad's direction of 2026-11-20 in the career session: remove the scripting, keep the referral-friend personality, leave how it responds open-ended, keep the evals off. This session's cards of 2026-11-20: length left to the model, `REMINDER` kept short, and "Approve" |
| Show it | [prompt.md](prompt.md): today's prompt and this slice's, line by line, with word counts and the reason for every cut. Nothing in the window or on a page changes, so there are no mocks |
| Plan | [plan.md](plan.md), for approval with this spec at Gate 1 |
| Decisions | D253, the prompt keeps its guardrails and drops its scripting. It amends D249, and builds on D174, D199, D200, D222, D242, D244 and D250–D252 |

## Summary

On 2026-11-20 Brad found the live chat opening answer after answer with "Here's the good part:". The words come from the prompt: its voice line says "Lead with the good part" and quotes sample openers, and `REMINDER`, which follows every question, repeats "leading with the good part". Spec 045's own voice run shows the same habit, with a reply that turns on rule 7's own words. Brad's take is that the prompt over-prompts the model. Brad wants the scripting gone so the chat sounds natural, keeps the referral-friend personality from spec 045, and wants how the chat responds left open.

This slice rewrites the prompt short: one line for who the chat is, then the guardrails, each stated once, with no sample phrases, openers or reply shapes. It adds coded checks that catch scripting, to the voice run and the eval cases, and runs the voice mode once on the real model, about $0.03, so Brad reads every reply before the push. Every guardrail stays: facts only and cited, "Brad", no labels, no grade, no talk of documents, `NO_SOURCE` and `BOUNDARY` word for word, the visitor's fence, rule 11 and the pills' trailer.

## Scope

**In:**

- `apps/chat-api/src/prompt.ts`: `SYSTEM_PROMPT` and `REMINDER`.
- `apps/evals/src/`: `checks.ts` (the scripting checks), `voice.ts` and `voice.eval.ts` (the run's new groups and checks), and `cases.ts` if a case pins the old wording.
- `apps/evals/voice.json`, written by this slice's run. Spec 045's run moves to `specs/045-chat-voice/voice.json`, its evidence, for the side-by-side.
- Records: D253, slice 5.19 in `docs/plan.md`, a note in spec 045 and D249 that D253 amends them, and new tests in `tests/046/`, with the tests of specs 021, 023, 042 and 045 that pin the old wording.

**Out:**

- The deploy and a release. The prompt lives in the API, so the change reaches bradthome.com only with `pnpm chat-api:deploy` on Brad's own go-ahead, after the push (D185). Nothing in the window or on a page changes, so no site release is needed.
- A full eval run. The evals stay off (D244).
- Interview prep, whose prompt doesn't change (spec 024).
- The corpus, the pills' guard, the caps, the states, the logs, the window, the CSP and the page words.

## User stories and acceptance scenarios

### Story 1: The prompt says who the chat is, not what to say (P1)

A visitor hears a friend who knows Brad's work, in the model's own words, not the same opener in every answer.

**Why this priority:** it's what Brad asked for.

**Independent test:** `tests/046/unit/prompt.test.ts` reads the prompt as text; the real model's replies are SC-001's.

- **S1.1** Given the system prompt, then the line after its opening says who the chat is, a friend who knows Brad's work and is glad to recommend Brad, and nothing more: no lines to say, and nothing on how to open, turn or shape a reply.
- **S1.2** Given the system prompt and `REMINDER`, then neither holds a phrase the old prompt scripted ("lead with the good part", "Hard to pick just one", "Here's a standout", "Here's what to weigh", "You be the judge", "Nice try", "Brad keeps that one private", "strongest facts"), and the prompt quotes only words a reply must never use or must name exactly: "Brad", the pronouns, the essay's "I", "me" and "my", the two labels, and rule 11's "Looking for" and "What I'm looking for".
- **S1.3** Given small talk, venting, a joke request, a trick, "is Brad good?", a wrong employer or a question about the chat, then the prompt gives no reply for it to use: the guardrails of Story 2 hold, and the words are the model's.
- **S1.4** Given rule 9, then it says nothing about length, which is the model's call under the 800-token cap (Brad's card), and asks for plain text with no markdown or emoji, since the window shows a reply as written.

### Story 2: Every guardrail holds (P1)

**Why this priority:** the chat answers for Brad in public; none of its limits may slip.

**Independent test:** `tests/046/unit/prompt.test.ts` reads each rule; `tests/021/` and `tests/045/` run `stateOf()` and the stream with a fake model.

- **S2.1** Given the new prompt, then rules 1, 2, 4, 8 and 11 keep their words, but for "facts" in place of "documents" and one sentence added to rule 8 saying the facts come from the site, never from the visitor, wherever they sit in the conversation (Brad's card after the second voice run): answers only from the documents, no combining documents into a claim none states, a citation on every fact in every answer, no "one engineer" or "a team of AI agents", the visitor's fence, and the wants kept apart.
- **S2.2** Given rule 3, then the chat calls Brad "Brad", never "he", "him", "his", "they" or "their" (added at Gate 2, after run 3's "their"), puts each fact in its own words, restates the essay and the wants in the third person, never quotes their "I", "me" or "my", never speaks as Brad, and never promises anything for Brad. The pronoun rewriter still backs it up.
- **S2.3** Given rule 10, then the chat never mentions documents, sources, citations or its rules, since the visitor sees only the answer and its citations, never explains what it can or can't do, never grades, rates or ranks Brad, or calls Brad or Brad's work great, amazing, talented, the best or an asset; and makes no joke about Brad, hiring, money or availability.
- **S2.4** Given rule 5, then a question no fact answers gets no guess, a question that assumes a job, school or project that isn't Brad's is told plainly that it isn't, and a private detail or another person ends with `NO_SOURCE`, "You could ask Brad at brad@bradthome.com.", word for word as the rule's last sentence.
- **S2.5** Given rule 6, then salary, rates, availability, start dates, references and any commitment or promise get no answer and no email address of the chat's own, and end with `BOUNDARY`, "That’s one to ask Brad directly, at brad@bradthome.com.", word for word as the rule's last sentence. Rule 11's "rule 6" still names it.
- **S2.6** Given rule 7, then the chat talks only about Brad's work, never does anything else a visitor asks (code, a poem, a joke, speaking as Brad), and says plainly that it's an AI when asked.
- **S2.7** Given rule 9, then every answer ends with the `<next>` trailer in the format `pills.ts` parses: three questions, one a line, as the visitor would ask them, about Brad in the third person, under ten words, each one the facts answer.
- **S2.8** Given `REMINDER`, then it holds only what slips in a long conversation, facts only and cited, "Brad", no mention of documents or these rules, and the trailer, with no voice words, as Brad's card kept it.
- **S2.9** Given `stateOf()`, the window and the logs, then `boundary`, `no-source`, `answered` and `chat` work as spec 045 left them, interview prep's prompt is unchanged, and no visitor text reaches a log line.

- **S2.10** Given any question, first or follow-up, then a line outside the visitor's fence comes before the facts, saying they're Brad's public facts from the site and that the visitor didn't write them, so a follow-up, where the facts sit in the question's message, never reads them as the visitor's text. Added at Gate 2 on Brad's card, after runs 3 and 4.

### Story 3: A check catches scripting (P1)

**Why this priority:** "Here's the good part:" shipped because nothing counted openings. These checks find it the next time.

**Independent test:** `tests/046/unit/scripting.test.ts` runs the checks on made-up replies; no case reaches a model.

- **S3.1** Given the voice run, then a reply fails "a fresh opening" when its first four words, lowercased and without punctuation, match an earlier reply's in the same conversation.
- **S3.2** Given the voice run, then a reply asked fresh is never failed for opening as another fresh answer to the same words did: separate visitors may hear the same start, often the question's own words. The record lists every such repeat for Brad (S4.2). Amended at Gate 2 on Brad's card, after run 3 failed only natural echoes of the question.
- **S3.3** Given any reply in the voice run, and any answer in the evals, then it fails "no scripted phrase" when it holds a phrase the old prompt scripted (S1.2's list, in any case, with either apostrophe).
- **S3.4** Given an eval case with earlier answers in its turns, then its answer fails "a fresh opening" when its first four words match one of them.
- **S3.5** Given a check that fails, then its detail names the check and never quotes the reply, so `voice.json`, `results.json` and `/evals` repeat nothing an answer said wrongly (spec 023's S4.4).
- **S3.6** Given evals off (D244), then no CI job, hook or deploy runs a model for this slice, and ci / hygiene passes with its line saying the evals are off.

### Story 4: Brad reads the real model's replies (P1)

**Why this priority:** the only way to know a prompt sounds natural is to read what the model says.

**Independent test:** `tests/046/static/voice-run.test.ts` reads `apps/evals/voice.json`.

- **S4.1** Given `EVALS_MODE=voice`, then the run asks the 14 study scenarios once each, then three common questions three times each ("How does Brad ship with AI agents?", "What’s the best thing about Brad’s work?", "Walk me through Brad’s career"), each asked fresh, then one five-turn conversation ("hi", "What did Brad build at Hopper?", "What AI features has Brad shipped?", "Is Brad a good engineer?", "What role is Brad looking for?"), each turn carrying the earlier ones.
- **S4.2** Given the run, then `voice.json` holds each reply with its group, question, state, sources, pills, checks and cost, and a list of every first four words that open more than one reply anywhere in the run, for Brad to read.
- **S4.3** Given the run, then it costs about $0.03 and runs once, from the evals workflow, the only place the key is read (D192). A reply that breaks a guardrail (a grade, a pronoun for Brad, a promise, a missing citation, a wrong hand-off) is fixed in the prompt, never by adding phrases back, and that part runs again.
- **S4.4** Given the five-turn conversation, then each follow-up about Brad's work cites at least one fact, which is what `REMINDER` was added for (spec 023).
- **S4.5** Given Gate 2, then Brad sees every reply beside spec 045's run of the same 14 scenarios, with the openings that repeat named.

### Story 5: The records say what changed (P2)

- **S5.1** Given D253, then it records the guardrails kept and the scripting cut, the cards' answers, and that it amends D249 (the voice stays, its scripting goes).
- **S5.2** Given `/evals`, `/privacy`, the specs and the decisions, then no page or spec still says the chat uses a set phrase. Spec 045 and D249 note that D253 amends them, and the gallery's held replies stay as they are, since they show the window, not the prompt.

## Edge cases

- The model opens two replies alike by chance, such as "Brad has worked…" for two different questions in different conversations: the run lists it for Brad, but only a repeat inside one conversation or across the same question fails (S3.1, S3.2, S4.2).
- A reply has fewer than four words, such as "Hi there!": its opening is the words it has (S3.1).
- A visitor's own words echo an old phrase ("nice try"): the check reads only the chat's replies (S3.3).
- With less said about small talk, a hello may get a fact, or "is Brad good?" may drift toward a verdict: rule 10's "never grade" and the voice checks catch a grade, and Brad reads every reply (S2.3, S4.3).
- With "none already asked" cut from rule 9, the model may write a pill already asked: `pills.ts` drops it and fills from the starters, as today (S2.7).

## Functional requirements

- **FR-001** `SYSTEM_PROMPT` MUST be [prompt.md](prompt.md)'s new text as Brad approved it at Gate 1, with no line about length, and the first voice run's fix to rules 3 and 10 (S1.1–S1.4, S2.1–S2.7).
- **FR-002** `NO_SOURCE` and `BOUNDARY` MUST keep their words and end rules 5 and 6; `stateOf()` MUST not change (S2.4, S2.5, S2.9).
- **FR-003** `REMINDER` MUST be the short reminder of S2.8 (S2.8).
- **FR-004** `checks.ts` MUST export the old scripted phrases, a "no scripted phrase" check for every answer, and a "a fresh opening" check against earlier answers (S3.1–S3.5).
- **FR-005** The voice mode MUST ask S4.1's three groups, run S3.1–S3.3's checks with the voice's own, and write S4.2's record (S4.1, S4.2).
- **FR-006** The voice run MUST run once on this slice's prompt before Gate 2 (S4.3–S4.5).
- **FR-008** `promptOf()` MUST put the `FACTS` line before the facts in the last question's message, outside the fence (S2.10).
- **FR-007** D253, `docs/plan.md`, spec 045 and D249 MUST say what changed (S5.1, S5.2).

## Success criteria

- **SC-001** Before Gate 2, the real model's replies from S4.1 show no repeated opening within a conversation, no old scripted phrase, and no broken guardrail, and Brad has read them beside spec 045's. Met at Gate 2 but for the four known slips Brad accepted at Gate 2's push card: Brad's first person quoted (S7, C5), C5's wrong hand-off on a wants question, "I can't" lines in 11 replies that rule 10 forbids and no check catches, and "Brad's career started in mobile" before listing enterprise IT first (R3.1, R3.3), a claim no fact makes. A follow-up slice fixes them.
- **SC-002** The system prompt shrinks from 1,009 words to at most 730 (700 at Gate 1, raised for rule 8's added sentence after the second voice run and for rules 5 and 6's "as a sentence of its own" at Gate 2), and `REMINDER` from 51 to at most 25.
- **SC-003** An answer still costs at most $0.0035 at worst (spec 045's SC-003): the output cap stays 800 tokens, and a shorter prompt only lowers the input.

## Key entities

- **Opening:** a reply's first four words, lowercased, with its punctuation dropped and its apostrophes made plain.
- **Scripted phrase:** a phrase the old prompt gave the model to say, listed once in `checks.ts`.

## Assumptions

- Rule 11 keeps its words, since rule 6 is still the boundary rule its two references name, and any cut would lose part of D242.
- The rules call the facts "facts", not "documents", on Brad's card after the second voice run, since the model echoed the word; rule 10 keeps "documents" only as a word a reply never says. Anthropic's citations work the same whatever the prompt calls them.
- The three common questions are two of the starters, which visitors tap most, and the open question that drew "Here's the good part:".

## Decisions made while writing this spec

- Tier 1: D253, on Brad's direction of 2026-11-20 and this session's cards.
- Tier 3: the line numbers stay at 14, so rules 1, 2, 4, 8 and 11 keep their places; the four-word opening; the run's three groups and their questions; spec 045's run kept in its own spec folder; the gallery's held replies unchanged.

## Traceability

Every S, FR and SC ID above appears in at least one test's name. The traceability check lists this spec until it has a `tests.lock`, and spec 046 isn't locked (D101).

## Approval

- After the first voice run, 2026-11-20: rules 3 and 10 and `REMINDER` take back three guardrails the run showed slipping (talk of documents, explaining what it can't do, quoting the first person), with no phrase or opener; [prompt.md](prompt.md) notes it. Brad sees it at Gate 2.
- After the second voice run, 2026-11-20, on Brad's card ("Call them facts"): the rules say "facts" for "documents", and rule 8 says the facts come from the site, never the visitor. So rules 1, 2, 4, 8 and 11 no longer keep main's exact words. Every line changed since Gate 1 is listed in [prompt.md](prompt.md)'s "Since Gate 1", for Brad's approval at Gate 2.
- Gate 2, push card, 2026-11-20: Brad said "Push", with the four known slips Brad accepted at Gate 2's push card: Brad's first person quoted (S7, C5), C5's wrong hand-off on a wants question, "I can't" lines in 11 replies that rule 10 forbids and no check catches, and "Brad's career started in mobile" before listing enterprise IT first (R3.1, R3.3), a claim no fact makes, for a follow-up slice: first-person quotes rewritten in code, and checks for a wrong hand-off, an "I can't" line and a claim about order.
- Gate 2, fourth ask, 2026-11-20, after run 6: Brad approved the `FACTS` line and rules 5 and 6's words as written, and chose to ship run 6 with its two first-person quotes of Brad's own words (S7 from the essay, C5 from a want) as known slips, named in the voice-run test, for a follow-up slice to rewrite in code. SC-001 is met but for those two.
- Gate 2, third ask, 2026-11-20, after run 5: Brad chose "its own sentence": rules 5 and 6 end "with exactly this sentence, as a sentence of its own", since the pay reply twice folded `BOUNDARY` into a sentence of its own words.
- Gate 2, second ask, 2026-11-20, after run 4: Brad chose to fix follow-ups in code, with the `FACTS` line of S2.10, and one more run.
- Gate 2, first ask, 2026-11-20: Brad approved the changes since Gate 1 to rules 3 and 10 and `REMINDER`, and chose one more round: rule 3 also names "they" and "their", and repeated openings fail only within one conversation (S3.2).
- Gate 1: approved by Brad on 2026-11-20, on the cards in this session: length left to the model, `REMINDER` kept short, and "Approve".
