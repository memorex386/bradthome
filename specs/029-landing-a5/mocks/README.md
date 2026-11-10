# Spec 029: states and motion

The approved mock is the private landing study's "A · Refined" view, which Brad reviewed on 2026-11-09. Nothing from it is copied into this repo. The page itself, on `next`, is the record once this slice lands.

## States this slice touches

| State                    | What A5 checks                                                     | How                             |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------- |
| S01 First visit, desktop | Home to a role page morphs; the mark fades in                      | `tests/029/e2e/morph.test.ts`   |
| S02 First visit, phone   | The same at 390 × 844, from below the hero, after going to the top | Same                            |
| S03 Dark                 | The pages at rest in dark                                          | axe, and the existing baselines |
| S04 Role page            | Role to role morphs: the mark slides, the topics reorder           | `morph.test.ts`                 |
| S05 Reduced motion       | A plain load, with no transition                                   | `morph.test.ts`                 |
| S12 No script            | A plain load; the links work                                       | `morph.test.ts`                 |
| S13 Fonts loading        | Layout shift 0 after a switch                                      | `morph.test.ts`                 |

## Motion

The brief's MA-15, as built. The spring is `cubic-bezier(0.3, 1.32, 0.52, 1)`; the ease-out is `--ease-out-soft`, `cubic-bezier(0.2, 0.7, 0.2, 1)`.

| Part                         | Timing                     | What moves              | Reduced motion, no script, Firefox |
| ---------------------------- | -------------------------- | ----------------------- | ---------------------------------- |
| The mark                     | 360 ms, spring             | Slides to the new role  | A plain load                       |
| The mark, from the home      | 200 ms, ease-out           | Fades in                | Same                               |
| Eyebrow and note             | 110 ms out, then 200 ms in | Crossfade               | Same                               |
| Words, rows and roles' names | 200 ms, ease-out           | Relight in place        | Same                               |
| Hopper's topics              | 420 ms, spring             | Move to their new order | Same                               |
| The rest of the page         | None                       | Swaps at once           | Same                               |

## The spike's measurements

On the build in Chromium, motion allowed:

- Every named group ran with the timings above, on home to `/mobile` and on `/mobile` to `/ai`.
- From 300 px down at 390 × 844, the page went to its top at the tap, the words' morph started and ended at the same place, `/ai` opened at its top, and the hero had no running animation when the morph started. Keeping the place instead failed: the new page's scroll was held at 0 until the transition ended.
- The header's link home, from a role page, ran no transition and opened at the top.
- Under reduced motion no transition ran. Firefox loaded `/mobile` normally.
- The one module: 10,568 bytes before, 11,049 with the morph (+481); 4,263 to 4,426 gzipped.
