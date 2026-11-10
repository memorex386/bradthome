# Plan 025: The first screen (landing A1)

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

For approval with [spec.md](spec.md) at Gate 1.

## Approach

Everything stays in CSS but one small settle step. The hero's sequence is still keyframes inside `prefers-reduced-motion: no-preference`, as D122 and D126 ask, with the Brisk numbers in place of the Story ones. The study's timings came from its running animations on 2026-11-09, and the brief's motion table is the target.

| Part                               | Where                                                                                                      | How                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MA-1 words                         | `hero.css`                                                                                                 | Two animations per word, `hero-word-rise` (transform, spring) and `hero-word-ink` (color, ease-out), 520 ms, delays 0, 300 and 600 ms by `hero__word--N`. A role page's words land into their own color, as today.                                                                                                                                                                                 |
| MA-2 dots                          | `hero.css`                                                                                                 | The dot becomes `inline-block` so it can scale; `hero-dot` keyframes scale 0.45 → 1.3 at 55% → 1 and color muted → its own; delay by its word, 286, 586 and 886 ms.                                                                                                                                                                                                                                |
| MA-3 rows                          | `hero.css`                                                                                                 | `hero-row` (border color, 30–55%) and `hero-layer` (layer color, 30–55%) on the row, and `hero-sheen` on its `::before`, a soft accent band translated across the row, clipped by the row. Delays 140, 440 and 740 ms by `hero__row--N`, 700 ms each.                                                                                                                                              |
| MA-4 lines, actions, tiles, switch | `hero.css`                                                                                                 | `hero-rise`, 10 px, 540 ms, ease-out: lines 760 and 880 ms, actions 1,000 ms, the tiles and the switch under them 1,060 ms.                                                                                                                                                                                                                                                                        |
| MA-5 hover                         | `hero.css`                                                                                                 | Inside `(hover: hover)`: `.hero:has(.hero__word--N:hover, .hero__row--N:hover)` lights word N and its rows. Color transitions and the 3 px move sit inside no-preference, so reduced motion changes color at once.                                                                                                                                                                                 |
| MA-19 hover and press              | `hero.css`                                                                                                 | The hero's primary button and the tiles: `translate: 0 -1px` on hover, the arrow `translate: 3px 0`, `scale: 0.98` on press, 150–240 ms, inside no-preference and `(hover: hover)`. The design system's own button rules don't change.                                                                                                                                                             |
| T1 tiles                           | `hero.ts`, `Hero.astro`, `hero.css`                                                                        | `PROOF` replaces `CHIPS`: figure, label, claims, terms and the topic it links. The build throws on a missing claim; the static test and the link check catch a topic with no claims. A grid of three on wide screens, stacked rows under 40 rem.                                                                                                                                                   |
| T2 spacing                         | `hero.css`, `hopper.css`                                                                                   | T2's padding and gap. The study puts the Hopper band straight after the hero's bottom padding, so the band's own top margin goes, which the 1440 × 900 target needs (measured: today it starts at 1,014 px).                                                                                                                                                                                       |
| T8 settle                          | `components/home/hero.client.ts`, imported by the one module                                               | If the page loads with a hash or scrolled down, `finish()` every animation under `.hero`; checked again at `load` for restored scroll. No scroll handler. About 200 bytes; the module's checks in specs 017 and 018 gain a stated 512-byte allowance.                                                                                                                                              |
| T10 switch                         | `HomePage.astro`, `Hero.astro`, `roles.ts`, `roles.css`, `RoleSwitch.astro`, `components.css`, the gallery | The switch moves from under the header into the hero's text column, after the proof tiles (Brad's card during the build; see the spec's changes since Gate 1). `RoleSwitch` loses its `address` prop and gains a `quiet` look: small muted label, borderless links at 44 px, the current one marked with ink and a soft fill. `addressOf()` goes. The gallery shows both looks without an address. |

## Tests first

`tests/025/` holds the new tests, traced to every ID in the spec:

- `static/first-screen.test.ts`: the tiles' words against their claims, their topic links, T2's values, every keyframe inside the no-preference block, the sheen on a pseudo-element, and no address in any source.
- `e2e/first-screen.test.ts`: the animation table (S1.1–S1.5) from `document.getAnimations()`, the first frame (S1.6), reduced motion (S1.7), layout shift (S1.8), the tiles (S2.x), the positions (S3.2), hover (S4.x), deep links and restored scroll (S5.x), the switch (S6.x), no script (S7.3) and the module's size (SC-006).
- `e2e/a11y-visual.test.ts`: axe and the reduced-motion snapshots (S7.1, S7.2).

Amended, each with this spec named in a comment:

- Spec 010: the timing test moves to Brisk, the chip tests become tile tests, the keyboard path drops "Any role" and moves the switch after the actions, and the home baselines are remade.
- Spec 014: the page order loses the switch row, the switch's links, label and address change, its focus snapshot moves into the hero, and the role baselines are remade.
- Spec 009: `RoleSwitch` takes no address, and the gallery's baselines are remade.
- Specs 011–013, 016–018 and 022: any whole-page baseline that moves with the hero is remade; the module-size checks in 017 and 018 gain 025's 512 bytes.

## Risks

- Every home and role baseline changes, so the snapshots are remade in the pinned container with `pnpm test:visual --update`, and each diff is looked at before it's kept.
- `:has()` hover isn't in older browsers; there it simply doesn't light the rows.
- The 1440 × 900 target leans on dropping the band's top margin; if Brad wants the margin kept, the target can't hold and becomes a deviation.

## Decisions

D204–D207, in [spec.md](spec.md). The tier-3 details, listed in the commit: the switch rises with the tiles above it at 1,060 ms; the tiles stack under 40 rem; the sheen is 35% of the row wide.
