# Spec 047: mocks

Captured from this slice's own build on 2026-11-20, served as Firebase serves it, with Playwright's Chromium. Desktop captures are the 1440 × 900 screen at the Fintech AI card; phone captures are the whole card at 375 px wide (812 tall), since it's taller than the screen. The Hopper band is dark in both themes, so the replay looks the same in both; the header around it follows the theme. The four new claims aren't in these yet: they arrive through the export after Gate 1, above the replay, and their words are in [spec.md](../spec.md)'s S4.1.

| ID | State | Desktop | Phone |
| --- | --- | --- | --- |
| M1 | The opening: the first message, the first offer's card and its pills, with the trace from "Before the first word" to `offer_viewed` | [light](M1-opening-desktop-light.png) · [dark](M1-opening-desktop-dark.png) | [light](M1-opening-phone-light.png) · [dark](M1-opening-phone-dark.png) |
| M2 | The typed question and its answer, with new pills | [light](M2-question-desktop-light.png) · [dark](M2-question-desktop-dark.png) | [light](M2-question-phone-light.png) · [dark](M2-question-phone-dark.png) |
| M3 | The typed decision: "Yeah, I'll take it", the first card's button chosen | [light](M3-decision-desktop-light.png) · [dark](M3-decision-desktop-dark.png) | [light](M3-decision-phone-light.png) · [dark](M3-decision-phone-dark.png) |
| M3d | The declines path's decision: "I don't think I need that", "No, thanks" chosen | [light](M3-decision-declines-desktop-light.png) | |
| M4 | The summary: the first added, the second declined, $9 | [light](M4-summary-desktop-light.png) · [dark](M4-summary-desktop-dark.png) | [light](M4-summary-phone-light.png) · [dark](M4-summary-phone-dark.png) |
| M4d | The declines path's summary: the first declined, the second added, $38 | [light](M4-summary-declines-desktop-light.png) | |
| M5 | Reduced motion: the finished frame, still, with Play first | [light](M5-reduced-motion-desktop-light.png) · [dark](M5-reduced-motion-desktop-dark.png) | [light](M5-reduced-motion-phone-light.png) · [dark](M5-reduced-motion-phone-dark.png) |
| M6 | No script: the empty phone and trace at full size, the controls hidden, the label and its link | [light](M6-no-script-desktop-light.png) · [dark](M6-no-script-desktop-dark.png) | [light](M6-no-script-phone-light.png) · [dark](M6-no-script-phone-dark.png) |
| M7 | `/offer-agent`: both paths' finished frames as plain HTML, the whole page | [light](M7-page-desktop-light.png) · [dark](M7-page-desktop-dark.png) | [light](M7-page-phone-light.png) · [dark](M7-page-phone-dark.png) |
