# Spec 028: states and motion

The approved mock is the private landing study's "A · Refined" view, which Brad reviewed on 2026-11-09. Nothing from it is copied into this repo. The page itself, on `next`, is the record once this slice lands.

## States this slice touches

| State                    | What A4 checks                                                        | How                                |
| ------------------------ | --------------------------------------------------------------------- | ---------------------------------- |
| S01 First visit, desktop | Nothing below the first screen is posed; sections play as they arrive | `tests/028/e2e/reveal.test.ts`     |
| S02 First visit, phone   | The same at 390 × 844                                                 | Same                               |
| S03 Dark                 | The figures' and address's rules, and the copied check, in dark       | The snapshots                      |
| S05 Reduced motion       | Nothing posed or played; every rule and bar in place                  | `reveal.test.ts`, the snapshots    |
| S09 Address copied       | The check draws, the label slides, and it rests after 2.6 s           | `reveal.test.ts`, spec 017's tests |
| S10 Copy refused         | The address selected; "Address selected" slides in                    | Same                               |
| S12 No script            | The page complete and at rest                                         | `reveal.test.ts`                   |
| S13 Fonts loading        | Layout shift 0                                                        | `reveal.test.ts`, Lighthouse       |
| S16 Reading mid-page     | Each section settles once; scrolling back replays nothing             | `reveal.test.ts`                   |

## Motion

The brief's table for this slice. Every ease is `--ease-out-soft`, `cubic-bezier(0.2, 0.7, 0.2, 1)`.

| ID    | Element                      | Trigger                     | Timing                                                        | What moves                                       | Reduced motion |
| ----- | ---------------------------- | --------------------------- | ------------------------------------------------------------- | ------------------------------------------------ | -------------- |
| MA-9  | Section heads                | First time 18% in view      | Eyebrow 480 ms; heading 600 ms, 70 ms later                   | Eyebrow rises 10 px; heading 14 px, muted to ink | In place       |
| MA-10 | Cards                        | First time 18% in view      | 560 ms, 90 ms apart                                           | Rise 18 px                                       | In place       |
| MA-11 | Receipt markers              | With their card, +220 ms    | 320 ms, 45 ms apart                                           | Scale 0.8, 1.08, then 1                          | In place       |
| MA-13 | Timeline bars                | With the timeline, +120 ms  | Oldest first, 70 ms apart, Hopper last; 640 ms                | Draw from the left                               | Full bars      |
| MA-14 | Figure rules and the address | With their card, or in view | Figures +100 ms, 90 ms apart, 680 ms; address +100 ms, 760 ms | The rule draws left to right                     | Rule in place  |
| MA-17 | Copy address                 | Tap Copy                    | Swap 220 ms; check 300 ms; rests after 2.6 s                  | Icon to check; the label slides                  | Instant swap   |
| MA-19 | Cards                        | Pointer over a card         | Light fades in over 300 ms                                    | A soft light follows the pointer                 | No light       |

## The spike's measurements

On the build in Chromium, motion allowed, scrolled at once so Experience's top sat mid-screen:

| Target             | Animation  | Delay (ms)     | Duration (ms) |
| ------------------ | ---------- | -------------- | ------------- |
| Eyebrow            | rise 10 px | 0              | 480           |
| Heading            | rise, ink  | 70             | 600           |
| Timeline           | rise 18 px | 90             | 560           |
| Bars, oldest first | draw       | 210, 280 … 560 | 640           |
| Hopper's last card | rise 18 px | 0              | 560           |
| Its markers        | pop        | 220, 265       | 320           |

No block was posed at load or after a full-page capture at 1280 × 800 and 390 × 844. Scrolling back to the top and down again started nothing. Under reduced motion no block was ever marked. The one module: 9,578 bytes before, 10,538 with the reveal (+960).
