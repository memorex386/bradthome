---
status: accepted
date: 2026-11-18
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D252
---

# The conversation is capped at 12,000 characters

## Context and problem statement

Brad's guard against a rogue chat is a hard cap on a conversation's tokens and cost. The API keeps no conversation: each question carries up to 10 messages, a question of 1,000 characters and an answer of 4,000 each, and a follow-up reads the whole corpus, about 24,900 tokens, uncached. The visitor's 20 questions a day and the $2.50 day and $20 month limits bound the totals (D169, D173). What caps hold for one answer?

## Decision drivers

- A small worst case for one answer and one visitor's day.
- The longest chat answer in the last full run used 571 tokens, the career walk-through, so a lower output cap could cut answers and their pills.
- The window should never send what the API refuses.

## Considered options

The options are listed in the builder's ranked order.

1. Cap the conversation at 12,000 characters, keep 800 output tokens and 10 messages, and cap the pills (recommended): an answer at worst about $0.0032, a visitor's day about $0.065
2. Tighter: also 600 output tokens and 8,000 characters, about $0.0030 at worst, with a risk of cut answers
3. No new caps but the pills': about $0.0035 at worst

## Decision outcome

Chosen option 1, on spec 045's Gate 1 card, 2026-11-18.

- `MAX_CONVERSATION_CHARS` is 12,000. The API refuses a longer conversation as `invalid`, and the window drops its oldest finished turns until the conversation fits.
- `MAX_OUTPUT_TOKENS` stays 800 and `MAX_MESSAGES` 10. At most three pills of 60 characters reach the browser, from a trailer read to 400 characters (D250).
- `QUESTIONS_PER_DAY` stays 20, and the day and month limits stay.

### Consequences

- Good, because one answer's input stays near 28,000 tokens at worst.
- Bad, because a long conversation forgets its oldest turns sooner, which the model rarely needs.

### Confirmation

Spec 045's tests check the API's refusal, the window's trimming and the worst-case arithmetic.

## More information

- Decided by: Brad Thome, on spec 045's Gate 1 card, 2026-11-18.
- Spec: [spec 045](../../specs/045-chat-voice/spec.md).
- Builds on [D169](0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md) and [D173](0173-limits-show-the-designed-states-at-20-questions-a-day.md).
