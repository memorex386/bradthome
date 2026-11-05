# Spec 013 mocks: On the side

"Show it" for [spec 013](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mock is the section itself, on `/v2#side`, built from this branch. Open it on this pull request's preview, on a phone or a desktop, and tap a numbered marker or note to open it.
- The snapshot baselines in `tests/snapshots/013/` show each state below, from the pinned container with reduced motion on.
- The look is Home v2's "On the side" section with C's receipts (D118). The words are the public claims and the project files (D129, D132).

## Every state

| ID                | State                                                                                               | Scenarios       |
| ----------------- | --------------------------------------------------------------------------------------------------- | --------------- |
| <a id="p1"></a>P1 | At rest, desktop, light, 1280 wide: VINDecoded's card, then Sudoku World's small card, notes closed | S1.1–S1.3, S3.4 |
| <a id="p2"></a>P2 | At rest, desktop, dark                                                                              | S1.1, S4.4      |
| <a id="p3"></a>P3 | At rest, phone, light, 390 wide: stats under the name, notes in line                                | S1.5, S3.4      |
| <a id="p4"></a>P4 | At rest, phone, dark                                                                                | S1.5            |
| <a id="r1"></a>R1 | Receipt 20 open in the margin, desktop, light: the proof state, linking both store listings         | S3.2, S3.5      |
| <a id="r2"></a>R2 | Receipt 23 open in line, phone, dark: the ask-me state                                              | S3.3, S3.5      |
| <a id="f1"></a>F1 | Keyboard: marker 19 focused, desktop, dark                                                          | S4.1            |
| <a id="f2"></a>F2 | Keyboard: the "Read the case study" link focused, phone, light                                      | S4.1            |
