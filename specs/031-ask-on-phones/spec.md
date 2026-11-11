# Spec 031: "Ask about Brad" in reach on a phone

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                  |
| Status          | Approved                                                                                                                              |
| Slice           | 5.7 "Ask about Brad" in reach on a phone                                                                                              |
| Branch          | `031-ask-on-phones`                                                                                                                   |
| Gate 1          | Approved by Brad on 2026-11-11, on the session's cards, every option as recommended                                                  |
| Mocks and flows | [mocks/README.md](mocks/README.md): the states, the motion and the spike's measurements                                               |
| Plan            | [plan.md](plan.md), approved with this spec at Gate 1                                                                                 |
| Decisions       | D214, from this slice. It builds on D122, D126, D188, D189, D204, D209 and D213, and amends spec 022's button and spec 027's frame.    |

## Summary

On a desktop, "Ask about Brad" floats in the bottom-right corner on every screen. On a phone it sits in the hero, and on a 375 × 812 phone it starts at about 909 px, below the first screen. It scrolls away with the hero, so most of the 9,870 px home page has no way to open the chat except the "Ask me" links inside the receipt drawers.

On 2026-11-11 Brad chose option 1 of five mocks: the corner pill. On a phone, whenever the hero's own button is off screen, a corner button shows in the bottom-right, 56 px tall, and the hero's is hidden, so only one is ever shown or heard. While the visitor scrolls down it shrinks to a 56 px circle around its sparkle; when they stop for about 0.6 s, or scroll up, it opens back up to "Ask about Brad". It hides at the end of the page, by the contact section. A tap opens today's full-screen sheet (D189). The desktop doesn't change.

Knowing which way the visitor scrolls takes a small passive scroll listener in the one module. Spec 027 chose no scroll handler for the frame (D209); D214 records why the corner needs one.

## Scope

**In:**

- `components/chat/Ask.astro`: a second button for the corner, which never moves, with its words in a span.
- `components/chat/ask.client.ts`: its one delegated click listener opens the chat from either button, as from "Ask me".
- `components/chat/corner.client.ts`, in the one module through `PreviewLink.astro`: two IntersectionObservers and a passive scroll listener that set attributes on the corner's button.
- `styles/chat.css`: the corner on a phone, its shrinking, its entrance and its exit, and the page's scroll padding.
- Amended tests and baselines where they read the button's markup, the one module's size or a phone screenshot with the corner in it, and new tests in `tests/031/`.
- `docs/plan.md`'s slice 5.7, and record D214.

**Out:**

- The desktop's button, the chat's window and sheet, its API and its words.
- Option 5's per-section question on the button, and moving the hero's button above the fold.
- A release.

## User stories and acceptance scenarios

### Story 1: The chat is one tap away anywhere on the page (P1)

A recruiter on a phone reads down to Bleacher Report and wants to ask a question there.

**Independent test:** on `/` at 375 × 812 with script, scroll to any depth and read the button's place, size and name.

- **S1.1** Given a phone (up to 40 rem wide) on load, where the hero's button sits below the first screen, then the corner's button shows in the bottom-right corner, its full "Ask about Brad" pill, 56 px tall, above the home bar (`env(safe-area-inset-bottom)`).
- **S1.2** Given the hero's button on screen, below the 72 px sticky header, then the corner's is hidden; while the corner's shows, the hero's is hidden. So only one ask button is ever seen, or in the accessibility tree.
- **S1.3** Given the hero's button scrolled above the header, then the corner's shows, at every depth down to the end.
- **S1.4** Given the contact section's top within 150 px of the screen's bottom, or above it, then the corner's button hides: it can't be seen, tapped or focused, and covers neither "Get in touch" nor the email address. Scrolling back up shows it again.
- **S1.5** Given the corner's button, when the visitor taps it, then today's full-screen sheet opens (D189), and closing it returns focus to that button.
- **S1.6** Given a role page, then all of the above holds there too.

### Story 2: It stays out of the way while the visitor reads (P1)

- **S2.1** Given motion allowed, when the visitor scrolls down more than 2 px, then the floating button shrinks to a 56 × 56 px circle around its sparkle, over 300 ms.
- **S2.2** Given the circle, when the visitor stops scrolling for 0.6 s, or scrolls up, then it opens back up to the full pill.
- **S2.3** Given the circle or the pill, then its accessible name is "Ask about Brad" (WCAG 2.5.3), and its target is at least 56 × 56 px.

### Story 3: It arrives and leaves gently, or not at all (P2)

- **S3.1** Given motion allowed and a page loaded at its top, then the corner's first appearance plays MA-20, rising 14 px from 0.9 scale on the spring and fading in over 420 ms, from 1.8 s, once the hero has settled.
- **S3.2** Given motion allowed, when the corner's button shows again later, past the hero or back from the page's end, then it plays MA-20 at once, and when it hides at the end it fades and drops 16 px over about 320 ms.
- **S3.3** Given reduced motion, then it never shrinks, rises or slides: it appears and disappears as the full pill.
- **S3.4** Given a page that loads away from its top, where the hero settles at once (D204), then no entrance waits for 1.8 s: any plays at once.

