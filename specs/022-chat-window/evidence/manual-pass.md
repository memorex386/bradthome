# Spec 022: the manual pass

On 2026-11-09 against `next` (`https://bradthome--next-4pxvt5rm.web.app`), built from main at `50b82c2`, with main's `ci`, `next` and CodeQL green. bradthome.com, checked the same day, has no button, dialog or chat stylesheet. Its one module is the same file a release build of this branch makes (SC-005).

## Real questions (SC-006)

Three questions to the real API, in the `bradthome-chat` workspace, at about $0.0043 for the first (it wrote the corpus to the cache) and well under a cent for the other two.

| Question | State | What the window showed |
| --- | --- | --- |
| What did Brad build at Hopper? | answered (A4) | The answer, four numbered sources, Copy and Inspect. Inspect: 3.1 s · $0.0043, `claude-haiku-5-5`, 4 sources, 0 tools, 20,725 tokens written to the cache, 27 new tokens, 241 tokens out, the four cited IDs. The first source opened in place with its words from `/corpus.json` (A5). |
| What salary is Brad looking for? | boundary (A9) | The API's boundary reply and "Email Brad", with no question in the mail link. |
| Has Brad shipped anything in Rust? | no-source (A8) | The API's no-source reply and "Email Brad the question", with the question as the mail's body. |

## Keyboard (S7.2)

- The button took focus, and Enter opened the window with the question box focused.
- Typing and Enter sent the question. The polite status said "The answer is ready, with 4 sources."
- Escape closed the window, and focus returned to "Ask about Brad".
- The tab order inside the window, its rings and focus staying in the window are checked in every CI run by `tests/022/e2e/a11y.test.ts`.

## Reduced motion (S7.4)

The in-app browser can't set reduced motion, so this is checked in every CI run: with reduced motion the window runs no animation while it checks and writes, and without it the window rises and the spinner turns (`tests/022/e2e/a11y.test.ts`, S7.4). Every snapshot is taken with reduced motion on.

## Screen reader (S7.3)

Checked by name, role and live region in every CI run: a dialog named "Ask about Brad", a textbox named "Your question", and a polite status that announces each step without reading the stream. A pass with a real screen reader is Brad's, on a phone or a desktop, and is recorded below when done.

- [ ] VoiceOver, NVDA or Narrator on `next`: open the chat, ask a starter, hear the status, open a source, close with Escape.
