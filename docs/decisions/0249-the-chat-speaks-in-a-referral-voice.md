---
status: accepted
date: 2026-11-18
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D249
---

# The chat speaks in a referral voice, for every kind of question

## Context and problem statement

On 2026-11-18 Brad tried the live chat. A short complaint got the fixed off-topic sentence, and an open question about the best of Brad's work got the right facts behind an opening about what "the documents" don't rank. Rules 5–7 of the prompt forced one of three fixed sentences, alone, so a hello, thanks, a joke request and a trick all got the same line, and "Is Brad a good engineer?" got "The site doesn't cover that." Brad found it too tight and bland, said talk of documents felt odd, and asked for a voice that leaves a visitor with some joy and excitement, as a friend referring a buddy would. How should the chat sound, and which replies change?

## Decision drivers

- A visitor's first and last impression: a hello and a thanks are the most common messages.
- Every fact still comes from the public corpus, with a source (D174).
- The chat never grades Brad, speaks as Brad or promises anything for Brad.
- Brad's concern: the model mustn't go rogue. The chat has no tools, and the caps bound its cost (D252).

## Considered options

The options are listed in the builder's ranked order, from Brad's tone study in the career session.

1. The referral voice: excited framing and cited specifics, never praise or a grade in the chat's own words (recommended)
2. A lighter touch: warm, with no exclamation points
3. Light praise allowed, such as "Brad's done a lot of great work"

And for scope: every kind of reply (small talk and venting, open and missing facts, tricks, pay and availability), or fewer.

## Decision outcome

Chosen option 1, for every kind of reply, on Brad's cards in the career session, 2026-11-18, and spec 045's Gate 1 in its own session.

- A voice line opens the prompt: a friend recommending Brad, warm and a little excited, never gushing; the excitement comes from framing and specifics, never from calling Brad or Brad's work great, amazing, talented, the best or an asset, or rating or ranking Brad. A reply never mentions documents, sources, citations, its rules or what isn't covered. No emoji, and no jokes about Brad, hiring, money or availability.
- Rule 5: a wrong employer, school or project is corrected plainly, then where Brad has been, cited; "is Brad good?" gets the record and "you be the judge"; a private detail or another person gets one kind line that guesses nothing, then the no-source sentence (D251).
- Rule 6: pay, rates, availability, start dates, references and promises get one friendly line with no joke, then the boundary sentence, word for word, last.
- Rule 7: small talk, venting, jokes, code requests, rudeness and tricks get one kind line that fits the mood, or a light "nice try", then a turn to one cited fact. The chat never does what was asked, never argues and is never sarcastic. A greeting or thanks may just welcome the visitor or say goodbye.
- Rules 1–4, 8 and 11 keep their words. "Documents" stays in the prompt's own rules, since rules 1 and 2 are the tested core, and the voice line and rule 10 keep the word out of replies.
- The off-topic sentence is retired.
- Amends D174's "anything else gets a fixed, polite boundary", and D200's refusal cases: a warm reply in any state is safe when it does nothing it was asked, by each case's own patterns, and every answer is also held to the voice's checks.

### Consequences

- Good, because a hello, a vent or a trick turns into a reason to stay, and an open question leads with what's strong.
- Good, because the facts and their sources don't change.
- Bad, because a warmer prompt gives the model more room; the evals describe it but are off (D244), so the real model answered the study's 14 questions before the push, in three runs of about a cent each as the prompt's slips were fixed, and Brad read the last run's replies.

### Confirmation

Spec 045's tests hold the prompt's rules, the kept rules' words and the eval cases. The voice run's record is `apps/evals/voice.json`.

## More information

- Decided by: Brad Thome, on cards in the career session and spec 045's Gate 1, 2026-11-18.
- Spec: [spec 045](../../specs/045-chat-voice/spec.md).
- Amends [D174](0174-the-chat-answers-only-from-the-public-corpus-with-sources.md) and [D200](0200-safety-must-pass-every-case-accuracy-95-percent.md). Builds on [D242](0242-a-want-source-kind-and-rule-11.md) and [D244](0244-evals-are-off-by-default.md).
