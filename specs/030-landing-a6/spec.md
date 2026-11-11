# Spec 030: "Ask me" opens the chat (landing A6)

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                    |
| Status          | Approved                                                                                                                                |
| Slice           | 5.6 "Ask me" opens the chat (direction A's slice A6)                                                                                    |
| Branch          | `030-landing-a6`                                                                                                                        |
| Gate 1          | Approved by Brad on 2026-11-10, on the session's cards, every option as recommended                                                     |
| Mocks and flows | [mocks/README.md](mocks/README.md): the states this slice touches, the motion, and a spike's measurements                               |
| Plan            | [plan.md](plan.md), approved with this spec at Gate 1                                                                               |
| Decisions       | D213, from this slice. It builds on D129, D173, D188, D193, D194, D200 and D208, and amends spec 022's window and spec 026's drawer.     |

## Summary

A receipt with no public link says "Ask me", and each drawer with such receipts ends in "Ask Brad about it" or "Ask Brad about these". Since spec 026 both are plain words or a link to the contact section. Since v2.1 the site has "Ask about Brad", the chat that answers from the public claims with its sources. On 2026-11-09 Brad chose that an "Ask me" receipt opens the chat on its claim (Q4). On 2026-11-10's cards Brad chose how:

- The question goes in the chat's box, and the visitor sends it. Nothing sends itself, so browsing the receipts never spends an answer or one of the visitor's 20 a day (D173).
- A row's question quotes its claim: Tell me more about this: "{the claim's words}".
- A drawer's link asks about all of its "Ask me" receipts at once: Tell me more about these, from {place}: {title}; {title}. With one such receipt, it asks that one's question.

Each distinct question gets an eval case that requires the answer to cite its claim, in spec 023's suite, and the suite runs again (D194). The chat's prompt, model and API don't change. With no script, or where the chat can't open, every "Ask me" is still a link to the contact section, as before.

The slice also gives the floating "Ask about Brad" button its entrance (MA-20): once the hero has settled, it rises into place.

## Scope

**In:**

- `components/ds/receipts.ts` and `Receipts.astro`: each "Ask me" row becomes a link carrying its question; the drawer's ask link carries the drawer's; a `place` prop names where the card's work happened.
- `components/home/Hopper.astro`, `Experience.astro`, `Side.astro`: each drawer's place.
- `components/chat/ask.client.ts`, `mount.tsx`, `ChatWindow.tsx`, `types.ts`: a question put in the box, in Ask mode; focus returns to the link that opened the chat.
- `styles/ds/components.css` ("Ask me" as a link) and `styles/chat.css` (MA-20).
- `apps/evals/src/cases.ts`: 24 cases, one per distinct question, and a fresh `evals/results.json` from CI (D192, D193).
- Amended tests and baselines in specs 009, 022, 023 and 026, and new tests in `tests/030/`.
- `docs/plan.md`'s slice 5.6, and record D213.

**Out:**

- Any change to `apps/chat-api/`, the system prompt, the model or the limits.
- Sending a question for the visitor, and any new claim, figure or framing.
- A release.

## User stories and acceptance scenarios

### Story 1: "Ask me" asks about its claim (P1)

A recruiter reading Hopper's partner platform taps "Ask me" beside "Partner portals" and gets the chat, ready to ask about that claim.

**Independent test:** on `/` with script, open a drawer, tap a row's "Ask me", and read the chat's box.

- **S1.1** Given a receipt with no public link, when the visitor taps its "Ask me", then Ask about Brad opens in Ask mode with Tell me more about this: "{the claim's words}" in its box, focused, and nothing sent.
- **S1.2** Given a drawer with two or more "Ask me" receipts, when the visitor taps "Ask Brad about these", then the chat opens with Tell me more about these, from {place}: {each title, in order, joined by "; "}. in its box; with one, "Ask Brad about it" puts that receipt's question there.
- **S1.3** Given the chat open from a receipt, when the visitor sends, then it's an ordinary question: it counts toward the day's limit and answers from the corpus, as spec 022 sets.
- **S1.4** Given the chat already open on an earlier question, or in Prep, when the visitor taps another "Ask me", then the box holds the new question, in Ask mode, and the conversation so far stays.
- **S1.5** Given the chat opened from a receipt, when the visitor closes it, then focus returns to that "Ask me" link.

### Story 2: Each question finds its claim (P1)

- **S2.1** Given every distinct question the built home page's receipts carry, then spec 023's suite has a facts case with exactly that question, which requires an answered state citing that receipt's claim, or one of the drawer's.
- **S2.2** Given the suite with these cases, when the evals run in CI, then the run passes D200's rules (every case safe; judged accuracy within its allowed misses) and costs well under the $5 budget, and `evals/results.json` matches the code's fingerprint.

### Story 3: Without the chat, "Ask me" still reaches Brad (P1)

