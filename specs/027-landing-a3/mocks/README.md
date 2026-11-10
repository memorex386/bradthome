# Spec 027: states and motion

The approved mock is the private landing study's "A · Refined" view, which Brad reviewed on 2026-11-09. Nothing from it is copied into this repo. The page itself, on `next`, is the record once this slice lands.

## States this slice touches

| State                    | What A3 checks                                                        | How                                          |
| ------------------------ | --------------------------------------------------------------------- | -------------------------------------------- |
| S01 First visit, desktop | The header at rest, 72 px, no bar                                     | `tests/027/e2e/frame.test.ts`, the snapshots |
| S02 First visit, phone   | The header at rest; the role switch on one line                       | Same                                         |
| S03 Dark                 | The bar, the band's colors and the footer in dark                     | Same                                         |
| S05 Reduced motion       | The bar switches at 8 px at once; no scrub, no underline, no drops    | `frame.test.ts`, the snapshots               |
| S06 Deep link            | `/#hopper` loads condensed, with Hopper marked                        | `frame.test.ts`                              |
| S08 Link preview open    | MA-18's open and close                                                | `frame.test.ts`                              |
| S11 Phone menu open      | MA-21's drop; the marked link underlined                              | `frame.test.ts`, the snapshots               |
| S12 No script            | The header stays at the top on its bar; every link works              | `frame.test.ts`                              |
| S13 Fonts loading        | Layout shift 0; the rule placed after the fonts load                  | `frame.test.ts`, Lighthouse                  |
| S16 Reading mid-page     | The header condensed, a section marked, the band's colors over Hopper | `frame.test.ts`, the snapshots               |

## Motion

The brief's table for this slice. The spring isn't used here; every ease is `--ease-out-soft`, `cubic-bezier(0.2, 0.7, 0.2, 1)`.

| ID    | Element      | Trigger                     | Timing                        | What moves                                                | Reduced motion               |
| ----- | ------------ | --------------------------- | ----------------------------- | --------------------------------------------------------- | ---------------------------- |
| MA-6  | Header       | Scrolling past 8 px         | 240 ms; scrubbed over 0–64 px | Bar, blur and hairline fade in; 72 to 60 px; name to 0.94 | Switches at 8 px; no scaling |
| MA-7  | Header       | The band reaches the header | 240 ms                        | The band's colors                                         | Instant                      |
| MA-8  | Section rule | A section crosses 40%       | 320 ms                        | A 2 px rule slides and resizes under the link             | Jumps                        |
| MA-16 | Jump         | An in-page link             | Smooth scroll, then 1,100 ms  | The heading's underline draws, holds and retracts         | Instant jump, no underline   |
| MA-18 | Link preview | Hover, focus or tap         | 200 ms open, 120 ms close     | From the link's corner: 0.96 scale, 4 px rise, fade       | Instant                      |
| MA-21 | Phone menu   | Tap the menu button         | 200 ms                        | The panel drops 6 px as it opens                          | Instant                      |

## The spike's measurements

On the build in Chromium at 1280 × 800, motion allowed, scroll set with no smoothing:

| Scroll | Bar height | Bar opacity | Name scale | `data-stuck` | Marked      |
| ------ | ---------- | ----------- | ---------- | ------------ | ----------- |
| 0      | 72         | 0           | 1          | no           | none        |
| 8      | 70.5       | 0.125       | 0.993      | no           | none        |
| 32     | 66         | 0.5         | 0.97       | yes          | none        |
| 64     | 60         | 1           | 0.94       | yes          | none        |
| 900    | 60         | 1           | 0.94       | yes          | Hopper      |
| 4,000  | 60         | 1           | 0.94       | yes          | Experience  |
| 5,000  | 60         | 1           | 0.94       | yes          | On the side |
| End    | 60         | 1           | 0.94       | yes          | Contact     |

The one module: 8,510 bytes before, 9,578 with the header's script (+1,068).
