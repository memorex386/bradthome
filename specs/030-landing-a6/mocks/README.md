# Spec 030: states and motion

The approved mock is the private landing study's "A · Refined" view, which Brad reviewed on 2026-11-09. Nothing from it is copied into this repo. The page itself, on `next`, is the record once this slice lands.

## States this slice touches

| State                         | What A6 checks                                                       | How                                 |
| ----------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| S01 First visit, desktop      | The floating button's entrance at 1.8 s                              | `tests/030/e2e/ask.test.ts`         |
| S02 First visit, phone        | The button in the hero, in place                                     | Same                                |
| S03 Dark                      | An open drawer's "Ask me" links                                      | The snapshots, axe                  |
| S05 Reduced motion            | No entrance; everything in place                                     | `ask.test.ts`                       |
| S06 Deep link                 | The button in place at `/#hopper`                                    | `ask.test.ts`                       |
| S07 A receipt opened          | "Ask me" is a link                                                   | The snapshots                       |
| S12 No script                 | "Ask me" goes to the contact section                                 | `ask.test.ts`                       |
| S14 Ask about Brad available  | The button's timing                                                  | `ask.test.ts`                       |
| S15 Ask opened from a receipt | The chat opens with the claim's question in the box, unsent          | `ask.test.ts`, axe                  |

## Motion

| ID    | Element                     | Trigger                | Timing           | What moves                                         | Reduced motion |
| ----- | --------------------------- | ---------------------- | ---------------- | -------------------------------------------------- | -------------- |
| MA-20 | The floating "Ask about Brad" | Once the hero settles | 420 ms from 1.8 s | Rises 14 px from 0.9 scale on the spring; fades in | In place       |

## The spike's measurements

On the build in Chromium:

- "Ask me" beside "Partner portals" opened the chat with Tell me more about this: "Built hopper.com features and partner portals for RBC, Lloyds Bank, Nubank and CommBank." in the box, nothing sent. Escape returned focus to the link.
- The drawer's "Ask Brad about these" put Tell me more about these, from Hopper: Partner portals; Scala services and API contracts; URL-loaded UI SDKs. in the box.
- The button ran `chat-ask-rise` and `chat-ask-fade`, each 420 ms from 1,800 ms.
- The one module: 11,049 bytes before, 11,290 with this slice (+241).
- The built home page carries 24 distinct questions: 18 rows, and 6 drawers with several "Ask me" receipts.
