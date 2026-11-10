# Plan 029: Role pages morph (landing A5)

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1, on 2026-11-10.

## Approach

CSS does the morph; a short script says where it plays. `morph.css` opts the home and role pages into cross-document View Transitions with `@view-transition { navigation: auto }`, inside `prefers-reduced-motion: no-preference` and `scripting: enabled`. It names the parts that morph, and times their pseudo-elements: the root's old and new snapshots don't animate, so the page swaps at once; each named part moves or crossfades.

`morph.client.ts` joins the one module, with two listeners and no scroll handler:

- `pageswap`, on the old page: when a transition is about to run, and the destination is a role page reached by a push, it scrolls the page to its top at once, before the browser captures it. A browser holds every scroll back on the new page while a transition runs, so this is the one place both pages share. Otherwise it skips the transition, so the header's link home, back and forward load as today.
- `pagereveal`, on the new page: when a transition runs, it finishes the hero's animations.

So the hero's opening doesn't replay under the morph. The script finishes it from `pagereveal` or, if the module runs after the page is revealed, when `:active-view-transition` matches. `hero.client.ts` stays as it is, under spec 025's 512-byte cap.

A spike of this plan, on the build in Chromium:

- Home to `/mobile` and `/mobile` to `/ai` each started every named group: the mark (360 ms, spring; 200 ms fade-in from the home), the eyebrow and note (110 ms out, 200 ms in from 110 ms), the words, rows and names (200 ms), and five topics (420 ms, spring).
- From 120 px down at 1280 × 800 and 160 px at 390 × 844, keeping the place failed: the new page's scroll was held at 0 until the transition ended, so every part's morph aimed at the top and jumped at the end. Going to the top first (Brad's second card), the words' start and end positions matched, the role page opened at its top, and no hero animation was running when the morph started.
- The header's link home ran no transition. Reduced motion ran none. Firefox loaded `/mobile` normally.
- The one module grew from 10,568 to 11,049 bytes (+481), 4,263 to 4,426 gzipped.

| Part   | Where                                     | How                                                                                                                                                                                                            |
| ------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opt-in | `styles/home/morph.css`, `HomePage.astro` | `@view-transition` inside the two queries; `HomePage.astro` imports the file, so only `/` and the role pages carry it.                                                                                         |
| Names  | Same                                      | `hero-eyebrow`, `hero-note`, `hero-word-1`–`3`, `hero-row-1`–`5` (by place), `role-pill` (the current role's link), `role-name-1`–`3`, `hopper-topic-1`–`8` (class `hopper-topic`), `site-header`, `chat-ask`. |
| Timing | Same                                      | `::view-transition-*` rules with S1.1–S1.5's durations and easings; the header's and button's groups sit above, still.                                                                                         |
| Markup | `RoleSwitch.astro`, `Hopper.astro`        | `ds-roles__item--N` and `ds-roles__name` in the switch; `hopper__topic--kN` on each topic, its place in the claims' order.                                                                                     |
| Script | `morph.client.ts`, `PreviewLink.astro`    | The two listeners above.                                                                                                                                                                                       |
| Docs   | `docs/plan.md`, D212, the log             | Slice 5.5's state, and the record.                                                                                                                                                                             |

## Tests first

`tests/029/` holds the new tests, traced to every ID in the spec:

- `static/morph.test.ts`: the opt-in inside both queries; each name and its timing; only `HomePage.astro` imports the CSS; the switch's and topics' classes; the script's two listeners, the role-page check, no scroll listener and no storage (S1.x, S2.3, S3.1, S3.3, S4.3, S4.4, FR-002).
- `e2e/morph.test.ts`, in Chromium with motion allowed: the transition's animations on each switch (S1.1–S1.6); the top, the matching positions and the hero at rest (S2.1, S2.2); no transition on the header's link home, back and a reload (S2.3); reduced motion and no script (S3.1, S3.3); Firefox, launched in the same container (S3.2); the page at rest (S3.4, S4.2); layout shift, the module's size and the CSP (S4.3–S4.5).
- `e2e/a11y-visual.test.ts`: axe on `/` and each role page (S4.1).

Amended, each with this spec named in a comment:

- Spec 014 and 009: the switch's markup (its names now sit in a span).
- Specs 016, 017, 018, 022, 025 and 027: the one module's size checks take the new allowance, and any listener count takes the morph's two.

No baseline should change: the switch looks the same, and the morph's CSS is inert at rest.

## Risks

- The Navigation API and cross-document View Transitions are Chromium and Safari features; elsewhere the switch stays a plain load, which is the approved fallback.
- A test of a mid-transition frame is timing-sensitive; the tests read the animations' timing and pause them, rather than comparing pixels.

## Decisions

D212, in [spec.md](spec.md), and Brad's Gate 1 cards. The tier-3 details are listed in the spec.