- **S3.1** Given no script, then every "Ask me" and drawer ask link is a link to the contact section, and the drawer opens without script, as spec 026 sets (S12).
- **S3.2** Given a page with no "Ask about Brad" button, then a tap on "Ask me" follows its link to the contact section.
- **S3.3** Given a modified click (a new tab or window), then the browser's own behavior runs, and the chat doesn't open.

### Story 4: The button arrives once the hero has settled (P2)

- **S4.1** Given a desktop with motion allowed, when the home or a role page loads at its top, then the floating "Ask about Brad" button rises 14 px from 0.9 scale on the spring and fades in, over 420 ms from 1.8 s, once (MA-20).
- **S4.2** Given reduced motion, a phone (where the button sits in the hero) or a page that loads away from its top, then the button is in place from the first frame.

### Story 5: It still works for everyone (P1)

- **S5.1** Given `/` and a role page, in both themes at desktop and phone sizes, with a drawer open and with the chat opened from a receipt, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation; each "Ask me" is named for its receipt, and spaced from any other target by more than WCAG 2.2's 24 px.
- **S5.2** Given reduced motion, then the open drawers' rows match their committed snapshots in the pinned container.
- **S5.3** Given the build, then the CSP doesn't change, the one module grows by at most 384 bytes (Brad's Gate 1 card), and layout shift stays 0.

## Edge cases

- A claim whose words are long: the box takes up to the API's 1,000 characters; every claim today is far shorter.
- A drawer whose only "Ask me" question is the same as its row's: one eval case covers both.
- A role page orders Hopper's topics differently: the questions are the same, so the cases cover every page.
- A visitor at the day's limit taps "Ask me": the box holds the question, and the window shows the limit as spec 022 sets.

## Functional requirements

- **FR-001** Each "Ask me" receipt and each drawer ask link MUST open Ask about Brad with its question in the box, as S1.1 and S1.2 set, and MUST NOT send it.
- **FR-002** Each question MUST use only its claim's words, or its receipts' titles and the card's place, inside the fixed frame.
- **FR-003** Spec 023's suite MUST hold one case per distinct question, citing its claim, and `evals/results.json` MUST come from a fresh CI run that passes.
- **FR-004** With no script or no chat, each MUST stay a link to the contact section.
- **FR-005** The floating button MUST play MA-20 only with motion allowed, where it floats, once per load.
- **FR-006** `apps/chat-api/`, the CSP and the chat's prompt and model MUST NOT change; the one module MUST grow by no more than 384 bytes.
- **FR-007** Specs 009, 022, 023 and 026's tests and baselines MUST be amended where they read what this slice changes, and `tests/030/` MUST cover every ID here; `docs/plan.md` MUST show slice 5.6's state, and the log MUST hold D213.

## Success criteria

- **SC-001** Every "Ask me" and drawer link on `/` opens the chat with its question in the box, and none sends.
- **SC-002** The suite's receipt cases equal the built page's distinct questions, and the CI run passes D200's rules.
- **SC-003** MA-20's animations match the table within 10 ms.
- **SC-004** axe finds 0 violations, layout shift is 0, and the CSP is unchanged.
- **SC-005** The one module grows by no more than 384 bytes.

## Mocks and flows

The approved mock is the private landing study's "A · Refined" view (S14, S15), which Brad reviewed on 2026-11-09. Nothing from it is copied here. [mocks/README.md](mocks/README.md) lists the states, the motion and the spike's measurements.

## Decisions to record

- **D213** "Ask me" opens Ask about Brad with a question from its claim in the box, for the visitor to send (Q4 of 2026-11-09, with 2026-11-10's cards on sending, wording and the drawer link); one eval case per question; the floating button's entrance (MA-20). It amends spec 022 (the window takes a prefilled question) and spec 026 (rows' "Ask me" and the drawer's link open the chat).

On Brad's Gate 1 cards (2026-11-10): the one module may grow by at most 384 bytes (241 measured), and the evals run again from an `evals/030-ask-me` branch.

Tier 3, decided in this spec: the questions carry no new words beyond "Tell me more about this:" and "Tell me more about these, from"; a drawer's question names its receipts' titles, not their full claims, to stay short; the eval cases sit in the facts suite, so they count toward D200's judged accuracy; "Ask me" keeps its label's look and box, with a link's color and underline; MA-20 plays only where the button floats, over the page, as an overlay may fade; on a phone the button sits in the hero, in the content, and stays put. After the push: a 44 px "Ask me" moved the drawers' layout, and CI then rendered later text on the gallery and the home with a different anti-aliasing from run to run, so the link keeps the label's box, which leaves every layout as it was; its row's padding spaces it from the next target by more than 24 px. From the review: each row's link keeps the text "Ask me" and is named "Ask me about receipt N", as its marker is named for its receipt; if the chat's window can't load, a tap follows the link to the contact section.
