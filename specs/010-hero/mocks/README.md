# Spec 010 mocks: the hero

"Show it" for [spec 010](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mock is the page itself, `/v2`, built from this branch. Open it on this pull request's preview, on a phone or a desktop, and reload it to replay the sequence. Turn on the device's reduce-motion setting to see it at rest.
- The screenshots were taken in Edge on Windows. The mid-sequence ones freeze every animation at the time shown. The snapshot baselines come from the pinned container at the build, so their text renders a little differently.
- The look is Home v2's (D118), the words are take 3 (D124), the pace is Story (D125), and the text is readable from the first frame (D126).

## Every state

| ID                | State                                                                               | Screenshot                             | Scenarios  |
| ----------------- | ----------------------------------------------------------------------------------- | -------------------------------------- | ---------- |
| <a id="h1"></a>H1 | At rest, desktop, light, 1280×800 (reduced motion, or after 2.7 s)                  | [H1](H1-rest-desktop-light.png)        | S1.1, S3.1 |
| <a id="h2"></a>H2 | At rest, desktop, dark                                                              | [H2](H2-rest-desktop-dark.png)         | S1.1, S3.1 |
| <a id="h3"></a>H3 | At rest, phone, light, 390×844, whole page                                          | [H3](H3-rest-phone-light.png)          | S1.2, S3.1 |
| <a id="h4"></a>H4 | At rest, phone, dark, whole page                                                    | [H4](H4-rest-phone-dark.png)           | S1.2, S3.1 |
| <a id="q1"></a>Q1 | First frame, 0 ms, desktop, light: every word readable in gray, every part in place | [Q1](Q1-first-frame-desktop-light.png) | S1.3, S2.1 |
| <a id="q2"></a>Q2 | 700 ms, desktop, dark: "Mobile." landed, "Full-stack." rising, the mobile rows lit  | [Q2](Q2-mid-700ms-desktop-dark.png)    | S2.1, S2.2 |
| <a id="q3"></a>Q3 | 1,600 ms, phone, light: the words landed, the first line rising                     | [Q3](Q3-mid-1600ms-phone-light.png)    | S2.3       |
| <a id="q4"></a>Q4 | 2,200 ms, phone, dark: the dots blue, the buttons and chips rising                  | [Q4](Q4-mid-2200ms-phone-dark.png)     | S2.3       |
| <a id="f1"></a>F1 | Keyboard: "See the work at Hopper" focused, desktop, light                          | [F1](F1-focus-work-desktop-light.png)  | S4.1       |
| <a id="f2"></a>F2 | Keyboard: "Read the résumé" focused, phone, dark                                    | [F2](F2-focus-resume-phone-dark.png)   | S4.1       |

## The sequence

| Time               | What happens                                                                            |
| ------------------ | --------------------------------------------------------------------------------------- |
| 0 ms               | Everything is painted. The words are muted gray and 0.12 em low, and the dots are gray. |
| 0–650 ms           | "Mobile." rises into ink. The Android and iOS rows light from 120 ms.                   |
| 520–1,170 ms       | "Full-stack." rises. The Web and Services rows light from 640 ms.                       |
| 1,040–1,690 ms     | "Applied AI." rises. The AI row lights from 1,160 ms.                                   |
| 1,495 and 1,755 ms | The two lines rise 10 pixels, over 560 ms each.                                         |
| 1,810–2,310 ms     | The three dots turn blue.                                                               |
| 2,015 ms           | The buttons rise.                                                                       |
| 2,115–2,675 ms     | The chips rise, and the hero is at rest.                                                |
