---
status: accepted
date: 2026-11-18
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D250
---

# Three pills after every answer, written by the model and guarded in code

## Context and problem statement

The chat's four starters show only on the empty chat. After an answer there's nothing to tap, so a visitor has to think up the next question alone. Brad asked for three follow-up pills so a visitor keeps going and feels guided. Where do the pills come from, how do they reach the browser, and what keeps a bad one out?

## Decision drivers

- Pills should fit the conversation and lead to strong parts of Brad's record.
- A pill must never lead to pay or dates, speak as Brad, hold a private detail, or name something the corpus doesn't.
- The first word of an answer should appear as fast as today, and the cost should stay small.
- The chat has no tools, which Inspect says and Brad counts on.

## Considered options

Where they come from, in the study's ranked order: an approved list picked by code; the model picking from that list; the model writing its own.

How they travel, in the builder's ranked order:

1. A trailer in the same call, between `<next>` tags, which the API cuts off the stream (recommended): about $0.00002 more an answer, no extra wait
2. A second short call after the answer: about $0.0003 more an answer, pills a second later, a second call that can fail
3. A tool call after the text: structured, but the chat would gain a tool

## Decision outcome

Brad chose pills the model writes, in the career session, and the trailer on spec 045's Gate 1 card, both 2026-11-18.

- After each answer the model writes three short questions between `<next>` and `</next>`. The API's stream passes the answer's words through the pronoun rewriter, then one splitter that keeps everything from `<next>` on out of the answer, holding back at most five characters that could still grow into the tag. The answer streams as one text part.
- Each pill passes the pronoun rewriter, then a guard in code that drops one longer than 60 characters, not one question ending in "?", holding "I", "me", "my", "you" or "your", an email, a link or a phone number, asking about pay, dates, references, relocation or a private detail, asking the chat to speak as Brad or drop its rules, naming a capitalized word or number the corpus doesn't hold, or repeating a question asked or a pill shown. The name check stands in for the private-term list, which never ships with the API (D27).
- Fewer than three, and the four starters not yet asked fill, then four questions from the study, so a reply always has three. The trailer is read to 400 characters.
- The API sends one `data-pills` part after the sources. The window shows the newest answer's pills under "Ask next", each a 44 px button that sends itself, as a starter does; Inspect shows how many the model wrote; the status line counts them; the log counts the dropped ones, never their words.
- Amends D191: Inspect shows the pills' step.

### Consequences

- Good, because each answer ends with somewhere to go, at almost no cost.
- Good, because nothing the model writes reaches the browser unchecked.
- Bad, because a model-written pill can still ask something the facts answer thinly; the prompt asks for answerable ones, and the voice run showed Brad all 42.

### Confirmation

Spec 045's tests run the splitter, the guard and the fill on made-up trailers, the API's real stream with a fake model, and the window in the pinned container.

## More information

- Decided by: Brad Thome, in the career session and on spec 045's Gate 1 card, 2026-11-18.
- Spec: [spec 045](../../specs/045-chat-voice/spec.md).
- Amends [D191](0191-inspect-shows-what-the-reply-carries.md). Builds on [D27](0027-the-conventions-batch-for-templates-ids-and-records.md) and [D175](0175-the-chat-logs-numbers-only-never-what-visitors-type.md).
