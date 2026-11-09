# Spec 022 mocks: the chat window

"Show it" for [spec 022](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mock is the window itself, built from this branch. `/design-system#chat` holds every state at once, each the real window drawn on the server with fixed replies from `fixtures.ts`, in both themes with the gallery's theme switch. The home and the role pages have the button: in a desktop's corner, or in the hero on a phone.
- No pull request previews run while D161 holds, so at Gate 1 the states were shown from a local build, on a phone and a desktop, in light and dark. `next` shows them once the slice is on main.
- The snapshot baselines in `tests/snapshots/022/` show each state below, from the pinned container with reduced motion on.
- The look is the chat designs' panel (`ChatPanel`, A2–A12), on the design system's tokens. The words are the designs', rewritten so they call Brad "Brad".

## Every state

| ID | State | Scenarios |
| --- | --- | --- |
| <a id="a1"></a>A1 | The entry, closed: the corner on a desktop, the hero on a phone | S1.1, S1.2, S1.5 |
| <a id="a2"></a>A2 | Open, nothing asked: heading, line, four starters | S1.1, S1.2, S2.1 |
| <a id="k1"></a>K1 | Checking this browser, with Stop | S2.3, S2.5 |
| <a id="a3"></a>A3 | Answering: the words streaming, with Stop | S2.3, S2.5 |
| <a id="a4"></a>A4 | An answer with its numbered sources, Copy and Inspect | S2.4, S2.7 |
| <a id="a5"></a>A5 | A source opened in place, with its link | S3.1–S3.3 |
| <a id="a6"></a>A6 | Inspect: time, cost, model, tokens and IDs | S4.1–S4.3 |
| <a id="a8"></a>A8 | No source: the API's words and "Email Brad the question" | S5.1 |
| <a id="a9"></a>A9 | A boundary: the API's words and "Email Brad" | S5.2 |
| <a id="a10"></a>A10 | The visitor's limit, with its reset, the PDF and email | S6.1 |
| <a id="a11"></a>A11 | Paused at a spending cap, with the PDF and email | S6.2 |
| <a id="a12"></a>A12 | The answer failed: the question kept, Try again | S6.3 |
| <a id="k2"></a>K2 | The check didn't pass: the question kept, Try again | S6.4 |

Each shows on a phone and a desktop, in light and dark.

## What's left out

- The Ask and Interview prep switch, and P1–P4: slice 4.5.
- A7, the timeline answer, and Inspect's step timings, trace and thumbs (D191).
- The design's numbered markers inside the answer's text, since the API sends its sources after the text.
- The progress steps before an answer ("Checked the question", "Read 3 sources"): the API doesn't report them, so K1 and A3 say what's really happening.
