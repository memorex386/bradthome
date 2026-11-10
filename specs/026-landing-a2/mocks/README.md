# Spec 026: states and motion

The approved mock is the private landing study's "A · Refined" view with Receipts set to Drawer, which Brad reviewed on 2026-11-09. Nothing from it is copied into this repo. The page itself, on `next`, is the record once this slice lands.

## States this slice touches

| State                    | What A2 checks                                                                      | How                                             |
| ------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| S01 First visit, desktop | Each card's control beside its tags; the page's height within 3%                    | `tests/026/e2e/receipts.test.ts`, the snapshots |
| S02 First visit, phone   | The control beside the last tag or under the tags; the page at least 800 px shorter | Same                                            |
| S03 Dark                 | Every snapshot and contrast check in dark                                           | Same                                            |
| S04 Role page            | The same drawers and numbers as before on each role page                            | `receipts.test.ts`                              |
| S05 Reduced motion       | The drawer opens at once; the row's tint shows without fading                       | `receipts.test.ts`, the snapshots               |
| S07 A receipt opened     | A marker opens its drawer and tints its row                                         | `receipts.test.ts`, the open-drawer snapshots   |
| S12 No script            | The drawer opens from its control and from each marker                              | `receipts.test.ts`                              |
| S13 Fonts loading        | Layout shift 0                                                                      | `receipts.test.ts`, Lighthouse                  |

## Motion

| ID    | Element         | Trigger                 | Timing                                       | What moves                  | Reduced motion                  |
| ----- | --------------- | ----------------------- | -------------------------------------------- | --------------------------- | ------------------------------- |
| MA-12 | Receipts drawer | A marker or the control | Opens in 280 ms; chevron 240 ms; tint 650 ms | Height opens; the row tints | Opens at once; the tint is held |

The height animates only where the browser can animate a disclosure's size (`interpolate-size` and `::details-content`); elsewhere it opens at once, the difference the brief allows.

## Measured heights

At reduced motion, on the build, `document.documentElement.scrollHeight` on `/`. Each role page measures the same.

| Size       | Before (`5f5ffbc`) | Spike | Change       |
| ---------- | ------------------ | ----- | ------------ |
| 390 × 844  | 10,497             | 9,606 | −891 px      |
| 1280 × 800 | 6,577              | 6,691 | +114 (+1.7%) |
| 1440 × 900 | 6,656              | 6,770 | +114 (+1.7%) |
