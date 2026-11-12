# Spec 036: states

The mocks are this slice's own build, captured on 2026-11-12 in Chromium at 1× density from a local preview of the production build, with reduced motion except where a state needs motion (M5). The years are the build's: 11+ and 10+. The hero shots hide the sticky header and, on a desktop, the floating "Ask about Brad", which would cover them. Once the slice lands, `tests/snapshots/036/` holds each state's baseline with the clock fixed, and the pages on `next` are the record.

The approved mock is the private hero study's "Mix" direction (2026-11-12). Brad reviewed these at Gate 1.

## States

| ID | State | Phone, 390 × 844 | Desktop, 1280 × 800 |
| -- | ----- | ---------------- | ------------------- |
| M1 | The home, none picked: the first screen | [light](M1-home-phone-light.png), [dark](M1-home-phone-dark.png) | [light](M1-home-desktop-light.png), [dark](M1-home-desktop-dark.png) |
| M1 | The home's whole hero: tiles, buttons, chips | [light](M1-hero-phone-light.png) | [light](M1-hero-desktop-light.png) |
| M2 | `/mobile`: Mobile picked, with its detail | [light](M2-mobile-phone-light.png), [dark](M2-mobile-phone-dark.png) | [light](M2-mobile-desktop-light.png), [dark](M2-mobile-desktop-dark.png) |
| M3 | `/fullstack`: Full-stack picked, with its detail | [light](M3-fullstack-phone-light.png), [dark](M3-fullstack-phone-dark.png) | [light](M3-fullstack-desktop-light.png), [dark](M3-fullstack-desktop-dark.png) |
| M4 | `/ai`: Applied AI picked, with its detail and no timeline | [light](M4-ai-phone-light.png), [dark](M4-ai-phone-dark.png) | [light](M4-ai-desktop-light.png), [dark](M4-ai-desktop-dark.png) |
| M5 | Hover on Mobile, and keyboard focus on Full-stack, with motion allowed | | hover [light](M5-hover-desktop-light.png), [dark](M5-hover-desktop-dark.png); focus [light](M5-focus-desktop-light.png), [dark](M5-focus-desktop-dark.png) |
| M6 | No script: the copy button hidden, the address button rounded off | [home, light](M6-noscript-home-phone-light.png) | [`/fullstack`, light](M6-noscript-fullstack-desktop-light.png) |
| M7 | The phone header: GitHub, LinkedIn and the résumé beside the menu | 390 [light](M7-header-390-light.png), [dark](M7-header-390-dark.png); 320 [light](M7-header-320-light.png), [dark](M7-header-320-dark.png); [over the band](M7-header-band-390-light.png); [menu open](M7-header-menu-390-light.png) | |
| M8 | The years at a later date, from the visitor's clock | | [Apr 30, 2027](M8-years-apr-2027.png), [May 1, 2027](M8-years-may-2027.png), [Sep 1, 2027](M8-years-sep-2027.png), [Nov 12, 2030](M8-years-nov-2030.png), [a clock behind the build](M8-years-behind-2026-01.png) |
| M9 | "Ask about this" on `/mobile`: the question in the box, unsent | | [light](M9-ask-mobile-desktop-light.png) |

## Measured on this build

At rest, on `/`:

| Screen | Tiles end | Buttons end | Chips end | Hopper band starts | On main |
| ------ | --------- | ----------- | --------- | ------------------ | ------- |
| 1280 × 800 | 792 | 926 | 995 | 1,033 | band 834, tiles 732, switch 796 |
| 1440 × 900 | 835 | 969 | 1,038 | 1,081 | band 881 |
| 390 × 844 | 767 | 901 | 970 | 1,717 | tiles 814, switch 890 |
| 375 × 812 | 802 | 998 | 1,067 | 1,814 | tiles 814, switch 890 |

Nothing scrolls sideways at 320, 375, 390, 1280 or 1440 on any of the four pages. At 320 the header's four 44 px links sit at 124, 168, 212 and 256 px, touching. The one module is 13,039 bytes, against main's 12,682: the years add 331, and the corner's cleaner landing 26.
