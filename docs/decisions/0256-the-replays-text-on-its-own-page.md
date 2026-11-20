---
status: accepted
date: 2026-11-20
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D256
---

# The replay's whole text, on a page of its own

## Context and problem statement

The replay (D254) moves, so screen readers and visitors with no script need its whole conversation and trace as text. Measured on 2026-11-20, the home's HTML was 13,095 of D246's 14,000 bytes with brotli, and the finished frame as plain HTML adds about 2,400; past about 14.6 KB, spec 043 measured the phone LCP over its 2.0 s budget. Where do the text and the no-script frame go?

## Decision drivers

- The home keeps its byte and LCP budgets.
- Everyone can read the whole conversation, both ways it goes, with or without script.

## Considered options

1. Their own page: the home holds the box, the label and a link to `/offer-agent`, which shows both paths' finished frames as plain HTML (recommended)
2. Raise the budgets: the frame and text in the home's HTML, with D246's budget at about 15,700 bytes and the LCP budget at 2.1 s

## Decision outcome

Chosen option 1, on Brad's card in spec 047's session, 2026-11-20. `/offer-agent`, "The offer agent, illustrated", shows the "what it was" claim, the label, and both paths' finished frames as plain HTML in reading order, with noindex and no player. On the home the moving copy is hidden from screen readers, the label's "Read the conversation" links the page, and with no script the box shows its empty phone and trace.

### Consequences

- Good, because the home's HTML grows by 247 bytes, and the budgets hold.
- Good, because the page is the same with or without script.
- Bad, because the whole text is a link away from the band, not a disclosure in it.

### Confirmation

Spec 047's S3.1–S3.4 and S5.1.

## More information

- Decided by: Brad Thome, on the session's card in spec 047. It keeps [D246](0246-a-byte-budget-for-the-homes-html.md)'s budget.
