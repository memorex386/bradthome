---
status: accepted
date: 2026-11-10
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D213
---

# "Ask me" opens the chat with its claim's question

## Context and problem statement

A receipt with no public link says "Ask me", and each drawer with such receipts ends in "Ask Brad about it" or "Ask Brad about these" ([D208](0208-one-receipts-drawer-per-card.md)). Until now they led to the contact section. Since v2.1 the site has "Ask about Brad", which answers from the public claims with their sources. On the landing study's cards (2026-11-09, Q4), Brad chose that an "Ask me" receipt opens the chat on its claim once v2.1 is live (T9). How should a receipt hand the chat its question, without spending answers or the visitor's daily limit ([D173](0173-limits-show-the-designed-states-at-20-questions-a-day.md)) on browsing, and without changing the chat's prompt or API?

## Decision drivers

- No new claims or framings: a question may use only its claim's words.
- Nothing spends an answer or a question from the day's limit unless the visitor sends it.
- Every answer stays checked: each new question needs an eval case, and a fresh run within the $5 budget ([D194](0194-a-prompt-or-model-change-needs-a-fresh-eval-run.md)).
- With no script, "Ask me" still reaches Brad.

## Considered options

The options are listed in the builder's ranked order, as Brad answered each card on 2026-11-10.

1. The question goes in the chat's box and the visitor sends it; a row quotes its claim; a drawer's link asks about all of its "Ask me" receipts (recommended)
2. The question sends at once
3. A row's question names its receipt's title and place
4. A drawer's link opens the chat empty, or keeps going to the contact section

## Decision outcome

Chosen option 1, on Brad's cards and at spec 030's Gate 1 (2026-11-10).

- A row's "Ask me" puts Tell me more about this: "{the claim's words}" in Ask about Brad's box, in Ask mode, focused and unsent. A drawer's link puts Tell me more about these, from {place}: {title}; {title}. there, or its one receipt's question.
- Both stay links to the contact section, so they work with no script and on a page without the chat. A modified click keeps the browser's behavior. Closing the chat returns focus to the link.
- Each distinct question, 24 on today's pages, is a facts case in the eval suite that requires an answer citing its claim. The evals ran again in CI from an `evals/030-ask-me` branch ([D193](0193-eval-runs-start-from-an-evals-branch.md)).
- The chat's prompt, model, API and limits don't change. `ask.client.ts` in the one module hands the question over; on Brad's Gate 1 card the module may grow by at most 384 bytes.
- The floating "Ask about Brad" button rises into place once the hero has settled (MA-20): 14 px from 0.9 scale on the spring, fading in, over 420 ms from 1.8 s. It does so only with motion allowed and where it floats; on a phone it sits in the hero and stays put.

### Consequences

- Good, because a reader can ask about a claim with no public link in one tap, then one more to send.
- Good, because browsing receipts spends nothing, and every question has an eval case.
- Bad, because a change to a claim's words changes its question, so its case and a fresh eval run must follow; spec 030's test fails until they do.
- Bad, because the new cases count toward the judged accuracy, so a weak answer on one fails a run.

### Confirmation

Spec 030's tests open the chat from every "Ask me" and drawer link on the home and check the box, Ask mode, focus and that nothing was sent. They check the links with no script and without the chat, compare the eval cases with the built pages' questions, and read MA-20's timing. The eval run's results are committed with the slice.

## More information

- Decided by: Brad Thome, on the landing study's cards (2026-11-09) and on spec 030's cards (2026-11-10).
- Amends spec 022 (the window takes a prefilled question) and spec 026 (the rows' "Ask me" and the drawer's link open the chat).
- Builds on [D129](0129-the-hopper-story-ships-from-the-public-resume-claims.md), [D173](0173-limits-show-the-designed-states-at-20-questions-a-day.md), [D188](0188-the-chat-window-is-react-loaded-on-open.md), [D193](0193-eval-runs-start-from-an-evals-branch.md), [D194](0194-a-prompt-or-model-change-needs-a-fresh-eval-run.md), [D200](0200-safety-must-pass-every-case-accuracy-95-percent.md) and [D208](0208-one-receipts-drawer-per-card.md).
