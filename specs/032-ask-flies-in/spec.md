# Spec 032: "Ask about Brad" flies into the hero and back

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                |
| Status          | Approved                                                                                                            |
| Slice           | 5.8 "Ask about Brad" flies into the hero and back                                                                   |
| Branch          | `032-ask-flies-in`                                                                                                  |
| Gate 1          | Approved by Brad on 2026-11-11, on the session's cards, every option as recommended                                                                                    |
| Mocks and flows | [mocks/README.md](mocks/README.md): the states, the motion and the spike's measurements                             |
| Plan            | [plan.md](plan.md), approved with this spec at Gate 1                                                               |
| Decisions       | D215, from this slice. It amends spec 031 and D214, and builds on D122, D126 and D189.                              |

## Summary

Since v2.5 (spec 031), a phone shows "Ask about Brad" in the corner whenever the hero's own button is off screen, and swaps the two at once as the hero's comes into view. On 2026-11-11 Brad asked for it to feel like one button: the corner's pill flies into the hero's place as that place comes into view, and flies back out to the corner as it leaves. On the cards that followed, Brad chose phones only, the hero's button as the same pill as the corner's (its own width, 56 px tall, left-aligned), and the flight starting once the place is about 100 px into the screen.

## Scope

**In:** `components/chat/corner.client.ts` (the flight), `styles/chat.css` (the hero's phone pill, the flight's states), amended tests and baselines in specs 031 and any phone shot of the hero, new tests in `tests/032/`, `docs/plan.md`'s slice 5.8, and D215.

**Out:** the desktop, the chat's window and sheet, its API and its words, and a release.

## User stories and acceptance scenarios

### Story 1: One button that moves (P1)

**Independent test:** on `/` at 375 × 812 with motion allowed, scroll the hero's place into view and out, and read the corner's place on each frame.

- **S1.1** Given a phone, then the hero's button is the same pill as the corner's: its own width, 56 px tall, left-aligned in the hero, with the raised shadow.
- **S1.2** Given the corner's pill showing, when the hero's place comes fully into view, at least 100 px below the 72 px sticky header and 100 px above the screen's bottom, then the pill flies to that place over about 320 ms and hands over to the hero's button there, with no frame where both or neither show.
- **S1.3** Given the hero's button in its place, when the place starts to leave that band, then the pill flies from the place back to the corner over about 320 ms.
- **S1.4** Given the visitor scrolls during a flight, then it ends exactly on the place or the corner: each frame aims at where the place is.
- **S1.5** Given the visitor reverses mid-flight, then the pill turns around from where it is.
- **S1.6** Given a flight, then nothing in the page moves: layout shift stays 0.

### Story 2: Everything else holds (P1)

- **S2.1** Given reduced motion, then the two swap at once, with no flight.
- **S2.2** Given a page loaded at its top, then the corner first shows at 1.8 s with MA-20, as in spec 031; a page loaded away from its top shows it at once.
- **S2.3** Given the corner's pill, then it still shrinks to its 56 px circle while the visitor scrolls down, opens on a 0.6 s stop or a scroll up, and hides at the contact section. In flight it opens to the full pill.
- **S2.4** Given a desktop, or no script, then nothing changes.
- **S2.5** Given axe at WCAG 2.2 AA in each state, both themes, then no violation, and only one "Ask about Brad" button is ever in the accessibility tree.
- **S2.6** Given the build, then the CSP doesn't change, and the one module grows by no more than 768 bytes (Brad's Gate 1 card).

## Functional requirements

- **FR-001** On a phone the corner's pill MUST fly between the corner and the hero's place as S1.2–S1.5 set, as a transform only.
- **FR-002** The hero's phone button MUST be the same pill as the corner's.
- **FR-003** With reduced motion there MUST be no flight.
- **FR-004** Layout shift MUST stay 0, and the desktop, the chat, the CSP and `apps/chat-api/` MUST NOT change; the module MUST grow by no more than 768 bytes.
- **FR-005** Spec 031's tests and baselines MUST be amended where this slice changes them, `tests/032/` MUST cover every ID here, `docs/plan.md` MUST show slice 5.8, and the log MUST hold D215.

## Success criteria

- **SC-001** Every flight ends within 1 px of its target, scrolling or not.
- **SC-002** axe finds 0 violations, layout shift is 0, and the CSP is unchanged.
- **SC-003** The one module grows by no more than 768 bytes.

## Decisions to record

- **D215** On a phone, the corner's pill flies into the hero's place and back, and the hero's button becomes the same pill (Brad, 2026-11-11). It amends D214: the corner no longer swaps with the hero's button at once, and MA-20 plays only on the first appearance; a return from the page's end reverses the exit (fades in and rises 16 px).

On Brad's Gate 1 cards (2026-11-11): the one module may grow by at most 768 bytes (637 measured).

Tier 3, decided in this spec: the flight is drawn each frame by the script with `requestAnimationFrame`, as a `translate` aimed at the place's current position, eased with smoothstep over 320 ms of travel; a reversal turns around from the current point; the corner's shrink and its circle pause in flight; the first frame of a flight out is drawn at once, so no frame shows the corner before it leaves.