### Story 4: It never hides what has focus (P1)

- **S4.1** Given the floating button, when a keyboard user tabs through the page, then no focused element is ever entirely hidden by it (WCAG 2.4.11), and one the page scrolls into view from below lands clear of it.

### Story 5: Nothing else changes (P1)

- **S5.1** Given a desktop (wider than 40 rem), then the button floats, looks and enters as it does today.
- **S5.2** Given no script, then the button isn't shown, as today, and the hero keeps its layout.
- **S5.3** Given a phone, when the corner's button shows, shrinks, opens and hides, then nothing in the page moves: layout shift stays 0.
- **S5.4** Given `/` and a role page on a phone, in both themes, with the button in the hero, floating, shrunk and hidden, and with the sheet open, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S5.5** Given the build, then the CSP doesn't change, and the one module grows by no more than 768 bytes (Brad's Gate 1 card).

## Edge cases

- A tall phone where the hero's button is on the first screen: the corner's stays hidden until it scrolls above the header.
- A fast fling past the hero: the corner's shows already shrunk, and opens 0.6 s after the scroll stops.
- The phone menu open: the menu sits above the button (z-index 10 over 4).
- The visitor rotates the phone past 40 rem: the corner's button isn't shown, and the hero's floats as on a desktop.
- A page with no contact section: the corner script does nothing, and the corner's button stays hidden.

## Functional requirements

- **FR-001** On a phone, the corner's button MUST show whenever the hero's is off screen, and only then, and only one of the two MUST be shown at a time (Brad's card of 2026-11-11).
- **FR-002** It MUST hide at the end of the page, as S1.4 sets, and be unreachable while hidden.
- **FR-003** With motion allowed it MUST shrink while the visitor scrolls down and open back up on a 0.6 s stop or a scroll up; with reduced motion it MUST NOT shrink or move.
- **FR-004** Its accessible name MUST stay "Ask about Brad", and its target MUST be at least 56 px.
- **FR-005** A focused element MUST NOT be entirely hidden under it, and layout shift MUST stay 0.
- **FR-006** The desktop, the chat's window and sheet, the CSP and `apps/chat-api/` MUST NOT change; the one module MUST grow by no more than 768 bytes, and its scroll listener MUST be passive.
- **FR-007** Tests and baselines MUST be amended where they read what this slice changes, and `tests/031/` MUST cover every ID here; `docs/plan.md` MUST show slice 5.7's state, and the log MUST hold D214.

## Success criteria

- **SC-001** At every 400 px of depth on a 375 × 812 home page, exactly one "Ask about Brad" button is visible, until the contact section.
- **SC-002** The circle is 56 × 56 px, the pill 56 px tall, and both are named "Ask about Brad".
- **SC-003** axe finds 0 violations, layout shift is 0, and the CSP is unchanged.
- **SC-004** The one module grows by no more than 768 bytes.

## Mocks and flows

The approved mock is option 1 of the private "Ask button on phones" study, which Brad reviewed on 2026-11-11. Nothing from it is copied here. [mocks/README.md](mocks/README.md) lists the states, the motion and the spike's measurements.

## Decisions to record

- **D214** On a phone, a corner "Ask about Brad" button shows whenever the hero's is off screen, shrinks to its sparkle while the visitor scrolls down, and hides at the page's end. A passive scroll listener in the one module tells it which way the visitor scrolls, which D209 left out of the frame. It amends spec 022 (the button floats on a phone too) and narrows D209's "no scroll handler" to the frame.

On Brad's Gate 1 cards (2026-11-11): the phone's first appearance waits for the hero and rises in at 1.8 s, as the desktop's does, and the one module may grow by at most 768 bytes (673 measured).

On a card during the build (2026-11-11): one button that moved between the hero and the corner shifted the layout by about 0.1 each time it came back, so the corner has its own button, which never moves, and only one of the two is shown at a time; layout shift stays 0.

Tier 3, decided in this spec: the hero counts as off screen above the 72 px header; the end begins when the contact section's top is 150 px into the screen; a 2 px threshold for direction and a 600 ms stop; the corner sits 1.25 rem above the home bar's inset; the page's bottom scroll padding is 5.5 rem plus the inset while the button floats; the corner's button is hidden above 40 rem, so the desktop doesn't change; the circle is a clip around the sparkle slid into the corner by a transform, so shrinking shifts nothing, and it loses the raised shadow while small; the hero's button and the corner's open the chat through the one delegated click listener that "Ask me" uses, so a click with a modifier key on either does nothing, as on "Ask me"; on a page that loads away from the top, the 1.8 s wait is skipped, since a jump to a section scrolls past the hero and the corner shows again. From the review: the script, not a CSS delay, holds the first appearance until 1.8 s, so MA-20 always plays from its start (a delay removed mid-wait had skipped it); with reduced motion the corner also first shows at 1.8 s, with no motion; and the corner's button has no `data-chat-open`, which stays the hero's alone, so the listener finds the corner by its class.
