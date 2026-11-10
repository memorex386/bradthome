# Spec 025: states and motion

The approved mock is the private landing study's "A · Refined" view, at the Brisk pace, which Brad reviewed on 2026-11-09. Nothing from it is copied into this repo. The page itself, on `next`, is the record once this slice lands.

## States this slice touches

| State                         | What A1 checks                                                                                    | How                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| S01 First visit, desktop      | The Brisk sequence, the tiles, the switch under them, T2's positions at 1280 × 800 and 1440 × 900 | `tests/025/e2e/first-screen.test.ts` and `a11y-visual.test.ts`'s snapshots |
| S02 First visit, phone        | The same at 390 × 844 and 320 wide                                                                | Same                                                                       |
| S03 Dark                      | Every snapshot and contrast check in dark                                                         | Same                                                                       |
| S04 Role page                 | The highlights at rest, the current role marked in the switch                                     | `first-screen.test.ts`, snapshots                                          |
| S05 Reduced motion            | Nothing animates or transitions; the hero at rest                                                 | `first-screen.test.ts`                                                     |
| S06 Deep link or return visit | `/#hopper` and restored scroll finish the hero at once; going back replays nothing                | `first-screen.test.ts`                                                     |
| S12 No script                 | The hero, tiles and switch complete, every link working                                           | `first-screen.test.ts`                                                     |
| S13 Fonts loading             | Layout shift 0                                                                                    | `first-screen.test.ts`                                                     |

## Motion

The brief's motion table, MA-1–MA-5 and MA-19 for the hero, is the target. The spring is `cubic-bezier(0.3, 1.32, 0.52, 1)` and the ease-out `cubic-bezier(0.2, 0.7, 0.2, 1)`.

| ID    | Element                          | Start                        | Duration   | What moves                                               |
| ----- | -------------------------------- | ---------------------------- | ---------- | -------------------------------------------------------- |
| MA-1  | Words                            | 0, 300, 600 ms               | 520 ms     | Rise 0.14 em on the spring; muted to its color, ease-out |
| MA-2  | Dots                             | 286, 586, 886 ms             | 520 ms     | Scale 0.45, 1.3, 1; muted to its color                   |
| MA-3  | Rows                             | 140, 440, 740 ms             | 700 ms     | A sheen crosses; border and layer accent at 30–55%       |
| MA-4  | Lines, actions, tiles and switch | 760 and 880, 1,000, 1,060 ms | 540 ms     | Rise 10 px, ease-out; done at 1,600 ms                   |
| MA-5  | A word and its rows              | Hover                        | 150–240 ms | Accent; rows move in 3 px                                |
| MA-19 | Hero button, tiles               | Hover, press                 | 150–240 ms | Lift 1 px, arrow 3 px, press 0.98                        |
