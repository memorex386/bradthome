# Spec 038: states

The mocks are this slice's own build, captured on 2026-11-13 in Chromium at 1× density from a local preview of the production build by [capture.mjs](capture.mjs), with reduced motion except where a state needs motion (M5, M7). The card shots hide the sticky header and the floating "Ask about Brad", which would cover them; the no-script shots keep them. Once the slice lands, `tests/snapshots/038/` holds each state's baseline from the pinned container, and the pages on `next` are the record.

The approved direction is the private receipts study's "2 · Proof on the card", with "A sparkle on each claim" that opens the chat, which Brad picked on 2026-11-13. Brad reviewed these at Gate 1.

## States

| ID | State | Phone, 390 × 844 | Desktop, 1280 × 800 |
| -- | ----- | ---------------- | ------------------- |
| M1 | The Hopper band: the role lines, five topics, sparkles, and the Capital One card's two sources before its tags | [light](M1-hopper-phone-light.png), [dark](M1-hopper-phone-dark.png) | [light](M1-hopper-desktop-light.png), [dark](M1-hopper-desktop-dark.png) |
| M2 | Bleacher Report: 10M+ linked to Google Play, with its host under the label | [light](M2-bleacher-report-phone-light.png), [dark](M2-bleacher-report-phone-dark.png) | [light](M2-bleacher-report-desktop-light.png), [dark](M2-bleacher-report-desktop-dark.png) |
| M3 | VINDecoded: 1M+ and 400K+ linked to the stores, the card's links kept, no list | [light](M3-vindecoded-phone-light.png), [dark](M3-vindecoded-phone-dark.png) | [light](M3-vindecoded-desktop-light.png), [dark](M3-vindecoded-desktop-dark.png) |
| M4 | bradthome.com: four sources under the claims, two on this site with no outside mark | [light](M4-bradthome-com-phone-light.png), [dark](M4-bradthome-com-phone-dark.png) | [light](M4-bradthome-com-desktop-light.png), [dark](M4-bradthome-com-desktop-dark.png) |
| M5 | A sparkle's hover and keyboard focus, with its tooltip, on a card and in the band, with motion allowed | | hover [light](M5-hover-desktop-light.png), [dark](M5-hover-desktop-dark.png); focus [light](M5-focus-desktop-light.png), [dark](M5-focus-desktop-dark.png); in the band: hover [light](M5-hover-band-desktop-light.png), [dark](M5-hover-band-desktop-dark.png), focus [light](M5-focus-band-desktop-light.png), [dark](M5-focus-band-desktop-dark.png) |
| M6 | Ask about Brad opened from a sparkle, the claim's words in its box, unsent | [light](M6-chat-from-sparkle-phone-light.png) | [light](M6-chat-from-sparkle-desktop-light.png) |
| M7 | A chat source link, `/#receipt-hopper-fintech-ai-1`, landing on its claim, tinted | [reduced motion](M7-landing-phone-reduced.png), [motion, mid-fade](M7-landing-phone-motion.png) | [reduced motion](M7-landing-desktop-reduced.png), [motion, mid-fade](M7-landing-desktop-motion.png) |
| M8 | A role page, `/fullstack`: its first Hopper topic, Capital One, with its sources | [light](M8-fullstack-hopper-phone-light.png), [dark](M8-fullstack-hopper-phone-dark.png) | [light](M8-fullstack-hopper-desktop-light.png), [dark](M8-fullstack-hopper-desktop-dark.png) |
| M9 | No script: the claims and sparkles in place, and a sparkle reaching the contact section | [card](M9-noscript-phone-light.png), [after a tap](M9-noscript-contact-phone-light.png) | [card](M9-noscript-desktop-light.png), [after a click](M9-noscript-contact-desktop-light.png) |
| M10 | The gallery's "Proof on the card", and the same parts in the band | | [light](M10-gallery-proof-light.png), [dark](M10-gallery-proof-dark.png); band [light](M10-gallery-proof-band-light.png), [dark](M10-gallery-proof-band-dark.png) |

## Measured on this build

See the plan's [Measured on this build](../plan.md#measured-on-this-build): no markers or drawers on any of the four pages, 30 sparkles and 30 anchors on each, the phone home 108 px shorter, every sparkle target 44 × 44 with none overlapping, the module 29 bytes smaller, and the corpus unchanged.
