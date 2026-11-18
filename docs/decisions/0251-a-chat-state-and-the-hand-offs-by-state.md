---
status: accepted
date: 2026-11-18
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D251
---

# A chat state for small talk, and the hand-offs by state

## Context and problem statement

`stateOf()` tagged a reply `boundary` by the boundary or off-topic sentence, and `no-source` when it cited nothing, and the window showed "Email Brad" or "Email Brad the question" from that. Under the referral voice (D249) small talk has no source and no fixed sentence, and the off-topic sentence is gone, so "hi" would read as `no-source` and offer to email Brad a hello. How does the window tell the replies apart?

## Decision drivers

- The hand-offs to Brad for pay, dates and private details keep working.
- A hello shows no button; the pills do the guiding.
- Logs and Inspect can tell a cited answer from small talk, as numbers only (D175).

## Considered options

The options are listed in the builder's ranked order.

1. A new `chat` state for a reply with no source and no fixed sentence (recommended)
2. Small talk as `no-source`, with "Email Brad the question" under a hello
3. Small talk as `answered`, with no button, but logs can't tell it from a cited answer

## Decision outcome

Chosen option 1, on spec 045's Gate 1 card, 2026-11-18.

- `NO_SOURCE` becomes its own email half, "You could ask Brad at brad@bradthome.com.", since its first half said what the site doesn't cover. The model writes one kind line before it.
- `BOUNDARY` keeps its words.
- `stateOf()` reads `boundary` from the boundary sentence, `no-source` from the no-source sentence, `answered` from a checked source, and `chat` otherwise.
- The window shows "Email Brad the question", with the question in the mail, for `no-source`; "Email Brad" for `boundary`, and for any other reply that gives brad@bradthome.com, as a thanks may; and nothing else.
- The log line and Inspect carry `chat`, and `/evals` reads it as "Small talk, with no source".
- Amends D174's "with no source it says so", and D191's states.

### Consequences

- Good, because each hand-off still appears where it should, and none where it shouldn't.
- Bad, because a reply that forgets the no-source sentence and cites nothing reads as `chat`, with no hand-off; the eval cases for private details expect `no-source` when the evals run.

### Confirmation

Spec 045's tests read each state from the API's real stream, and the window's hand-off for each in the pinned container.

## More information

- Decided by: Brad Thome, on spec 045's Gate 1 card, 2026-11-18.
- Spec: [spec 045](../../specs/045-chat-voice/spec.md).
- Amends [D174](0174-the-chat-answers-only-from-the-public-corpus-with-sources.md) and [D191](0191-inspect-shows-what-the-reply-carries.md).
