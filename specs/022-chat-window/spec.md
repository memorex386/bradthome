# Spec 022: The chat window

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Approved at Gate 1, 2026-11-08 |
| Slice | 4.3 Chat window |
| Branch | `022-chat-window`, pushed to main after Brad says push (D161) |
| Mocks | [mocks/README.md](mocks/README.md): every state in the gallery at `/design-system#chat`, and the window on the home, on a phone and a desktop, in light and dark |
| Plan | [plan.md](plan.md), for approval with this spec |
| Decisions | [D188](../../docs/decisions/0188-the-chat-window-is-react-loaded-on-open.md)–[D191](../../docs/decisions/0191-inspect-shows-what-the-reply-carries.md), from this slice. It builds on D122, D153, D169–D175, D177, D183 and specs 009, 017, 020 and 021. |

## Summary

"Ask about Brad" gets its window. A visitor presses the button, in a desktop's corner or in the hero on a phone, and a panel opens in the corner or a sheet fills the phone's screen (D189). They pick a starter or type a question. The browser solves the API's ALTCHA challenge (D172), sends the question, and the answer streams in, with its sources numbered below it. A source opens in place with its words from `/corpus.json`, and Inspect shows how the answer was made from the reply's own numbers (D191). When the site has no source, or the question is about pay or promises, the API's reply says so and the window offers an email to Brad. The visitor's daily limit, the spending pause, a failed answer and a failed check each show their designed state (D173).

The window is React, loaded only when it's first opened, from the site's one module (D188). It shows on previews and `next` only: a release build leaves it out until v2.1 (D190). It stores nothing and adds no analytics event (D175).

## Scope

**In:**

- `apps/site/src/components/chat/`: the window, its words, the API client, the stream reader, ALTCHA's solver, Inspect's numbers, the gallery's held states, the button and dialog (`Ask.astro`), and the loader in the one module.
- `apps/site/src/styles/chat.css`, on the design system's tokens.
- The button in the hero of the home and the role pages.
- The gallery's chat section at `/design-system#chat`, with every state held.
- `scripts/site/release.ts`, the release flag, and `release.yml`'s build step setting it.
- Spec 003's FR-002 and its static check amended to allow React in the chat's folder, and relocked (D188).
- Tests in `tests/022/`, with a fake API, and snapshot baselines in `tests/snapshots/022/`.
- The manual pass with the keyboard, a screen reader and reduced motion, recorded in `evidence/`, and a few real questions on `next`.

**Out:**

- Any change to `apps/chat-api/` or its deploy.
- Interview prep and the Ask and Interview prep switch (slice 4.5).
- Step timings, the full trace, thumbs, and visual answers such as the timeline, A7 (D191).
- Numbered markers inside the answer's text: the API sends sources after the text, not where each is cited.
- `/evals` and the link to it (slice 4.4), and the chat on bradthome.com (v2.1).
- Any new Umami event, and any change to the privacy note, which already describes the chat (spec 021).

## The states

The IDs are the chat designs' (`States` board), plus K1 and K2 for the check.

| ID | State | What shows |
| --- | --- | --- |
| A1 | The entry, closed | "Ask about Brad" in a desktop's corner, or in the hero on a phone |
| A2 | Open, nothing asked | The heading, a line, four starters, the question box |
| K1 | Checking | The question, "Checking this browser" and Stop, while ALTCHA's challenge is solved |
| A3 | Answering | "Writing the answer", the streamed words with a caret, and Stop |
| A4 | An answer with sources | The answer, its numbered sources, Copy and Inspect |
| A5 | A source opened | The source's label, its words from the corpus, and a link to its place on the site |
| A6 | Inspect | Time and cost, the model, sources and tools, tokens by step, the cited IDs, and a link to the code |
| A8 | No source | The API's no-source reply and "Email Brad the question" |
| A9 | A boundary | The API's boundary reply and "Email Brad" |
| A10 | The visitor's limit | Why, when it resets in their own time, the résumé PDF and email; the question box off |
| A11 | Paused | Resting until tomorrow, next month, or for now; the résumé PDF and email; the question box off |
| A12 | Failed | "The answer didn't finish", the question kept, and Try again |
| K2 | The check failed | "The check didn't pass", the question kept, and Try again |

## User stories and acceptance scenarios

### Story 1: Opening the window (P1)

A visitor finds "Ask about Brad" and opens it without the page getting heavier for everyone else.

