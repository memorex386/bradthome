---
status: accepted
date: 2026-11-13
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D230
---

# A sparkle on each claim opens Ask about Brad with its words

## Context and problem statement

D213 made each "Ask me" receipt, and each drawer's ask link, open Ask about Brad with a question built from its claim, for the visitor to send. D229 retires the receipts and drawers that held them. Brad asked for a small AI icon that takes a claim's words into a prompt. Where should it sit, what should a tap do, and how big should it be?

## Decision drivers

- A reader can ask about any claim, not only those without a public link, in one tap, and nothing is spent until they send (D173).
- It's quiet beside the text, and keeps 3:1 against every background it sits on, including the dark band.
- It works with no script, and needs no new script with one (D153, D188).
- Every question has an eval case, and the 20 "Ask me" asked keep theirs.

## Considered options

The options are listed in the builder's ranked order, from the receipts study's round 2 (2026-11-13).

1. The chat's own sparkle at the end of each claim; a tap opens Ask about Brad with the claim's words in its box (recommended)
2. One sparkle per card, asking about all of its claims
3. No icon: the Ask about Brad button only
4. A tap opens a menu: ask, or copy the words

## Decision outcome

Chosen option 1, which Brad picked on the receipts study's cards (2026-11-13) and approved at spec 038's Gate 1 the same day. It amends D213: the sparkle hands over the question in place of "Ask me" and the drawers' links.

- Each of the 30 claims ends with the Ask button's mark, kept on the line of the claim's last word. It's a link to the contact section carrying "Tell me more about this: “{the claim's words}”", so `ask.client.ts`'s one listener opens Ask about Brad with the words in its box, in Ask mode, focused and unsent. With no script, or a window that can't load, it reaches Contact. A claim written as a lead and a list asks with the list's items joined by "; ".
- Its name is "Ask about this: {the claim's title}", which holds its tooltip's words and tells the 30 apart.
- At rest it's "dim" on the page and its cards, and a new `--color-band-dim` in the band, 3:1 or more everywhere and quieter than the text. On hover and keyboard focus it takes the accent on a soft disc, with a focus ring and "Ask about this" in a CSS tooltip that ends at the sparkle, so it never passes the screen's edge.
- On Brad's Gate 1 card its target is 44 × 44 px. Its margins take the target out of the line, so the text's line height doesn't change; no two targets overlap at 320 to 1440 px on any of the four pages.
- On Brad's Gate 1 card the sparkles don't pop as the markers did. The only new motion is MA-22, the sparkle's color, disc and tooltip in 150 ms, and MA-23, a landed claim's tint fading over 1,600 ms, both only with motion allowed.
- The eval suite keeps the 20 "Ask me" cases word for word, retires the drawers' 6, and adds 10 for the claims with public links, each requiring an answer that cites its claim. A changed run (D228) checks the new ones. The prompt, model, API and limits don't change, and the one module doesn't grow.

### Consequences

- Good, because any claim is one tap from a question about it, and browsing spends nothing.
- Good, because it needs no new script, and with none it still reaches Brad.
- Bad, because rewording a claim changes its question, so its case and a changed run must follow; spec 030's test fails until they do.
- Bad, because the 44 px target reaches about 9 px over the line above it, where the text isn't a link.

### Confirmation

Spec 038's tests open the chat from sparkles with a mouse, a tap and the keyboard, read their names, measure every target at 320, 375, 390, 1280 and 1440 px, check the contrast in both themes, and compare the cases with the built pages' questions. Spec 030's amended tests do the same for every sparkle on the home.

## More information

- Decided by: Brad Thome, on the receipts study's cards (2026-11-13) and at spec 038's Gate 1 (2026-11-13).
- Spec: [spec 038](../../specs/038-proof-on-the-card/spec.md).
- Amends: [D213](0213-ask-me-opens-the-chat.md).
- Builds on [D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), [D153](0153-ask-me-links-go-to-the-contact-section.md), [D173](0173-limits-show-the-designed-states-at-20-questions-a-day.md), [D188](0188-the-chat-window-is-react-loaded-on-open.md), [D193](0193-eval-runs-start-from-an-evals-branch.md) and [D228](0228-evals-run-the-cases-a-change-touches.md).
