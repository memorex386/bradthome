# Spec 011 mocks: the Hopper story

"Show it" for [spec 011](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mock is the section itself, on `/v2#hopper`, built from this branch. Open it on this pull request's preview, on a phone or a desktop. Tap a numbered marker or a note to open it.
- The screenshots were taken in Edge on Windows with reduced motion on. The snapshot baselines come from the pinned container at the build, so their text renders a little differently.
- The look is Home v2's band with C's receipts (D118). The words are the public Hopper claims, as written (D129).

## Every state

| ID                | State                                                               | Screenshot                              | Scenarios        |
| ----------------- | ------------------------------------------------------------------- | --------------------------------------- | ---------------- |
| <a id="k1"></a>K1 | At rest, desktop, light, 1280 wide: notes in the margin, all closed | [K1](K1-rest-desktop-light.png)         | S1.1, S1.2, S3.4 |
| <a id="k2"></a>K2 | At rest, desktop, dark                                              | [K2](K2-rest-desktop-dark.png)          | S1.1, S1.2       |
| <a id="k3"></a>K3 | At rest, phone, light, 390 wide: notes in line under each claim     | [K3](K3-rest-phone-light.png)           | S1.3, S3.4       |
| <a id="k4"></a>K4 | At rest, phone, dark                                                | [K4](K4-rest-phone-dark.png)            | S1.3             |
| <a id="r1"></a>R1 | Receipt 3 open in the margin, desktop, light: the ask-me state      | [R1](R1-receipt-open-desktop-light.png) | S3.2, S3.5       |
| <a id="r2"></a>R2 | Receipt 3 open in line, phone, dark: the ask-me state               | [R2](R2-receipt-open-phone-dark.png)    | S3.2, S3.5       |
| <a id="f1"></a>F1 | Keyboard: marker 3 focused on the band, desktop, dark               | [F1](F1-focus-marker-desktop-dark.png)  | S4.1             |
| <a id="f2"></a>F2 | Keyboard: receipt 3's summary focused on its note, phone, light     | [F2](F2-focus-receipt-phone-light.png)  | S4.1             |

Every Hopper claim is in the ask-me state today, since none has a public link. The proof state is spec 009's, shown on the gallery at `/design-system#receipts`, and a test proves the section uses it once a claim has a link.