**Independent test:** open the home on a phone and a desktop, press the button, and close the window.

- **S1.1** Given the home or a role page on a desktop, then "Ask about Brad" is a button fixed in the screen's corner, and pressing it opens a modal panel in that corner, 440 pixels wide, with the question box focused (A1, A2).
- **S1.2** Given a phone, 390 × 844, then the button sits in the hero after its links, and pressing it opens a sheet that fills the screen (A1, A2).
- **S1.3** Given the open window, when the visitor presses Escape, the close button or the backdrop, then it closes and focus returns to the button; opened again, the conversation is still there.
- **S1.4** Given the page loads, then it loads only the site's one module, and no request is made for the window's code or to the API; pressing the button loads the window's chunk once.
- **S1.5** Given JavaScript is off, then no "Ask about Brad" button shows, and the page is otherwise unchanged.

### Story 2: Asking and the answer (P1)

**Independent test:** with the fake API, ask a starter and a typed question, and stop one.

- **S2.1** Given A2, when the visitor presses a starter, then that starter is asked as the question.
- **S2.2** Given a typed question, when the visitor presses Enter or Send, then it's asked; Shift+Enter adds a line, an empty question can't be sent, and the box takes at most 1,000 characters.
- **S2.3** Given a question, then the window first shows K1 while it fetches and solves `/challenge`, then A3 once the question is sent, with each streamed word added as it arrives.
- **S2.4** Given the stream ends with its sources and numbers, then A4 shows the answer with each source once, numbered in the API's order, labelled as the API labels it, and Copy and Inspect.
- **S2.5** Given Stop is pressed in K1 or A3, then the request is cancelled, the words so far stay, and the window says the answer was stopped.
- **S2.6** Given earlier answers, then the next question sends them with it, keeping the newest, within the API's limits of 10 messages and 4,000 characters an answer, and leaves out any turn that was stopped, failed or refused.
- **S2.7** Given an answer, when Copy is pressed, then the answer and its numbered sources with their links go to the clipboard, and the button says "Copied".

### Story 3: A source opened in place (P1)

- **S3.1** Given A4, when a source is pressed, then it opens below its row with its label and its words from `/corpus.json`, fetched once for the page, and pressing it again or its close button closes it (A5).
- **S3.2** Given an opened source, then its link goes to the source's place on the site the visitor is on: a bradthome.com link becomes its path and anchor.
- **S3.3** Given `/corpus.json` can't be read, then the opened source says so and still shows the link.

### Story 4: Inspect (P2)

- **S4.1** Given A4, when Inspect is pressed, then A6 shows the time in seconds, the cost, the model, the count of sources, "0 tools", the cached corpus tokens, the question's new tokens, the answer's tokens, and the cited IDs, all from the reply's `data-meta` and sources.
- **S4.2** Given the reply's token counts, then the cost is priced as spec 021's S5.4 prices it, and the window's price table equals the API's.
- **S4.3** Given Inspect, then it says it was built in the browser and nothing is stored, and links the API's code.

### Story 5: No source and boundaries (P1)

- **S5.1** Given a reply with `state: "no-source"`, then A8 shows the reply's words and "Email Brad the question", a mail link to brad@bradthome.com whose body is the visitor's question.
- **S5.2** Given a reply with `state: "boundary"`, then A9 shows the reply's words and "Email Brad", a mail link with no question in it.

### Story 6: Limits, pauses and failures (P1)

- **S6.1** Given a 429 `limit` refusal, then A10 shows why, when it resets in the visitor's own time from `resetsAt`, the page's résumé PDF and an email link, and the question box is off.
- **S6.2** Given a 503 `paused` refusal with `scope` `day`, `month` or `unknown`, then A11 says the chat is resting until tomorrow, next month or for now, with the résumé PDF and email, and the question box is off.
- **S6.3** Given a stream that ends with an error part, ends with no numbers, or a request that fails, then A12 shows the question kept and Try again, which asks it again in place.
- **S6.4** Given `/challenge` fails, the challenge can't be solved, or a 403 `altcha` refusal, then K2 shows the question kept and Try again.
- **S6.5** Given a 403 `origin` or 400 `invalid` refusal, then the answer says the chat isn't available here yet, or that the question couldn't be read.

### Story 7: Accessible on a phone and a desktop (P1)

