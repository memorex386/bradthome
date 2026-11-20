---
status: accepted
date: 2026-11-20
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D253
---

# The chat's prompt keeps its guardrails and drops its scripting

## Context and problem statement

On 2026-11-20 Brad tried the live chat and found it opening answer after answer with "Here's the good part:". The words came from the prompt: spec 045's voice line said "Lead with the good part" and quoted sample openers, and `REMINDER`, sent after every question, repeated "leading with the good part". Spec 045's own voice run showed the same habit, with a reply that turned on rule 7's words. Brad's view is that the prompt over-prompts the model. Brad still wants the referral-friend personality of D249, but wants how the chat responds left open. How much of the prompt should tell the model what to say?

## Decision drivers

- A visitor should hear a friend who knows Brad's work, not the same opener in every answer.
- Every guardrail of D174, D199, D200, D222, D242 and D249–D252 still holds.
- The window's states depend on `NO_SOURCE` and `BOUNDARY` word for word (D251).
- Code already backs some rules: the pronoun rewriter, the pills' guard, `stateOf()` and the caps.

## Considered options

1. One line for who the chat is, then the guardrails, each once, with no sample phrases, openers or reply shapes (recommended)
2. Keep spec 045's voice line and cut only "Lead with the good part"
3. Keep the prompt and rewrite repeated openings in code

## Decision outcome

Chosen option 1, on Brad's direction in the career session and the Gate 1 cards of spec 046, 2026-11-20.

- The voice line says only who the chat is: a friend who knows Brad's work and is glad to recommend Brad, warm and genuine, in its own words.
- Every quoted sample phrase goes, with every instruction on how to open, turn or shape a reply, and the scripted replies for small talk, tricks and "is Brad good?". How the chat answers them is the model's call, inside the rules.
- The guardrails stay, each once: facts only and cited with no combining (rules 1 and 2, word for word); "Brad", each fact in the model's own words, the essay and the wants in the third person, never as Brad, no promises (rule 3, shortened); no "one engineer" or "a team of AI agents" (rule 4, word for word); no guess, a wrong premise said plainly, `NO_SOURCE` for a private detail (rule 5); `BOUNDARY` for pay, dates, references and promises, with no address of its own (rule 6); only Brad's work, nothing else a visitor asks, an AI when asked (rule 7); the visitor's fence (rule 8, word for word); plain text, no markdown or emoji, and the `<next>` trailer (rule 9); since the visitor sees only the answer and its citations, no talk of documents, sources, citations or rules, and no explaining what it can or can't do, then no grade, and no jokes about Brad, hiring, money or availability (rule 10); and the wants (rule 11, word for word).
- Lines that only repeated what code enforces go: rule 10's self-check on pronouns, and rule 9's "none already asked" and its list of pill topics, which `pills.ts` drops and fills.
- **Length (card):** left to the model, under the 800-token cap. Rule 9 no longer says "a few sentences".
- **`REMINDER` (card):** kept, cut from 51 words to 25: facts only, each cited, "Brad", no mention of documents or these rules, and the trailer, with no voice words. Spec 023's evals added it because follow-up answers dropped their citations.
- The prompt goes from 1,009 words to 699.
- **After the first voice run:** the model, with each guardrail said once, spoke of "the documents" and explained what it can't do in 11 of 28 replies, and twice quoted Brad's first person. Rule 3, rule 10 and `REMINDER` take those guardrails back, as above, with no phrase or opener.
- Coded checks now catch scripting: every eval answer and every voice reply fails on a phrase the old prompt scripted, and on an opening of four words that repeats an earlier answer in its conversation or, in the voice run, another answer to the same question.

### Consequences

- Good, because the model's replies are its own, and the checks find a repeated opening before Brad does.
- Good, because the prompt is a third shorter, so each answer sends fewer tokens.
- Bad, because the model has more room: a hello may get a fact, or answers may run longer. Rule 10 and the voice checks catch a grade, and the voice run shows the real replies before the push.

### Confirmation

Spec 046's tests hold the prompt's words, the kept rules' hashes and the scripting checks. The voice run's record is `apps/evals/voice.json`, beside spec 045's in `specs/045-chat-voice/voice.json`.

## More information

- Decided by: Brad Thome, in the career session and on spec 046's Gate 1 cards, 2026-11-20.
- Spec: [spec 046](../../specs/046-chat-prompt/spec.md).
- Amends [D249](0249-the-chat-speaks-in-a-referral-voice.md): the voice stays, its scripting goes. Builds on [D174](0174-the-chat-answers-only-from-the-public-corpus-with-sources.md), [D244](0244-evals-are-off-by-default.md) and [D250](0250-three-pills-the-model-writes-guarded-in-code.md)–[D252](0252-the-conversation-is-capped-at-12000-characters.md).
