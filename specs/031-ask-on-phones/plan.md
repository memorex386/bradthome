# Plan 031: "Ask about Brad" in reach on a phone

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1, on 2026-11-11.

## Approach

One button, two places. `Ask.astro` wraps the button in a slot, which on a phone is a block 52 px tall, the button's height in the hero, so the hero's layout holds while the button is away. Its words move into a span, so they can fold away while the name stays.

`corner.client.ts` joins the one module and only sets attributes on the hero's button:

| Attribute      | Set by                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `data-float`   | An IntersectionObserver on the slot, with the 72 px header taken off the top: off screen floats |
| `data-end`     | An IntersectionObserver on `#contact`, 150 px up from the bottom: in view, or above it          |
| `data-small`   | A passive scroll listener: set on a move down of more than 2 px, cleared on a move up or 600 ms after the last scroll |
| `data-entered` | A 1.8 s timer, so only the first entrance waits for the hero                                    |

`chat.css` does the rest, all inside `@media (max-width: 40rem)`, so the desktop's CSS doesn't change:

- `[data-float]`: fixed in the corner, 1.25 rem above `env(safe-area-inset-bottom)`, 56 px tall, with the raised shadow; `:root:has(.chat-ask[data-float])` sets `scroll-padding-bottom` so focus scrolls clear of it.
- `[data-float][data-end]`: hidden, so it can't be tapped or focused.
- In the no-preference block: MA-20 on every floating appearance, delayed 1.8 s until `data-entered`; transitions on padding, gap, opacity, translate and visibility; `[data-small]` folds the words to a 56 px circle.

A page loaded away from the top: the hero's settle step (D204) already finishes every animation inside `.hero`, and the button stays inside `.hero` in the DOM, so its entrance finishes too.

A spike of this plan, on the build at 375 × 812 in Chromium, both themes:

- On load the button floats in the corner as the full pill, 186 × 56 px.
- Scrolling down: a 56 × 56 px circle; 0.6 s after stopping: the pill again. The name stays "Ask about Brad".
- At 520 px the hero's place is on screen: the button sits there, static, 52 px tall, and nothing floats.
- At the page's end it's hidden (visibility hidden, opacity 0).
- With reduced motion, scrolling down leaves the full pill.
- A tap opens the full-screen sheet.
- The page's height stays 9,870 px in every state.
- The one module grew from 11,346 to 12,019 bytes (+673).

| Part     | Where                                  | How                                                          |
| -------- | -------------------------------------- | ------------------------------------------------------------ |
| Markup   | `Ask.astro`                            | The slot and the label's span.                               |
| Script   | `corner.client.ts`, `PreviewLink.astro` | Two observers, one passive listener, one timer.              |
| Look     | `chat.css`                             | The corner, the circle, the end, the scroll padding, motion. |
| Docs     | `docs/plan.md`, D214, the log          | Slice 5.7's state, and the record.                           |

## Tests first

`tests/031/` holds the new tests, traced to every ID in the spec:

- `static/corner.test.ts`: the slot and the label's span in `Ask.astro`; the script's two observers, one passive scroll listener, 600 ms stop and 2 px threshold; every new rule inside the 40 rem query; the shrinking and MA-20 only inside no-preference; the hidden state uses visibility (S1.x, S2.x, S3.3, S5.1, FR-001–FR-004, FR-006).
- `e2e/corner.test.ts`, on a 375 × 812 phone: the corner on load; in the hero; floating at every 400 px down to the contact section, exactly one visible button; hidden at the end, untabbable; the circle while scrolling and the pill on a stop and on a scroll up; reduced motion; the first entrance's timing and later ones; a deep link; a role page; the sheet and focus return; a focused link near the bottom clear of the button; the desktop unchanged; no script; layout shift 0; the module's size and the CSP (every S and SC).
- `e2e/a11y-visual.test.ts`: axe in each state, both themes, and a snapshot of each: on load, scrolling down, stopped, the hero's button in view, the end, reduced motion and the sheet open (S5.4).

Amended, each with this spec named in a comment:

- Spec 022: the button's markup now has a slot and a label span.
- Specs 017, 018, 027–030: the one module's size checks take the new allowance.
- Phone baselines on `/` and the role pages whose screen shows the corner: they now show the floating pill, the same change as S1.1. Each is checked by eye and in RGB before it's committed.

## Risks

- Phone screenshots of the whole screen change wherever the pill now floats. Element shots already hide the frame (spec 027's `hideFrame`); it hides the corner too, so they don't change.
- A scroll listener runs on every scroll. It's passive, does no layout reads beyond `scrollY`, and only toggles an attribute.

## Decisions

D214, in [spec.md](spec.md), and Brad's Gate 1 cards. The tier-3 details are listed in the spec.
