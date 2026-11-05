# Spec 012 mocks: Experience and the timeline

"Show it" for [spec 012](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mock is the section itself, on `/v2#experience`, built from this branch. Open it on this pull request's preview, on a phone or a desktop. Tap a timeline row to jump to its job, or a numbered marker or note to open it.
- The screenshots were taken in Edge on Windows with reduced motion on. The snapshot baselines come from the pinned container at the build, so their text renders a little differently.
- The look is Home v2's Experience section with C's receipts (D118). The words are the public claims and the job files (D129, D130).

## Every state

| ID                | State                                                                                    | Screenshot                               | Scenarios             |
| ----------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------- |
| <a id="e1"></a>E1 | At rest, desktop, light, 1280 wide: timeline, featured card, cards, lines, notes closed  | [E1](E1-rest-desktop-light.png)          | S1.1–S1.4, S2.1, S4.4 |
| <a id="e2"></a>E2 | At rest, desktop, dark                                                                   | [E2](E2-rest-desktop-dark.png)           | S1.1, S2.3            |
| <a id="e3"></a>E3 | At rest, phone, light, 390 wide: bars under each row, notes in line                      | [E3](E3-rest-phone-light.png)            | S1.5, S4.4            |
| <a id="e4"></a>E4 | At rest, phone, dark                                                                     | [E4](E4-rest-phone-dark.png)             | S1.5                  |
| <a id="r1"></a>R1 | Receipt 15 open in the margin, desktop, light: the proof state, linking the Play listing | [R1](R1-proof-open-desktop-light.png)    | S4.2, S4.5            |
| <a id="r2"></a>R2 | Receipt 16 open in line, phone, dark: the ask-me state                                   | [R2](R2-ask-open-phone-dark.png)         | S4.3, S4.5            |
| <a id="f1"></a>F1 | Keyboard: the timeline's Hopper row focused, desktop, dark                               | [F1](F1-focus-timeline-desktop-dark.png) | S5.1                  |
| <a id="f2"></a>F2 | Keyboard: marker 15 focused, phone, light                                                | [F2](F2-focus-marker-phone-light.png)    | S5.1                  |
