# Plan 030: "Ask me" opens the chat (landing A6)

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1, on 2026-11-10.

## Approach

The page carries the questions; the one module only hands them over. Each "Ask me" row and each drawer ask link stays an `<a href="#contact">`, so it works with no script, and gains `data-chat-ask` with its question, built at build time in `receipts.ts`. `ask.client.ts`, already in the one module, listens for clicks on `[data-chat-ask]` once the chat's button exists. It opens the chat as the button does, then hands the question over. `mount.tsx` returns a function that redraws the window with a `prompt`, and `ChatWindow` puts it in the box in Ask mode, in a layout effect, so it's there when the dialog opens. Closing returns focus to the link that opened it.

The questions:

| From              | Question                                                       |
| ----------------- | -------------------------------------------------------------- |
| A row's "Ask me"  | Tell me more about this: "{the claim's words}"                 |
| A drawer, one ask | The same as its row                                            |
| A drawer, several | Tell me more about these, from {place}: {title}; {title}.      |

On `/` that's 24 distinct questions (18 rows and 6 drawers with several). Each becomes a facts case in `apps/evals/src/cases.ts`, requiring the answered state and a citation of its claim, or one of the drawer's claims. That changes the fingerprint (D194), so the evals run again. The run follows D192 and D193: push an `evals/030-ask-me` branch, let the `evals` workflow run on Brad's key in CI, download its `results.json` and commit it here. The last run cost $0.22 for 63 cases, so this one should cost about $0.30.

MA-20 is CSS in `chat.css`, inside the no-preference block and a desktop width query: two animations on the floating button, the rise and scale on the spring and the fade on the ease-out, each 420 ms from 1.8 s, with `backwards` fill. It's inside `.hero`, so the existing settle step (D204) and A5's morph finish it on a page that loads away from its top.

A spike of this plan, on the build in Chromium:

- "Ask me" beside "Partner portals" opened the chat with that claim's question in the box, nothing sent. Escape returned focus to the link.
- That drawer's "Ask Brad about these" then put Tell me more about these, from Hopper: Partner portals; Scala services and API contracts; URL-loaded UI SDKs. in the box.
- The button ran `chat-ask-rise` and `chat-ask-fade`, each at 1,800 ms for 420 ms.
- The one module grew from 11,049 to 11,290 bytes (+241).

| Part      | Where                                                       | How                                                                                     |
| --------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Questions | `receipts.ts`, `Receipts.astro`, the three sections         | `questionOf`, `askQuestionOf`, a `place` prop, and `data-chat-ask` on the links.        |
| Opening   | `ask.client.ts`, `mount.tsx`, `ChatWindow.tsx`, `types.ts`  | One delegated click listener; `prompt` prop; layout effect; focus back to the opener.   |
| Look      | `components.css`                                            | `.ds-receipts__ask`: the label's look as a link, 44 px tall.                            |
| MA-20     | `chat.css`                                                  | The entrance, as above.                                                                 |
| Evals     | `apps/evals/src/cases.ts`, `evals/results.json`             | 24 cases; a fresh run from CI.                                                          |
| Docs      | `docs/plan.md`, D213, the log                               | Slice 5.6's state, and the record.                                                      |

## Tests first

`tests/030/` holds the new tests, traced to every ID in the spec:

- `static/ask.test.ts`: the question builders and their frames; `Receipts.astro`'s links keep `href="#contact"`; the client's one listener, its modifier check and focus return; the window's prompt effect never calls send; MA-20 inside no-preference (S1.1, S1.2, S3.1, S3.3, S4.1, FR-001, FR-002, FR-005).
- `e2e/ask.test.ts`: every "Ask me" and drawer link on `/` opens the chat with its question and sends nothing, against a mocked API; a second tap replaces the box; Prep switches to Ask; focus returns; no script and no button fall back to `#contact`; a modified click doesn't open; MA-20's timing, and its absence under reduced motion, on a phone and at `/#hopper`; the built page's questions equal the receipt cases in `cases.ts`; layout shift, the module's size and the CSP (S1.x, S2.1, S3.x, S4.x, S5.3).
- `e2e/a11y-visual.test.ts`: axe with a drawer open and with the chat opened from a receipt; snapshots of an open drawer's rows (S5.1, S5.2).

Amended, each with this spec named in a comment:

- Spec 026: the sections' `<Receipts … place>` markup, the open drawer's baselines ("Ask me" is now a link), and its ask link's target check.
- Spec 009: the gallery's drawer baselines.
- Spec 022: the window takes a `prompt`; the one module's and the window chunk's size checks take the allowance.
- Spec 023: the case count, and the fresh results.
- Specs 016–018 and 025–029: the one module's size checks take the allowance.

## Risks

- The new facts cases count toward D200's judged accuracy. A weak answer on one fails the run; then the case or the claim's question needs a look, on a card.
- The eval run needs a branch pushed to GitHub and spends from Brad's Anthropic key, about $0.30.

## Decisions

D213, in [spec.md](spec.md), and Brad's Gate 1 cards. The tier-3 details are listed in the spec.
