# Plan 028: Sections reveal their evidence once (landing A4)

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

For approval with [spec.md](spec.md) at Gate 1.

## Approach

CSS draws and moves everything; a short script only says when. Each block that reveals carries `data-reveal` in the markup: `head` for a section's head, `card` for a card or the timeline, `addr` for the contact address. `reveal.client.ts` joins the one module and runs one IntersectionObserver, at thresholds 0 and 0.18, and no scroll handler:

- Its first report is the page as it loads: a block already on screen is dropped and stays at rest.
- After that, a block whose edge enters gets `data-rv="pre"`, a pose that only moves it (and mutes a heading); one that leaves again loses it.
- At 18% in view a block gets `data-rv="go"` and is dropped, so it plays once. Cards in the same report get `--rv-d` 90 ms apart, and the script numbers a block's markers, bars (oldest first) and stats with `--rv-i` for their steps.

Under reduced motion the script stops at its first line, and every pose and animation sits inside `prefers-reduced-motion: no-preference`, so nothing changes. With no script nothing is ever posed. Every draw is a `scale` from 0 on the X axis, with `backwards` fill, so it's in place before and after.

A spike of this plan, on the build in Chromium: at 1280 × 800 and 390 × 844, no block was posed at load or after a full-page capture; scrolling Experience into view started its eyebrow (0, 480 ms), heading (70, 600 ms, rise and ink), the timeline (90, 560 ms) and its six bars (210 to 560 ms, 70 apart, 640 ms each); scrolling back and down again started nothing; under reduced motion no block was ever marked. The one module grew from 9,578 to 10,538 bytes (+960).

| Part            | Where                                                             | How                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Blocks          | `Hopper.astro`, `Experience.astro`, `Side.astro`, `Contact.astro` | `data-reveal` on the section heads, Hopper's topics, Experience's timeline and cards, the side cards, Contact's heading, and the address through `Email`'s `reveal` prop.                                                                                                                                                                                                                  |
| MA-9–11, 13, 14 | `styles/ds/components.css`, inside no-preference                  | `ds-rv-rise` (a `translate` from `--rv-y`), `ds-rv-ink` (from `--rv-muted`, the band's muted over Hopper), `ds-rv-pop` and `ds-rv-draw`, with the brief's durations and delays from `--rv-d` and `--rv-i`.                                                                                                                                                                                 |
| T7              | Same, outside the query                                           | `.ds-stat dd::after`: a 3 px accent rule, as wide as the figure.                                                                                                                                                                                                                                                                                                                           |
| Address         | `Email.astro`, same CSS                                           | The address's text sits in `.ds-email__text`, whose `::after` is its 2 px rule, in place of the text underline.                                                                                                                                                                                                                                                                            |
| MA-17           | `Email.astro`, `Icon.astro`, `contact.ts`, same CSS               | A `check` icon shares a grid cell with `copy`; `data-state="copied"` shows it and draws its path by `stroke-dashoffset` in 300 ms; the icons scale in 220 ms and the labels slide by `translate`. `COPIED_FOR` becomes 2,600 ms.                                                                                                                                                           |
| MA-19 (cards)   | `reveal.client.ts`, same CSS                                      | One passive `pointermove` listener, on pointer devices with motion allowed, sets `--mx` and `--my` on the card under the pointer; a radial accent light is the card's own background layer, under its text, faded in on hover through a registered `--rv-glow`. (A `::before` light, tried first, held back the browser's scroll restoring on a reload, which spec 025's T8 check caught.) |
| Docs            | `docs/plan.md`, D211, the log                                     | Slice 5.4's state, and the record.                                                                                                                                                                                                                                                                                                                                                         |

## Tests first

`tests/028/` holds the new tests, traced to every ID in the spec:

- `static/reveal.test.ts`: the markup's blocks; every pose and animation inside no-preference; only `translate`, `scale` and color in the keyframes, never `opacity` or `filter`; the script's one observer and no scroll listener; the stat's rule outside the query; `COPIED_FOR` (S1.5, S2.1, S5.4–S5.6, S6.4, FR-005, FR-006).
- `e2e/reveal.test.ts`: the running animations' targets, delays and durations as each section scrolls in (S1.x, S2.2, S2.3); the pose and its reset (S1.5); the figures' and address's rules at rest (S2.1, S2.3); the copy's swap, draw and reset, and the refused copy (S3.x); the light (S4.x); the full-page capture, no replay, deep links, reduced motion and no script (S5.x); listeners, layout shift, the module's size and the CSP (S6.3–S6.5).
- `e2e/a11y-visual.test.ts`: axe and the snapshots (S6.1, S6.2).

Amended, each with this spec named in a comment:

- Spec 009: the stat's and address's markup and look, and the gallery's baselines.
- Specs 010–014, 016–018 and 025–027: the home and gallery baselines, which now show the figures' rule and the address's drawn rule; any check of the page's running animations or inline styles that the reveal now touches.
- Spec 017: `COPIED_FOR` is 2,600, and the copy button holds two icons.
- Specs 016, 017, 018, 025, 026 and 027: the one module's size checks take the new allowance; spec 027's observer count takes the reveal's one.

## Risks

- Every home baseline changes again, remade in the pinned container. Element shots stay at reduced motion, where nothing is posed.
- Older motion tests that scroll the page with motion allowed may now see reveal animations; they filter to their own.
- A reader who stops with a block's edge just on screen leaves it posed, a few pixels low, until they scroll on. It's never hidden.

## Decisions

D211, in [spec.md](spec.md), and Brad's three Gate 1 cards. The tier-3 details are listed in the spec.
