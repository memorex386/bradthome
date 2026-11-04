# Spec 009 mocks: the design system

"Show it" for [spec 009](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mock is the gallery itself, `/design-system`, built from this branch. Open it on this pull request's preview, on a phone or a desktop; its Theme switch shows light and dark on one device.
- The screenshots were taken in Edge on Windows, with reduced motion on. The snapshot baselines come from the pinned container at the build, so their text renders a little differently.
- The look is direction A's Home v2 with C's receipts ([D116](../../../docs/decisions/0116-direction-a-with-cs-numbered-evidence-receipts.md)). The gallery's words are its own, not the boards'.

## Every state

| ID | State | Screenshot | Scenarios |
| --- | --- | --- | --- |
| <a id="g1"></a>G1 | Gallery, desktop, light, 1280×800, whole page | [G1](G1-gallery-desktop-light.png) | S1.1, S1.3, S2.1–S2.6, S3.1 |
| <a id="g2"></a>G2 | Gallery, desktop, dark | [G2](G2-gallery-desktop-dark.png) | S1.3, S2.5 |
| <a id="g3"></a>G3 | Gallery, phone, light, 390×844, whole page | [G3](G3-gallery-phone-light.png) | S1.3, S2.1, S3.2 |
| <a id="g4"></a>G4 | Gallery, phone, dark | [G4](G4-gallery-phone-dark.png) | S1.3, S3.2 |
| <a id="m1"></a>M1 | The phone's menu, open | [M1](M1-menu-open-phone-light.png) | S2.1 |
| <a id="r5"></a>R5 | A receipt opened by its marker, desktop, light | [R5](R5-receipt-open-desktop-light.png) | S3.1, S3.4 |
| <a id="r6"></a>R6 | A receipt opened by its marker, phone, dark | [R6](R6-receipt-open-phone-dark.png) | S3.2, S3.4 |
| <a id="f1"></a>F1 | Keyboard: the first Tab shows "Skip to the gallery" | [F1](F1-focus-skip-desktop-light.png) | S4.1 |
| <a id="f2"></a>F2 | Keyboard: the header's name, phone, dark | [F2](F2-focus-name-phone-dark.png) | S4.1 |
| <a id="f3"></a>F3 | Keyboard: the résumé button, desktop, dark | [F3](F3-focus-resume-desktop-dark.png) | S4.1 |

Inside G1–G4, the gallery's own sections hold the rest:

| ID | Section | Scenarios |
| --- | --- | --- |
| C1 | Buttons: default, hover and keyboard focus | S2.3 |
| C2 | Links: text, quiet and navigation, in each state | S2.3 |
| C3 | Chips: highlights and tags | S2.3 |
| C4 | The role switch: "Any role" chosen, hover, keyboard focus | S2.3, S2.4 |
| C5 | Eyebrows, headings and stats | S2.3 |
| C6 | Cards: plain, highlighted, soft, feature, and a link card in each state | S2.3 |
| C7 | The dark band, with its cards, chips and link | S2.5 |
| R1–R4 | Receipts: closed and open proof, open ask-me, and the markers' states | S3.1–S3.5 |
| A1 | Ask about Brad: default, hover and focus | S2.6 |

## Motion

With reduced motion off, buttons, links and the role switch fade their colors over 150 ms on hover, and a link card lifts 2 pixels and gains its shadow over 240 ms. A receipt's chevron turns as it opens. With reduced motion on, each changes at once. Nothing loops.
