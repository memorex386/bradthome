# Spec 014 mocks: Role links

"Show it" for [spec 014](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mocks are the pages themselves, built from this branch: `/v2`, `/mobile`, `/fullstack` and `/ai` on this pull request's preview. Open any of them on a phone or a desktop and use the "Hiring for" switch under the header to move between them.
- The snapshot baselines in `tests/snapshots/014/` show each state below, from the pinned container with reduced motion on.
- The look is the Home v2 board's switch and highlight (D118). The words are the home's, the same on every page (D6).

## Every state

| ID                | State                                                                                                           | Scenarios       |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | --------------- |
| <a id="m1"></a>M1 | `/mobile`'s top, desktop, light, 1280 wide: "Mobile" current in the switch, "Mobile." blue, the mobile rows lit | S1.1–S1.4, S3.1 |
| <a id="m2"></a>M2 | `/mobile`'s top, phone, dark, 390 wide: the switch wrapped, the same highlight                                  | S1.6            |
| <a id="m3"></a>M3 | `/fullstack`'s top, desktop, dark                                                                               | S1.2, S1.4      |
| <a id="m4"></a>M4 | `/fullstack`'s top, phone, light                                                                                | S1.6            |
| <a id="m5"></a>M5 | `/ai`'s top, desktop, light: "Applied AI." blue, the AI row lit, "Lit for applied AI"                           | S1.2, S1.4      |
| <a id="m6"></a>M6 | `/ai`'s top, phone, dark                                                                                        | S1.6            |
| <a id="f1"></a>F1 | Keyboard: the switch's "Applied AI" link focused on `/mobile`, desktop, light                                   | S3.3            |

## The order of the sections and cards

Every page shows the header, the switch, the hero, `#hopper`, `#experience` and `#side`. Only the Hopper topics move (D134):

| Page         | Hopper topics, after the role lines                                                        |
| ------------ | ------------------------------------------------------------------------------------------ |
| `/v2`        | Disruption Assistance, Partner platform, Fintech AI, Agent workflow, RemoteUI and WebViews |
| `/mobile`    | RemoteUI and WebViews, Disruption Assistance, Partner platform, Fintech AI, Agent workflow |
| `/fullstack` | Disruption Assistance, Partner platform, RemoteUI and WebViews, Agent workflow, Fintech AI |
| `/ai`        | Fintech AI, Agent workflow, Partner platform, Disruption Assistance, RemoteUI and WebViews |

Experience (Bleacher Report featured, Bottle Rocket, BookShout, RealPage, the enterprise IT years and the timeline) and "On the side" (VINDecoded, then Sudoku World) read the same everywhere.

## The switching flow

| ID                | Flow                                                                                                      | Scenarios  |
| ----------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| <a id="s1"></a>S1 | On `/v2`, "Any role" is current. Follow "Applied AI": `/ai` loads with its eyebrow and order. Back: `/v2` | S3.1, S3.2 |
