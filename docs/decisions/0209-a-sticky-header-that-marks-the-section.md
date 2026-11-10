---
status: accepted
date: 2026-11-10
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D209
---

# A sticky header that condenses, takes the band's colors and marks the section

## Context and problem statement

The home and role pages are long: about 6,700 px on a desktop and 9,600 on a phone. Their header scrolls away with the hero, so a reader halfway down has no way back to the sections and no sign of where they are. The landing study's direction A, which Brad chose on 2026-11-09, gives the page a frame that stays with the reader (T4, T5; MA-6–MA-8, MA-16, MA-18, MA-21). How should the frame work?

## Decision drivers

- The reader always knows where they are and can jump anywhere.
- Nothing moves under the reader: layout shift stays 0 (D126).
- Motion only when the visitor hasn't asked for less, and CSS before script, with no scroll handler (D122, the brief's motion rules).
- The one module stays small (D147).

## Considered options

The options are listed in the builder's ranked order.

1. A sticky header drawn and moved by CSS, with IntersectionObservers telling it where the reader is (recommended)
2. A sticky header driven by a scroll handler, as the study's mock does
3. The header as it is, scrolling away

## Decision outcome

Chosen option 1, which Brad approved at spec 027's Gate 1 (2026-11-10). It amends spec 009's FR-003 for the home and role pages.

- The header stays at the top. Once the page scrolls past 8 px, its bar fades in on the page's color at 86%, with a blur and a hairline, shortens from 72 to 60 px, and Brad's name scales to 0.94. Where the browser has scroll-driven animations, the scroll drives this over its first 64 px; elsewhere it changes over 240 ms; under reduced motion it switches at once, with no scaling.
- The header's box keeps its 72 px. Only its bar, a pseudo-element, shrinks by scale, so nothing under it moves.
- Over the Hopper band it takes the band's colors. A 2 px rule slides under the link of the section being read, the last one whose top has passed 40% of the screen, and that link carries `aria-current="location"`, in the bar and in the phone menu.
- In-page jumps scroll smoothly, land below the header, and underline their heading for 1,100 ms. Link previews open from their link over 200 ms and close over 120 ms. The phone menu drops 6 px as it opens. All of it is CSS, and none of it runs under reduced motion.
- On a phone, the quiet role switch stays on one line and scrolls sideways if it must, with 44 px targets.
- `header.client.ts` joins the one module: three IntersectionObservers and no scroll handler. On Brad's Gate 1 card the module may grow by at most 1,280 bytes for it; it measured 1,068.
- Spec 016's link previews keep their passive scroll listener, one per preview link. On a card during the tests stage, Brad scoped "no scroll handler" to the frame.
- With no script, the header still stays at the top, on its bar, with no section marked.
- The gallery, evals and privacy pages keep their headers.

### Consequences

- Good, because the sections are always one tap away, and the reader can see where they are.
- Good, because layout shift stays 0 and the CSP doesn't change.
- Bad, because the one module grows by about 1 KB.
- Bad, because Firefox and Safari don't scrub the header with the scroll yet; they switch it over 240 ms.

### Confirmation

Spec 027's tests read the header's place, size, opacity and marks at set scroll depths, with motion allowed and reduced and with no script, check that the frame adds no scroll listener, and measure the module.

## More information

- Decided by: Brad Thome, on the landing study's cards (2026-11-09) and at spec 027's Gate 1 (2026-11-10).
- Builds on [D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), [D126](0126-the-heros-text-is-readable-from-the-first-frame.md), [D147](0147-link-previews-ship-one-small-script.md), [D206](0206-the-role-switch-moves-into-the-hero-without-the-address.md) and [D208](0208-one-receipts-drawer-per-card.md).
