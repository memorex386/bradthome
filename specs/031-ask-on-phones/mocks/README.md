# Spec 031: states and motion

The approved mock is option 1 of the private "Ask button on phones" study, which Brad reviewed on 2026-11-11. Nothing from it is copied into this repo. `tests/snapshots/031/` holds each state's baseline, and the page itself, on `next`, is the record once this slice lands.

## States, on a 375 × 812 phone

| State                    | What shows                                          | How                                      |
| ------------------------ | --------------------------------------------------- | ---------------------------------------- |
| On load                  | The corner's full pill, from 1.8 s                  | `tests/031/e2e/corner.test.ts`, snapshot |
| Scrolling down           | A 56 px circle around the sparkle                   | Same                                     |
| Stopped, or scrolling up | The full pill                                       | Same                                     |
| The hero's button in view | The hero's button; the corner's is hidden          | Same                                     |
| The end of the page      | Neither                                             | Same                                     |
| Reduced motion           | The full pill, appearing and disappearing at once   | Same                                     |
| Tapped                   | Today's full-screen sheet (D189)                    | Same, axe                                |
| No script                | Neither                                             | `corner.test.ts`                         |

## Motion

| ID    | Element           | Trigger                      | Timing                       | What moves                                         | Reduced motion |
| ----- | ----------------- | ---------------------------- | ---------------------------- | -------------------------------------------------- | -------------- |
| MA-20 | The corner button | It shows                     | 420 ms; the first from 1.8 s | Rises 14 px from 0.9 scale on the spring; fades in | At once        |
| MA-22 | The corner button | The visitor scrolls down     | 300 ms                       | A clip closes to a 56 px circle, slid to the corner | None           |
| MA-23 | The corner button | A 0.6 s stop, or a scroll up | 300 ms                       | The clip opens back to the pill                    | None           |
| MA-24 | The corner button | The end of the page          | 220–320 ms                   | Fades and drops 16 px                              | At once        |

## The build's measurements

On the build in Chromium, at 375 × 812, both themes:

- On load: the corner's pill, 187 × 56 px, 20 px from the right and bottom edges.
- Scrolling down at 2,000 px: only the 56 px circle can be tapped; after a stop, the pill.
- At 520 px: the hero's button in place; the corner's hidden.
- At the end: neither shown.
- Layout shift: 0, scrolling down the page and back.
- The one module: 11,346 bytes before, 12,091 with this slice (+745).
