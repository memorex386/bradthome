# Plan 031: "Ask about Brad" in reach on a phone

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1, on 2026-11-11. Changed during the build on Brad's card of the same day: two buttons, one shown at a time, in place of one button that moved.

## Approach

Two buttons, one shown. The hero's button stays as it is. `Ask.astro` adds a second, `.chat-corner`, fixed in the corner on a phone and hidden on a desktop and with no script. Neither ever moves, so layout shift stays 0. The plan approved at Gate 1 moved one button between the hero and the corner, but its return to the hero shifted the layout by about 0.1 each time, so Brad chose two on a card.

`ask.client.ts` already had one delegated click listener for "Ask me"; it now matches `[data-chat-open]`, the hero's, and `.chat-corner` too, so either button opens the chat, and focus returns to the one pressed.

`corner.client.ts` joins the one module and only sets attributes on the corner's button:

| Attribute      | Set by                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `data-float`   | An IntersectionObserver on the hero's button, with the 72 px header taken off the top: off screen shows the corner's, once a 1.8 s timer has run, or at once on a page loaded away from the top |
| `data-end`     | An IntersectionObserver on `#contact`, 150 px up from the bottom: in view, or above it                                 |
| `data-small`   | A passive scroll listener: set on a move down of more than 2 px, cleared on a move up or 600 ms after the last scroll    |

`chat.css` does the rest:

- `.chat-corner`: fixed in the corner, 1.25 rem above `env(safe-area-inset-bottom)`, 56 px tall, with the raised shadow, and hidden; `display: none` above 40 rem and with no script.
- On a phone, `[data-float]:not([data-end])` shows it, `.hero:has(.chat-corner[data-float]) .chat-ask` hides the hero's, and `:root:has(…)` sets `scroll-padding-bottom` so focus scrolls clear of it.
- In the no-preference block: MA-20 each time it shows (`[data-float]:not([data-end])`), with no delay, since the script holds the first until 1.8 s; the fade and 16 px drop at the end; and `[data-small]`, a `clip-path` circle around the sparkle slid into the corner by a `transform`, so shrinking changes no box.

The build, at 375 × 812 in Chromium, both themes:

- On load the corner shows the full pill, 187 × 56 px, 20 px from the right and bottom edges.
- Scrolling down: only a 56 px circle can be seen or tapped; 0.6 s after stopping, the pill. The name stays "Ask about Brad".
- At 520 px the hero's button is on screen, and the corner's is hidden.
- At the page's end it's hidden.
- With reduced motion, scrolling down leaves the full pill.
- A tap opens the full-screen sheet.
- Layout shift: 0 down the page and back.
- The one module grew from 11,346 to 12,051 bytes (+705), within Brad's 768.

| Part   | Where                                   | How                                                           |
| ------ | --------------------------------------- | ------------------------------------------------------------- |
| Markup | `Ask.astro`                             | The corner's button, its words in a span.                     |
| Script | `ask.client.ts`                         | The delegated listener matches `[data-chat-open]` too.        |
| Script | `corner.client.ts`, `PreviewLink.astro` | Two observers, one passive listener, one timer.               |
| Look   | `chat.css`                              | The corner, the circle, the end, the scroll padding, motion.  |
| Docs   | `docs/plan.md`, D214, the log           | Slice 5.7's state, and the record.                            |

## Tests first

`tests/031/` holds the new tests, traced to every ID in the spec:

- `static/corner.test.ts`: the two buttons in `Ask.astro`; the one listener; the script's two observers, one passive scroll listener, 600 ms stop, 2 px threshold and entrance timer; the corner hidden on a desktop and with no script; the circle as a clip and a transform, and every motion inside no-preference (S1.x, S2.x, S3.x, S5.1, FR-001–FR-006).
- `e2e/corner.test.ts`, on a 375 × 812 phone: the corner on load; exactly one button seen at every 400 px down to the contact section, and one in the accessibility tree; hidden and unfocusable at the end; the circle while scrolling, the pill on a stop and on a scroll up; the entrances and exit, recorded as they start; reduced motion; a deep link; a role page; the sheet and focus return; tabbing never entirely hides focus; the desktop unchanged; no script; layout shift 0 and the module's size (every S and SC).
- `e2e/a11y-visual.test.ts`: axe in each state and with the sheet open, both themes, on `/` and `/ai`, and a snapshot of each: on load, the circle, stopped, the hero's button in view, the end, reduced motion and the sheet (S5.4).

Amended, each with this spec named in a comment:

- Spec 030: the delegated listener's selector.
- Specs 016–018 and 025–030: the one module's size checks take the 768 bytes.
- Spec 010's `hideFrame`: element shots hide the corner too.
- Phone baselines whose screen now shows the corner. Each is checked by eye and in RGB before it's committed.

## Risks

- Phone screenshots of the whole screen change wherever the corner now shows.
- A scroll listener runs on every scroll. It's passive, reads only `scrollY`, and only toggles an attribute.
- A headless browser can deliver an IntersectionObserver's answer hundreds of milliseconds after a scroll, so the tests wait for an observer of their own rather than a fixed time.

## Decisions

D214, in [spec.md](spec.md), and Brad's cards. The tier-3 details are listed in the spec.
