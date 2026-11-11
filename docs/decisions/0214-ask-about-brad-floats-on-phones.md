---
status: accepted
date: 2026-11-11
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D214
---

# "Ask about Brad" floats in a phone's corner and shrinks while the visitor reads

## Context and problem statement

On a desktop, "Ask about Brad" floats in the corner on every screen. On a phone it sits in the hero (D189), and on a 375 × 812 phone it starts at about 909 px, below the first screen. It scrolls away with the hero, so past it most of the 9,870 px home page has no way to open the chat except the "Ask me" links inside the drawers. How should a phone keep the chat in reach?

## Decision drivers

- The chat is one tap away anywhere on the page, with never two ask buttons in view.
- It covers as little as possible while the visitor reads, and never the contact section.
- Its name stays "Ask about Brad" (WCAG 2.5.3), its target is large, and it never entirely hides what has focus (WCAG 2.4.11).
- Motion only when the visitor hasn't asked for less (D122); layout shift stays 0 (D126); the one module stays small (D147).

## Considered options

Five mocks, which Brad reviewed on 2026-11-11, in the builder's ranked order:

1. A corner button, the desktop's pill, that shrinks to its sparkle while the visitor scrolls down (recommended)
2. A bar fixed to the bottom of the screen
3. A centered pill that hides while the visitor scrolls down
4. A compact pill in the sticky header
5. Option 1, labeled with the section being read

## Decision outcome

Chosen option 1, which Brad chose on 2026-11-11 and approved at spec 031's Gate 1 the same day. It amends spec 022's button on a phone, and narrows D209's "no scroll handler" to the frame.

- On a phone, whenever the hero's button is off screen (above the 72 px header, or below the screen, as on load), a corner button shows in the bottom-right, 56 px tall, above the home bar, and the hero's is hidden. Only one is ever shown, or in the accessibility tree. Neither moves: on a card during the build, Brad chose two buttons over one that moved between the hero and the corner, since its return to the hero shifted the layout by about 0.1 each time (D126).
- While the visitor scrolls down it shrinks to a 56 px circle around its sparkle, a clip slid into the corner, so no box changes; 0.6 s after they stop, or as they scroll up, it opens back up. Its name stays "Ask about Brad".
- It hides at the end of the page, once the contact section is in view, and can't be tapped or focused there.
- Each appearance plays MA-20; on Brad's card the first, on load, waits for the hero to settle at 1.8 s, as the desktop's does, except on a page that loads away from the top. With reduced motion it never shrinks or moves; it appears and disappears as the full pill.
- While it shows, the page's bottom scroll padding keeps a focused element that scrolls into view clear of it.
- A tap opens today's full-screen sheet. The desktop, and the page with no script, don't change.
- Knowing which way the visitor scrolls needs a scroll listener: `corner.client.ts` adds one, passive, which only toggles an attribute, beside two IntersectionObservers. Spec 027 chose no scroll handler for the frame because observers could do all of its work; direction can't come from an observer. On Brad's Gate 1 card the one module may grow by at most 768 bytes for it; it measured 745 with both buttons.

### Consequences

- Good, because a phone visitor can open the chat from anywhere on the page, and the ask button looks the same on a phone as on a desktop.
- Good, because while the visitor reads it covers only a 56 px circle.
- Bad, because a scroll listener now runs on the home and role pages on every scroll, though it's passive and cheap.
- Bad, because the circle alone is less obvious; its full label shows on load and whenever the visitor stops.
- Bad, because the page has two ask buttons in its markup, though only one is ever shown or heard.

### Confirmation

Spec 031's tests read the buttons' place, size, name and visibility at set depths on a phone, with motion allowed and reduced and with no script, tab through the page against it, check the desktop is unchanged, snapshot each state, and measure the module.

## More information

- Decided by: Brad Thome, on the mocks (2026-11-11) and at spec 031's Gate 1 and on a card during its build (2026-11-11).
- Builds on [D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), [D126](0126-the-heros-text-is-readable-from-the-first-frame.md), [D147](0147-link-previews-ship-one-small-script.md), [D189](0189-ask-about-brad-floats-in-the-corner-and-fills-a-phone.md), [D209](0209-a-sticky-header-that-marks-the-section.md) and [D213](0213-ask-me-opens-the-chat.md).