- **S7.1** Given each state, on a phone and a desktop, in light and dark, then axe finds no violation at WCAG 2.2 AA, with the target-size rule on.
- **S7.2** Given the keyboard only, then every control can be reached and used in order, focus is always visible, and it stays in the window while it's open.
- **S7.3** Given a screen reader, then the window is a dialog named "Ask about Brad", the question box is labelled, and a polite status says when it's checking, writing, done with its count of sources, stopped, failed, limited or paused, without reading the stream word by word.
- **S7.4** Given reduced motion, then nothing in the window moves: no opening rise, spinner, caret blink or transition.

### Story 8: Private by design (P1)

- **S8.1** Given a conversation, then the browser contacts only the site itself and the API's origin, sets no cookie, writes nothing to storage, and sends no analytics event about the chat.
- **S8.2** Given the window's code, then nothing logs a question or an answer to the console or anywhere else.

### Story 9: Live stays without it until v2.1 (P1)

- **S9.1** Given a build with `BRADTHOME_RELEASE=1`, then no page has the button, the dialog or the gallery's chat section, the one module holds none of the chat's code, and no chat chunk is built; without the flag, they're all there.
- **S9.2** Given `release.yml`, then its build step, and only that step, sets `BRADTHOME_RELEASE=1`.
- **S9.3** Given the build, then `firebase.json`'s Content-Security-Policy is the one `pnpm csp` writes, with no new host, and the window's code is a file under `/_astro/`, never inline.

### Story 10: The gallery and the locked check (P2)

- **S10.1** Given `/design-system#chat`, then it holds every state in the table above except A1, each the real window drawn on the server, and each has a snapshot on a phone and a desktop, in light and dark.
- **S10.2** Given spec 003's static check, then React may be imported only in `src/components/chat/`, no file uses a `client:` directive, and spec 003 is relocked.

## Requirements

- **FR-001** The window MUST load only when a visitor first opens it, from the site's one module, with no `client:` directive (D188).
- **FR-002** The button MUST float in a desktop's corner and sit in the hero on a phone, and open a modal panel or a full-screen sheet (D189).
- **FR-003** The window MUST solve the API's ALTCHA challenge before each question, and send the question as spec 021's FR-003 requires.
- **FR-004** The window MUST show every state in the table, as the scenarios say, from the API's replies only.
- **FR-005** A source MUST open in place with its words from `/corpus.json`, and link to its place on the site the visitor is on.
- **FR-006** Inspect MUST show only what the reply carries, and the cost priced from the API's own prices (D191).
- **FR-007** The window MUST meet WCAG 2.2 AA on a phone and a desktop, in light and dark, and move only when the visitor hasn't asked for less (D122).
- **FR-008** The window MUST NOT store, log or send anywhere but the API what a visitor types, and MUST add no analytics event (D175).
- **FR-009** A release build MUST leave out every part of the chat until v2.1 (D190).
- **FR-010** The Content-Security-Policy MUST gain no host and no inline script.
- **FR-011** The window's words MUST call Brad "Brad", never a pronoun, and come from `words.ts` or the API.

## Success criteria

- **SC-001** Each state in the table has a passing test and a snapshot on a phone and a desktop, in light and dark.
- **SC-002** The home's first load adds under 1.5 KB gzipped to the one module, for the loader and Vite's chunk preloader, and the window's code on open is under 85 KB gzipped.
- **SC-003** The home's Lighthouse medians still meet spec 003's FR-012 budgets.
- **SC-004** axe finds 0 violations at WCAG 2.2 AA in every state.
- **SC-005** A release build holds 0 traces of the chat.
- **SC-006** The manual pass with the keyboard, a screen reader and reduced motion is recorded, with a few real questions on `next`, and how many.

## Tier-3 choices

- The window sends the conversation itself, since the API keeps none, and leaves out turns without a whole answer.
- ALTCHA is solved on the page with WebCrypto, with no worker, so the CSP needs no `worker-src`; it gives up after 30 seconds.
- The limit's reset shows in the visitor's own time; the gallery shows it in UTC, so its snapshot is fixed.
- Copy puts the answer and its numbered sources with their links on the clipboard.
- The no-source email carries the visitor's question in its body, which only their own mail app sees.
- The spinner turns four times at most and the caret blinks three, so nothing loops (D35).
- The held states in the gallery grow to show all of themselves, since the gallery has no script to scroll them.

## Assumptions and open questions

- The API's reply shapes are spec 021's, as built on main at `b12fb17`.
- A visitor's first open waits for the window's chunk, about 77 KB gzipped; the button says it's busy meanwhile.
