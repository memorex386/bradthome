# Spec 045: states

The mocks are this slice's own build, captured on 2026-11-18 in Chromium at 1× density from a local preview of the production build by [capture.ts](capture.ts), with reduced motion, at 375 × 812 and 1440 × 900, in both themes. Each answer is the fake API's, in the words of the study's proposals (`fixtures.ts`'s `VOICED`), so no model was called. The real model's own replies to all 14 of the study's questions are shown to Brad at Gate 2. Once the slice lands, `tests/snapshots/045/` holds each state's baseline from the pinned container.

## States

| ID | The study's scenario | State | Hand-off | Phone, 375 × 812 | Desktop, 1440 × 900 |
| --- | --- | --- | --- | --- | --- |
| V1 | Venting: "this sucks" | answered | none | [light](V1-phone-light.png), [dark](V1-phone-dark.png) | [light](V1-desktop-light.png), [dark](V1-desktop-dark.png) |
| V2 | The best thing about Brad's work | answered | none | [light](V2-phone-light.png), [dark](V2-phone-dark.png) | [light](V2-desktop-light.png), [dark](V2-desktop-dark.png) |
| V3 | "hi" | chat | none | [light](V3-phone-light.png), [dark](V3-phone-dark.png) | [light](V3-desktop-light.png), [dark](V3-desktop-dark.png) |
| V7 | "Is Brad a good engineer?" | answered | none | [light](V7-phone-light.png), [dark](V7-phone-dark.png) | [light](V7-desktop-light.png), [dark](V7-desktop-dark.png) |
| V9 | Salary | boundary | Email Brad | [light](V9-phone-light.png), [dark](V9-phone-dark.png) | [light](V9-desktop-light.png), [dark](V9-desktop-dark.png) |
| V14 | A 5,000-person bank's fit question | answered | none | [light](V14-phone-light.png), [dark](V14-phone-dark.png) | [light](V14-desktop-light.png), [dark](V14-desktop-dark.png) |

Each shows the window scrolled to the newest answer, as a visitor sees it once the answer finishes: the answer, its sources, any hand-off, Copy and Inspect, then "Ask next" and three pills. On a phone the pills wrap one to a line when they're long.

## Motion

None new. The pills appear with the answer's end, at rest, and share the starters' hover transition, which reduced motion turns off.
