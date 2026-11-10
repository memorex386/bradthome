# Spec 029: Role pages morph (landing A5)

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                            |
| Status          | Approved                                                                                                                        |
| Slice           | 5.5 Role pages morph (direction A's slice A5)                                                                                   |
| Branch          | `029-landing-a5`                                                                                                                |
| Gate 1          | Approved by Brad on 2026-11-10, on the session's cards, every option as recommended                                             |
| Mocks and flows | [mocks/README.md](mocks/README.md): the states this slice touches, the motion it's checked against, and a spike's measurements  |
| Plan            | [plan.md](plan.md), approved with this spec at Gate 1                                                                           |
| Decisions       | D212, from this slice. It builds on D6, D122, D126, D134, D147, D154, D204, D206 and D211, and amends spec 014's switch markup. |

## Summary

The role switch under the hero, "Tailor this page: Mobile · Full-stack · Applied AI", links three pages, `/mobile`, `/fullstack` and `/ai`. Today a tap loads the new page from the top, and its hero plays its 1.6 s opening again. On 2026-11-09 Brad chose the landing study's direction A, where switching a role is one motion (MA-15): the switch's mark slides to the new role, the eyebrow and the "End to end" note crossfade, the lit word and rows relight, and Hopper's topics move to their new order.

The morph is a cross-document View Transition, written in CSS. The switch stays three plain links, so with no script, under reduced motion, or in a browser without the feature, such as Firefox today, a tap is a plain page load, as now. A short script in the one module skips the morph on any other navigation, takes a scrolled page to its top as the switch begins, since a browser holds every scroll back while the transition runs, and lands the new page's hero at rest, so only the morph moves. Nothing changes in the CSP.

## Scope

**In:**

- `styles/home/morph.css`, loaded by `HomePage.astro`: the opt-in, the parts' names and their timing.
- `components/home/morph.client.ts`, in the one module: the old page's top, the new page's hero at rest, and skipping the morph on any other navigation.
- `components/ds/RoleSwitch.astro`: each role's name in its own span and a numbered class, so the mark and the names can be named. It looks the same.
- `components/home/Hopper.astro`: each topic carries its place in the claims' order as a class.
- Amended tests in specs 009, 014, 016, 017, 018, 022, 025 and 027 where they read the switch's markup, the module's size or its listeners, and new tests in `tests/029/`.
- `docs/plan.md`'s slice 5.5, and record D212.

**Out:**

- Any change to the role pages' words, facts, order or addresses (D6, D134).
- A morph to or from any page other than the home and the role pages, and on the header's link home, back and forward, or a reload.
- "Ask me" (A6), a release, and any CSP change.

## User stories and acceptance scenarios

### Story 1: Switching roles is one motion (P1)

A hiring manager on `/mobile` taps "Applied AI" and sees the page change its emphasis, not reload.

**Independent test:** in Chromium with motion allowed, tap each role in the switch and read the transition's running animations, then check the page that lands.

- **S1.1** Given a role page, when the visitor taps another role, then the current role's mark (its soft fill) slides to the new role over 360 ms on the spring, `cubic-bezier(0.3, 1.32, 0.52, 1)` (MA-15).
- **S1.2** Given the home, which marks no role, when the visitor taps a role, then the mark fades in under it over 200 ms; going from a role page to the home, which only the header's name links, loads as usual (S2.3).
- **S1.3** Given a switch, then the hero's eyebrow and the "End to end" note crossfade: the old text fades out over 110 ms, then the new fades in over 200 ms, with the soft ease-out.
- **S1.4** Given a switch, then the three hero words, the five "End to end" rows and the three roles' names relight in place, crossfading from their old color to their new over 200 ms with the soft ease-out.
- **S1.5** Given a switch, then each Hopper topic moves from its old place to its new one over 420 ms on the spring, its contents crossfading as it goes.
- **S1.6** Given a switch, then the rest of the page swaps at once, with nothing fading, and the sticky header and the floating "Ask about Brad" button stay still, above everything that moves.

### Story 2: The morph plays where the role page opens (P1)

- **S2.1** Given a visitor scrolled down to reach the switch, as on every phone, when they tap a role, then the page goes to its top at once, and the morph plays there; the role page opens at its top, as it does today, with no jump when the morph ends.
- **S2.2** Given a switch, then the new page's hero is at rest when the morph starts: its opening doesn't play again, and no hero animation runs after the morph.
- **S2.3** Given any other navigation between these pages (the header's name to the home, back or forward, a reload, or a link opened in a new tab), then the page loads as it does today, with no morph and at its usual position.

### Story 3: Everyone else gets a plain page load (P1)

- **S3.1** Given reduced motion, when the visitor taps a role, then there's no transition: the role page loads at the top, as today, with its hero at rest (S05).
- **S3.2** Given Firefox, when the visitor taps a role, then the role page loads normally, complete (MA-15's proof).
- **S3.3** Given no script, then the switch's links work, and a tap loads the role page with no transition (S12).
- **S3.4** Given any page at rest, then the home and each role page show the same words, facts and order as before this slice, and the switch looks the same.

### Story 4: It still works for everyone (P1)

- **S4.1** Given `/` and each role page, in both themes at desktop and phone sizes, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S4.2** Given the switch, then its accessible names are unchanged: "Mobile", "Full-stack", "Applied AI", the current one marked with `aria-current="page"`.
- **S4.3** Given the build, then the CSP and the inline scripts and styles don't change, and no file outside the home and role pages loads the morph's CSS.
- **S4.4** Given the build, then the one module grows by at most 768 bytes (Brad's Gate 1 card), and the morph adds no `scroll`, `scrollend` or `wheel` listener.
- **S4.5** Given a switch with motion allowed, then layout shift on the new page stays 0.

## Edge cases

- A tap during the hero's opening: the old page's snapshot is mid-opening; the new hero lands at rest.
- A visitor scrolled far below the switch, among Hopper's topics: the page goes to its top, so the topics that move are off screen and the hero relights; the role page opens at its top.
- Two taps in quick succession: the browser drops the first transition and runs the second.
- A browser with cross-document View Transitions but no Navigation API: the morph is skipped, and the page loads as usual.
- The visitor turns on reduced motion mid-visit: the opt-in sits inside the query, so the next switch is a plain load.
- A new topic from a later export gets the next class, and morph names exist for up to eight topics; a ninth would load in place, unnamed.

## Functional requirements

- **FR-001** A switch between the home and the role pages, or between role pages, MUST morph as MA-15 sets: the mark, the eyebrow and note, the words, rows and names, and the topics, with the timings in S1.1–S1.5.
- **FR-002** The morph MUST be a cross-document View Transition opted into in CSS, only inside `prefers-reduced-motion: no-preference` and `scripting: enabled`, and only on the home and role pages.
- **FR-003** When it morphs, the old page MUST go to its top as the switch begins, and the role page MUST open at its top with its hero at rest; every other navigation MUST load as today.
- **FR-004** With no script, under reduced motion and without the feature, a switch MUST be a plain page load, and every page MUST be complete at rest.
- **FR-005** The CSP MUST NOT change; the one module MUST grow by no more than 768 bytes, with no scroll handler; layout shift MUST stay 0.
- **FR-006** Specs 009, 014, 016–018, 022, 025 and 027's tests MUST be amended where they read what this slice changes, and `tests/029/` MUST cover every ID here.
- **FR-007** `docs/plan.md` MUST show slice 5.5's state, and the decision log MUST hold D212.

## Success criteria

- **SC-001** In Chromium, the transition's animations match S1.1–S1.5's durations, delays and easings within 10 ms.
- **SC-002** After a switch from a scrolled page, each part's morph starts and ends where the role page shows it (no jump at the end), the role page is at its top, and no hero animation is running.
- **SC-003** In Firefox, under reduced motion and with no script, a switch starts no transition and the role page loads complete.
- **SC-004** axe finds 0 violations, layout shift is 0, and the CSP is unchanged.
- **SC-005** The one module grows by no more than 768 bytes.

## Mocks and flows

The approved mock is the private landing study's "A · Refined" view, which Brad reviewed on 2026-11-09. Nothing from it is copied here. [mocks/README.md](mocks/README.md) lists the states this slice touches, the motion table it's checked against, and the spike's measurements. Captures of the spike go to Brad with the Gate 1 cards.

## Decisions to record

- **D212** Role pages morph with a cross-document View Transition (MA-15), only with motion allowed and script running, from the top of the page, with the new hero at rest; every other navigation, and every browser without the feature, loads as today.

On Brad's Gate 1 cards (2026-11-10): the one module may grow by at most 768 bytes for the morph. Brad first chose to keep the reader's place on a switch; the build found that Chrome holds back every scroll on the new page until a transition ends (checked with `scrollTo`, `scrollTop` and a fragment), so the morph would aim at the top and jump at its end. On a second card the same day, Brad chose instead that a scrolled page goes to its top as the switch begins, then morphs. The script measured 481 bytes.

Tier 3, decided in this spec: the rest of the page swaps at once rather than crossfading, so only the named parts move; the eyebrow and note fade out, then in, so two strings never overlap; the words, rows and names crossfade in place, since their positions don't change; the mark fades in from the home and nothing morphs back to the home, which only the header's name links; the header and the floating button sit above the morph; the topics are named by their place in the claims' order, for up to eight topics; the rows are named by their place, since two rows can share a role. From the review: the roles' names sit above the mark, so it never covers them, whichever way it slides; a name is bolder while current, so its width changes and it moves by that much as it relights, at its own size, never stretched; the note's old and new text keep their own widths, held to the card's right edge.
