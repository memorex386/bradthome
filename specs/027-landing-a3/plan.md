# Plan 027: A frame that knows where you are (landing A3)

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

For approval with [spec.md](spec.md) at Gate 1.

## Approach

CSS draws and moves everything; a short script only tells the CSS where the reader is. The header is `position: sticky`. So that condensing never moves the page, the header's box keeps its 72 px: its bar is a `::before` that fades in and shortens to 60 px by `scale`, and its row moves up 6 px by `translate`. Where the browser has scroll-driven animations (Chrome and Edge today), the scroll itself drives the bar, the row and the name over its first 64 px, with no script. Elsewhere, and under reduced motion, the script's `data-stuck` switches them, over 240 ms or at once.

`header.client.ts` joins the one module, imported beside the others in `PreviewLink.astro`. It runs three IntersectionObservers and no scroll handler:

- An 8 px mark at the top of the page, an empty `span` the header renders: when it leaves the screen, the header gets `data-stuck`.
- The Hopper band, against a thin line about the header's middle (`rootMargin: -3% 0px -96% 0px`): while they meet, the header gets `data-band`.
- Each section the header links, against the screen's top 40%: whenever one enters or leaves it, the script reads every section's top, and the last one above the 40% line is current, so a long jump can't skip a mark. Its links get `aria-current="location"`, and the rule gets `--x` and `--w` from the desktop link's offset and width. It's placed again on resize and once the fonts load.

A spike of this plan, on the build in Chromium: the bar measured 72, 70.5, 66 and 60 px tall at 0, 8, 32 and 64 px of scroll, its opacity 0, 0.125, 0.5 and 1, and the name 1 down to 0.94. Each section was marked in turn at 1280 × 800 and 390 × 844, and Contact at the end. The one module grew from 8,510 to 9,578 bytes (+1,068). The phone switch measured one line, 390 px wide, after its items' padding came down to 7 px.

| Part       | Where                               | How                                                                                                                                                                                                                                                                    |
| ---------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T4, MA-6–8 | `Header.astro`, `header.client.ts`  | A `sticky` prop adds the `ds-header--sticky` class, `data-sticky`, the 8 px mark and the rule. The row moves into `.ds-header__in`, so the bar can run the screen's full width; the other pages' headers look as they do today.                                        |
| Look       | `styles/ds/components.css`          | The bar, hairline and blur on `::before`; `data-stuck` and `data-band` states; the rule as a 1 px element scaled to `--w`. Under `@media (scripting: none)` the bar is always on. Sections get `scroll-margin-top: 3.75rem`.                                           |
| Motion     | Same, inside no-preference          | 240 ms transitions; the scroll-driven `ds-header-bar`, `-row` and `-name` keyframes under `@supports (animation-timeline: scroll())`, written as longhands, since the build's minifier dropped `animation-timeline` after an `animation` shorthand; the rule's 320 ms. |
| MA-16      | Same                                | `scroll-behavior: smooth` on pages with the sticky header; `section:target`'s `h2` draws a 3 px `::after`, scaled, over 1,100 ms after 350 ms.                                                                                                                         |
| MA-18      | `styles/previews.css`               | `@starting-style` and `transition-behavior: allow-discrete` on the popover: 200 ms in, 120 ms out, from the top-left corner, or the bottom for a sheet. Held-open gallery cards are excluded.                                                                          |
| MA-21      | `styles/ds/components.css`          | `details[open]`'s panel plays a 200 ms drop.                                                                                                                                                                                                                           |
| T5         | Same                                | Under 40 rem the quiet switch doesn't wrap, runs to the screen's edges and scrolls sideways, with its scrollbar hidden; its targets stay 44 px.                                                                                                                        |
| T6         | `HomePage.astro`                    | The footer's slot holds T6's line and the repo link.                                                                                                                                                                                                                   |
| Docs       | `docs/plan.md`, D209, D210, the log | Slice 5.3's state, and the records.                                                                                                                                                                                                                                    |

## Tests first

`tests/027/` holds the new tests, traced to every ID in the spec:

- `static/frame.test.ts`: the header's sticky markup only on the home and role pages; the motion rules sit inside no-preference; the scroll-driven keyframes are longhands; no `scroll` listener in the script; the footer's link (S1.6, S7.1, S8.4, FR-002, FR-007).
- `e2e/frame.test.ts`: the header's place, size, opacity and scale at 0, 8 and 64 px, with motion and reduced (S1.x); `data-band` and colors over the band (S2.x); the section marks and the rule at both sizes (S3.x); a jump's smooth scroll, landing and underline frames (S4.x); the previews' and menu's running animations (S5.x); the phone switch's line, scroll and targets (S6.x); the footer (S7.x); no scroll listener, layout shift, the module's size and the CSP (S8.3–S8.6), and no script (S1.6).
- `e2e/a11y-visual.test.ts`: axe in each state, and the snapshots (S8.1, S8.2).

Amended, each with this spec named in a comment:

- Spec 009: the header's markup and static checks (its row moves into `.ds-header__in`).
- Specs 011–014 and 026: the home baselines, which now show the header; any test that scrolls an element to the screen's top and finds the header over it.
- Spec 016: the previews open with motion where motion is allowed; tests that read a card's box right after opening wait for it to settle.
- Specs 016, 017, 018, 025 and 026: the one module's size checks take the new allowance.

## Risks

- Every home baseline changes again, remade in the pinned container. Element shots with a rounded card edge can differ by a few pixels in CI (specs 025 and 026's hand-overs).
- Smooth scrolling can make older tests that click an in-page link read the page before it lands; those tests run at reduced motion or wait for the scroll to end.
- Firefox and Safari don't scrub the header; they use the 240 ms switch, which the brief allows ("where supported").

## Decisions

D209 and D210, in [spec.md](spec.md), and the module's allowance on Brad's Gate 1 card. The tier-3 details are listed in the spec.
