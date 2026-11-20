---
status: accepted
date: 2026-11-20
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D255
---

# The offer agent's four claims

## Context and problem statement

The Fintech AI card has one claim, that Brad worked with Hopper's leaders to launch a flight-shopping assistant and generative offers that matched or exceeded static-offer attach rates. The replay (D254) shows the offer agent as an illustration, so the record needs the claims: what it was, how it was grounded, how it shipped, and how it did. Which words go public?

## Decision drivers

- Only words Brad approves go public, through the export (D44), with no Hopper internal name, pay, people's names or why the team ended.
- A figure published is one Brad would stand behind in an interview, since the chat repeats it.

## Considered options

The cards' options, in the builder's ranked order:

1. What it was: "Built most of" (recommended), "Led and built", or "Co-built".
2. How it was grounded: as drafted (recommended), shorter, or none.
3. How it shipped: as drafted (recommended), without the eval gate, or none.
4. The result: no number (recommended), the A/B test's figure, or no result claim.
5. Dates: none (recommended), "in 2026", or February to June 2026.

## Decision outcome

On Brad's cards in spec 047's session, 2026-11-20, options 1–3 and 5 as recommended. For the result Brad gave the A/B test's measured lift, 12.6%, and chose to publish it. The claims, `hopper-fintech-ai-2` to `-5`:

- "Built most of an AI sales agent for Hopper's flight booking: in place of the static disruption and cancellation offers, a conversation explained each offer against the traveler's own flight, answered questions from the terms, and let them accept or decline by tapping or typing."
- "Grounded it in the flight, traveler and offer data, fetched before the first word, plus retrieval over delay data, past conversions and the terms, and a news and weather search tool."
- "Shipped it behind an LLM-as-judge eval gate, with LLM observability, OpenTelemetry tracing, alerts and a kill switch."
- "In an A/B test against the static offers, it lifted the attach rate by 12.6% and ramped to 100% of app traffic."

They come in through `pnpm content:export`, each with its sparkle (D230) and `#receipt-` anchor (D229), so the chat's corpus gains them, and each gets an eval case, which runs only when Brad turns the evals on (D244).

### Consequences

- Good, because the card says what Brad built, how and how it did, in words the replay illustrates.
- Bad, because the 12.6% is Hopper's figure, published from Brad's account with no public source.

### Confirmation

Spec 047's S4.1–S4.5: the built card's words, their sparkles and anchors, the corpus and the eval cases.

## More information

- Decided by: Brad Thome, on the session's cards in spec 047.
