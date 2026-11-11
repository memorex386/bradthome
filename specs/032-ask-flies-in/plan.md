# Plan 032: "Ask about Brad" flies into the hero and back

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1, on 2026-11-11.

## Approach

Spec 031's two buttons stay. Neither changes its place in the layout; only the corner's moves, by a transform.

- `chat.css`: on a phone the hero's button takes the corner's pill: `align-self: flex-start`, 56 px tall, the corner's padding and the raised shadow. So the two are the same 186 × 56 px, and the flight is a move alone.
- `corner.client.ts`: an IntersectionObserver on the hero's button, with `threshold: 1` and a root margin of 172 px at the top (the header's 72 and 100 more) and 100 px at the bottom. Fully inside means "in". A position `p` runs from 0 (the corner) to 1 (the place); a `requestAnimationFrame` loop moves it toward its goal at 1 per 320 ms. Each frame it reads the place's rectangle and sets the corner's `transform: translate(…)` to the eased share of the gap. On landing in the place, the corner hides and the hero's button shows; on leaving, the corner shows before its first frame is drawn on the place.
- `data-fly` marks a flight: the corner's shrink and its circle pause, and no transition runs on its transform. `data-flown` marks the first flight: MA-20 plays only before it.
- With reduced motion the script swaps the two at once.

A spike of this plan, on the build at 375 × 812 in Chromium:

- Scrolling down slowly, the flight in started when the place's top reached 650 px and ended with the corner at (20, 570), exactly on the hero's button, 186 × 56 px.
- Scrolling on, the flight out started at 150 px and ended back in the corner at (169, 736).
- Flings, reversals and the return to the top all ended on target; layout shift 0.
- The one module: 12,051 bytes before, 12,688 with the spike (+637), and 12,682 as built (+631).

## Tests first

`tests/032/` holds the new tests, traced to every ID:

- `static/flight.test.ts`: the observer's margins and threshold; the loop's 320 ms and its translate; the reduced-motion swap; `data-fly` pausing the shrink; MA-20 only before `data-flown`; the hero's phone pill.
- `e2e/flight.test.ts`: each frame of a flight in and out, slow and flung and reversed, ends on target; no frame shows both buttons or neither; reduced motion swaps at once; the hero's pill matches the corner's size; layout shift 0; the desktop; no script; the module's size.
- `e2e/a11y-visual.test.ts`: axe and a snapshot of the pill in the hero, both themes.

Amended: spec 031's tests that expect an instant swap or MA-20 on a return from the end, its baselines with the hero's button, and the module allowances; phone baselines that show the hero's button.

## Decisions

D215, in [spec.md](spec.md), and Brad's cards.
