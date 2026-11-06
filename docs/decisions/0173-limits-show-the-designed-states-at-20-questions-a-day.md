---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D173
---

# Limits show the designed states, at 20 questions a day

## Context and problem statement

What does a visitor see when their own limit, or the chat's shutoff, is reached?

## Decision drivers

- The rest of the site keeps working whatever the chat's state.
- The limit must count a visitor without identifying them.

## Considered options

The options are listed in the builder's ranked order.

1. The designed states, at 20 questions per visitor a day (recommended)
2. Hide the chat while it's off
3. The designed states, at 10 questions a day

## Decision outcome

Chosen option 1, as recommended. Each visitor may ask 20 questions a day. The API counts them by a one-way code made from the visitor's network address with a salt that changes daily, and never stores the address itself. The chat window shows the designed states:

- No source: the chat says so and offers to email Brad.
- A boundary: salary, start dates and promises go to Brad.
- The visitor's daily limit: when it resets, with links to the résumé and email.
- Paused, at a spending cap: the chat is resting until the next day or month, with links to the PDF and email.
- Failed: the question is kept, with a Try again button.

### Consequences

- Good, because it costs nothing extra and needs no request on page load.
- Bad, because visitors who share a network address share a limit.

### Confirmation

Slice 4.2's tests cover the limit and the shutoff replies, and slice 4.3's tests and snapshots cover each state.

## Pros and cons of the options

### The designed states, 20 a day

- Good, because a real interviewer rarely needs more.

### Hide the chat

- Bad, because every page load has to ask the API, which costs a request and may start the container.

### 10 a day

- Good, because it leaves more budget for others.
- Bad, because an interviewer preparing in depth may hit it.

## More information

- Decided by: Brad Thome, on a choice card in the phase 4 planning session, 2026-11-06.
