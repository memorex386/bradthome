# Spec 042: states

The mocks are this slice's own build, captured on 2026-11-17 in Chromium at 1× density from a local preview of the production build by [capture.ts](capture.ts), with reduced motion, at 375 × 812 and 1440 × 900. The section shots hide the sticky header and the floating "Ask about Brad", which would cover them. The chat's answer in M6 is the fake API's, in words written for the mock, so no model was called. The words are the drafts for Gate 1. Once the slice lands, `tests/snapshots/042/` holds each state's baseline from the pinned container, and the pages on `next` are the record.

## States

| ID  | State                                                                                                                                     | Phone, 375 × 812                                                                           | Desktop, 1440 × 900                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1  | The home's section: the left column, the six rows, then Mobile, Full-stack and Applied AI at rest                                         | [light](M1-section-home-phone-light.png), [dark](M1-section-home-phone-dark.png)           | [light](M1-section-home-desktop-light.png), [dark](M1-section-home-desktop-dark.png)                                                                   |
| M2  | `/fullstack`: its track first, lit with "This page", then Mobile and Applied AI, dimmed                                                   | [light](M2-section-fullstack-phone-light.png), [dark](M2-section-fullstack-phone-dark.png) | [light](M2-section-fullstack-desktop-light.png), [dark](M2-section-fullstack-desktop-dark.png)                                                         |
| M3  | `/mobile`'s and `/ai`'s tracks, each lit first                                                                                            |                                                                                            | [mobile](M3-tracks-mobile-desktop-light.png), [applied AI](M3-tracks-ai-desktop-light.png)                                                             |
| M4  | The section in place: from On the side's last card to Get in touch                                                                        | [light](M4-in-place-phone-light.png)                                                       | [light](M4-in-place-desktop-light.png)                                                                                                                 |
| M5  | Interview prep's fixed card, after the result: the gallery's P3 (a posting for an AI role) and P4 (a role named "Staff Android engineer") |                                                                                            | [P3 light](M5-prep-card-p3-light.png), [P3 dark](M5-prep-card-p3-dark.png), [P4 light](M5-prep-card-p4-light.png), [P4 dark](M5-prep-card-p4-dark.png) |
| M6  | "Ask about this": the chat opened with its question unsent, then one answer citing the wants                                              | [question](M6-ask-filled-phone-light.png), [answer](M6-chat-answer-phone-light.png)        | [question](M6-ask-filled-desktop-light.png), [answer](M6-chat-answer-desktop-light.png)                                                                |

## Motion

| Step                | What moves                             | How                            | Starts at                                                          |
| ------------------- | -------------------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| 1–4                 | The eyebrow, heading, lede and buttons | Rise 8 px, 260 ms, ease-out    | 0, 60, 120 and 180 ms                                              |
| 5–10                | The six rows                           | Rise 8 px, 260 ms              | 240 ms on a desktop, then 60 ms apart; 0 on a phone, as they enter |
| 11–13               | The three track cards                  | Rise 8 px, 260 ms, 60 ms apart | As they enter                                                      |
| 14, role pages only | The lit track's accent bar             | Draws down, 320 ms             | 260 ms after its card starts, once it lands                        |

Each block plays once, at 18% in view, as every section's reveal does (D211). With reduced motion or no script, everything is at rest.
