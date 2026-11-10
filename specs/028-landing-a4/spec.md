# Spec 028: Sections reveal their evidence once (landing A4)

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                    |
| Status          | Approved                                                                                                                                                |
| Slice           | 5.4 Sections reveal their evidence once (direction A's slice A4)                                                                                        |
| Branch          | `028-landing-a4`                                                                                                                                        |
| Gate 1          | Approved by Brad on 2026-11-10, on the session's cards, every option as recommended                                                                     |
| Mocks and flows | [mocks/README.md](mocks/README.md): the states this slice touches, the motion it's checked against, and a spike's measurements                          |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                               |
| Decisions       | D211, from this slice. It builds on D122, D126, D147, D154, D204 and D209, and amends spec 017's copy timing and spec 009's stat and address underline. |

## Summary

Below the hero, the home page sits still: a reader scrolling past Hopper, Experience and the side projects gets no sign of where the evidence is. On 2026-11-09 Brad chose the landing study's direction A, whose sections settle into place the first time each comes into view. Each section's eyebrow and heading rise, the heading from muted to ink (MA-9). Its cards rise 90 ms apart (MA-10), and their receipt markers pop just after (MA-11). The timeline's bars draw from the left, oldest first (MA-13). The figures (10M+, Promoted, 1M+, 400K+) gain a permanent accent rule (T7), which draws once, as the address's rule does (MA-14). Copying the address swaps its icon for a check and slides the label (MA-17), and a soft light follows the pointer over a card (MA-19).

Nothing is ever hidden. Each reveal plays once per load, only when motion is allowed. At rest, with no script, under reduced motion, before a section comes near, or in a full-page capture taken without scrolling, every element is in its final state. The look and motion are CSS; a short script in the one module says when, from one IntersectionObserver and no scroll handler. It adds 990 bytes to the module.

## Scope

**In:**

- `components/home/reveal.client.ts`, in the one module, imported beside the others in `PreviewLink.astro`.
- `data-reveal` on the home's section heads, cards, timeline and address: `Hopper.astro`, `Experience.astro`, `Side.astro`, `Contact.astro`.
- `components/ds/Email.astro`: a `reveal` prop, the address's rule drawn as a pseudo-element in place of its text underline, and a check icon beside the copy icon. `Icon.astro` gains `check`. `contact.ts`: "Copied" holds for 2.6 s.
- The reveals', the figures' rule, the copy button's and the cards' light CSS in `styles/ds/components.css`.
- Amended tests and baselines in specs 009, 010, 011, 012, 013, 014, 016, 017, 018, 025, 026 and 027, and new tests in `tests/028/`.
- `docs/plan.md`'s slice 5.4, and record D211.

**Out:**

- The hero (A1's MA-1–MA-5), the frame (A3), the role switch's morph (MA-15, A5) and "Ask me" (A6).
- Reveals on the gallery, `/design-system`, and on the evals and privacy pages. The gallery shows the figures' rule and the copy button's check at rest.
- The lift and press on cards that aren't links (Brad's Gate 1 card).
- Any new claim, figure or framing, any CSP change, and a release.

## User stories and acceptance scenarios

The IDs in brackets are the study's states and the brief's items, listed in [mocks/README.md](mocks/README.md).

### Story 1: Each section settles in as it arrives (P1)

A recruiter scrolling the home on a laptop sees each section's heading and cards settle into place, which draws the eye to the evidence without hiding any of it.

**Independent test:** load `/` with motion allowed, scroll each section into view, and read the running animations and the blocks' states.

- **S1.1** Given motion allowed, when a section's head is first 18% in view, then its eyebrow rises 10 px over 480 ms and its heading rises 14 px over 600 ms, 70 ms later, from muted to ink, with the soft ease-out; over the Hopper band, from the band's muted (MA-9, S16).
- **S1.2** Given motion allowed, when cards are first 18% in view, then each rises 18 px over 560 ms; cards arriving together start 90 ms apart, in reading order (MA-10). The cards are Hopper's topics, Experience's timeline and cards, and the side projects.
- **S1.3** Given a card playing, then each receipt marker in its claims scales from 0.8 through 1.08 to 1 over 320 ms, starting 220 ms after its card, 45 ms apart (MA-11). The role lines' markers in Hopper's head pop with the head.
- **S1.4** Given motion allowed, when the timeline is first 18% in view, then its bars draw from the left over 640 ms, oldest first, 70 ms apart, so Hopper's bar is last (MA-13).
- **S1.5** Given a block whose top edge has entered the screen but which isn't 18% in view yet, then it's posed: moved down by its distance (heading muted), never hidden or transparent; if it leaves again, it returns to rest.

### Story 2: The figures carry their rule (P1)

- **S2.1** Given `/`, a role page or the gallery, at rest, then each figure in a stat (10M+, Promoted, 1M+, 400K+) has a 3 px accent rule under it, as wide as the figure; its qualifier is unchanged (T7).
- **S2.2** Given motion allowed, when a card with figures plays, then each figure's rule draws from the left over 680 ms, 100 ms after its card, 90 ms apart (MA-14).
- **S2.3** Given the contact section, then the address keeps a 2 px rule under it, in its color, as its underline was; given motion allowed, when the section is first 18% in view, the rule draws from the left over 760 ms (MA-14).

### Story 3: Copying the address answers with a check (P2)

- **S3.1** Given motion allowed, when the visitor taps "Copy address" and the copy succeeds, then the copy icon gives way to a check over 220 ms, the check draws in 300 ms, and "Copied" slides in; after 2.6 s it rests again (MA-17, S09).
- **S3.2** Given the clipboard refused, then the address is selected and "Address selected" slides in, as spec 017 sets, with the copy icon kept (S10).
- **S3.3** Given reduced motion, then the icon and label swap at once, with the check whole.
- **S3.4** Given the gallery's held "copied" state, then it shows the check whole, at rest.

### Story 4: A light follows the pointer over a card (P3)

- **S4.1** Given a pointer device and motion allowed, when the pointer moves over a card on the home or a role page, then a soft accent light with a 24 rem radius, fading to nothing about 17 rem out, sits under the pointer, fading in over 300 ms, behind the card's text (MA-19).
- **S4.2** Given reduced motion, a touch screen or no script, then there's no light, and the cards don't move.

### Story 5: Nothing is hidden, and nothing plays twice (P1)

- **S5.1** Given motion allowed, when the page loads, then every block already on screen stays as it is, and nothing below has moved: a full-page capture taken without scrolling shows every element in its final state.
- **S5.2** Given a block that has played, when the visitor scrolls away and back, resizes the window, or opens and closes a drawer, then nothing replays.
- **S5.3** Given a deep link such as `/#experience`, then the target section plays once as it lands, like a scroll; the hero still finishes at once (spec 025's T8).
- **S5.4** Given reduced motion, then no block is ever posed or played, and every element is in its final state at every scroll depth (S05).
- **S5.5** Given no script, then the page is complete, every link works, and nothing is posed (S12).
- **S5.6** Given every reveal, then only `translate`, `scale` and color change, and nothing starts transparent or blurred.

### Story 6: It still works for everyone (P1)

- **S6.1** Given `/`, a role page and `/design-system`, in both themes at desktop and phone sizes, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S6.2** Given reduced motion, then the cards with figures, the contact section and the gallery's stats and copied state, at 1280 × 800 and 390 × 844 in light and dark, match their committed snapshots in the pinned container (S01, S02, S03, S05).
- **S6.3** Given the page loading and scrolling with motion allowed, with its fonts arriving, then layout shift stays 0 (S13), and Lighthouse's CI thresholds hold.
- **S6.4** Given the page, then the reveal adds one IntersectionObserver and one passive `pointermove` listener, and no `scroll`, `scrollend` or `wheel` listener.
- **S6.5** Given the build, then the one module grows by at most 1,024 bytes (Brad's Gate 1 card), and the CSP and the inline scripts and styles don't change.

## Edge cases

- A long jump (a header link) can carry the reader past blocks; those never come into view, so they stay at rest, and play if the reader scrolls back to them.
- A block taller than 5.5 screens could never be 18% in view; no block on these pages is.
- A browser without IntersectionObserver: the script does nothing, and the page is at rest.
- A reload that restores the scroll after the first look: blocks then in view play once, as on a scroll.
- The visitor turns on reduced motion mid-visit: every pose and animation is inside the no-preference query, so they stop at once.
- Element screenshots: the existing ones run at reduced motion, where nothing is posed; Playwright's `animations: 'disabled'` would finish any reveal.

## Functional requirements

- **FR-001** Section heads, cards, markers, the timeline's bars, the figures' rules and the address's rule MUST play MA-9, MA-10, MA-11, MA-13 and MA-14 as the brief's table sets, once per load, the first time each block is 18% in view.
- **FR-002** Every figure in a stat MUST carry a permanent 3 px accent rule (T7); the address MUST keep its rule.
- **FR-003** Copying the address MUST swap its icon for a drawn check and slide its label as MA-17 sets, and rest after 2.6 s.
- **FR-004** On pointer devices, with motion allowed, a soft light MUST follow the pointer over the home's cards (MA-19).
- **FR-005** Nothing MAY be hidden or transparent at any point, and every element MUST be in its final state at rest, before its block comes near, with no script, under reduced motion and in a full-page capture taken without scrolling.
- **FR-006** The timing MUST come from IntersectionObserver in the one module, with no scroll handler; every motion MUST sit inside `prefers-reduced-motion: no-preference`, and only `translate`, `scale` and color may move.
- **FR-007** Layout shift MUST stay 0, and the one module MUST grow by no more than 1,024 bytes, with no CSP change.
- **FR-008** Specs 009–014, 016–018 and 025–027's tests and baselines MUST be amended to match, and `tests/028/` MUST cover every ID here.
- **FR-009** `docs/plan.md` MUST show slice 5.4's state, and the decision log MUST hold D211.

## Success criteria

- **SC-001** The running animations match MA-9, MA-10, MA-11, MA-13 and MA-14's delays and durations within 10 ms, and MA-17's.
- **SC-002** A full-page capture of `/` at 1280 × 800 and 390 × 844, taken without scrolling and with motion allowed, shows no posed or playing block.
- **SC-003** After every block has played, scrolling back to the top and down again starts no animation.
- **SC-004** axe finds 0 violations, layout shift is 0, and the reveal adds no scroll listener.
- **SC-005** The one module grows by at most 1,024 bytes, and the CSP is unchanged.

## Mocks and flows

The approved mock is the private landing study's "A · Refined" view, which Brad reviewed on 2026-11-09. Nothing from it is copied here. [mocks/README.md](mocks/README.md) lists the states this slice touches, the motion table it's checked against, and the spike's measurements. Captures of the spike go to Brad with the Gate 1 cards.

## Decisions to record

- **D211** How sections reveal: once per load, the first time each block is 18% in view, from a pose that never hides, only with motion allowed; the figures' permanent rule; the drawn check on copy; and the light on cards (T7; MA-9–MA-11, MA-13, MA-14, MA-17, MA-19 on cards). It amends spec 017's "Copied" time from 2 to 2.6 s, and spec 009's stat (the rule) and address (a drawn rule in place of its underline).

On Brad's Gate 1 cards (2026-11-10): the one module may grow by at most 1,024 bytes for the reveal (990 measured); "Copied" holds for 2.6 s, as MA-17 sets, in place of spec 017's 2 s; and the cards, which aren't links, take the light only, with no lift or press.

Tier 3, decided in this spec: blocks on screen at the first look stay at rest, so nothing moves under the first frame; a block is posed as its edge enters, not half a screen early as the study does, so a full-page capture shows everything at rest; a deep link's section plays as it lands; the reveal uses the site's soft ease-out for every move, as the study's running reveals do; the role lines' markers pop with Hopper's head; the timeline rises as one card; the figures' rule shows in the gallery too, while the reveals run only on the home and role pages; the address's rule stays in its color, not the accent; under reduced motion the cards' light doesn't show, since it moves with the pointer.
