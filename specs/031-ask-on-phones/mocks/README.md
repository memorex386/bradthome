# Spec 031: states and motion

The approved mock is option 1 of the private "Ask button on phones" study, which Brad reviewed on 2026-11-11. Nothing from it is copied into this repo. The page itself, on `next`, is the record once this slice lands; `tests/snapshots/031/` holds each state's baseline.

## States, on a 375 × 812 phone

| State                    | The button                                          | How                                   |
| ------------------------ | --------------------------------------------------- | ------------------------------------- |
| On load                  | The full pill in the corner, from 1.8 s             | `tests/031/e2e/corner.test.ts`, snapshot |
| Scrolling down           | A 56 × 56 px circle around the sparkle              | Same                                  |
| Stopped, or scrolling up | The full pill                                       | Same                                  |
| The hero's place in view | In the hero; nothing floats                         | Same                                  |
| The end of the page      | Hidden                                              | Same                                  |
| Reduced motion           | The full pill, appearing and disappearing at once   | Same                                  |
| Tapped                   | Today's full-screen sheet (D189)                    | Same, axe                             |
| No script                | Not shown                                           | `corner.test.ts`                      |

## Motion

| ID     | Element            | Trigger                         | Timing                       | What moves                                            | Reduced motion |
| ------ | ------------------ | ------------------------------- | ---------------------------- | ----------------------------------------------------- | -------------- |
| MA-20  | The corner button  | It floats                       | 420 ms; the first from 1.8 s | Rises 14 px from 0.9 scale on the spring; fades in    | At once        |
| MA-22  | The corner button  | The visitor scrolls down        | 300 ms                       | The words fold to a 56 px circle                      | None           |
| MA-23  | The corner button  | A 0.6 s stop, or a scroll up    | 300 ms                       | The words open back up                                | None           |
| MA-24  | The corner button  | The end of the page             | 220–320 ms                   | Fades and drops 16 px                                 | At once        |

## The spike's measurements

On the build in Chromium, at 375 × 812, both themes:

- On load: floating, the full pill, 186 × 56 px, 20 px from the right edge.
- Scrolling down at 1,440 px: 56 × 56 px; 0.9 s after stopping: 186 × 56 px.
- At 520 px: in the hero, static, 52 px tall.
- At the end: hidden.
- The page's height: 9,870 px in every state.
- The one module: 11,346 bytes before, 12,019 with this slice (+673).
