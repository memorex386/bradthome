# Plan 036: The hero's tiles, buttons and phone header

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

For approval with [spec.md](spec.md) at Gate 1. The "Show it" captures in [mocks/README.md](mocks/README.md) are this plan's first build, so the approach below is what they show.

## Approach

| Part | Where | How |
| --- | --- | --- |
| The tiles | `hero.ts`, `Hero.astro`, `hero.css` | `TILES` replaces `PROOF`: each tile names its role, icon, start month (`since`) or figure, its line, and the claims and terms behind it. Each is an `<a>` to its role page inside a `<nav>` the heading names, with `aria-current="page"` on the role's own page, so it needs no script and keeps the back button. "Show all roles" links `/`. `roles.ts`'s `SWITCH` and the hero's `RoleSwitch` go; the gallery keeps both of `RoleSwitch`'s looks as design-system parts. |
| The live years | `years.ts`, `years.client.ts`, `tiles.ts` | `yearsSince()` counts whole months over 12, rounded down. The build calls it for its month in America/Chicago, as spec 033's counts do, and writes the figure with its start month in `data-since`. `recount()`, imported by the one module, counts again from the visitor's clock and only ever raises a figure. Built at 13,013 bytes against main's 12,682: 331 bytes. |
| The start months | `content/career/years-of-experience.yaml`, `schema.ts`, `content.config.ts` | A new hand-written subject folder, `career`, like `education`, so the notes' "Years of experience" heading gives the export a subject. The build fails unless a tile's first claim says its start month as `monthOf()` writes it. |
| The detail | `HeroDetail.astro`, `tiles.ts`, `hero.css` | Rendered twice on a role page, in the picked tile's `<li>` for a phone and after the tiles for a desktop, with CSS showing one, so the reading and focus order match what's on screen at each size. The timeline is an SVG of `<rect>`s placed by `x` and `width` in a 0–100 viewBox, as Experience's bars are, so there's no inline style. The legend is the readable version. Receipts show each claim's words through the corpus's `factOf()`, so a note to the site never shows. "Ask about this" is a link to `#contact` with `data-chat-ask`, which `ask.client.ts` already handles. |
| Hover and focus | `hero.css` | MA-5's `:has()` rules gain `.hero__tile--N:hover`, and a `:focus-visible` copy outside `(hover: hover)`, since a keyboard isn't a touch. Color at once; the lift, the bar's sweep (a `scale` on an SVG rect) and the hint's slide inside no-preference. |
| The sequence | `hero.css` | MA-4 keeps its times; the tiles take the 1,000 ms slot, and the buttons and chips 1,060 ms, since they now come after the tiles. |
| The buttons | `Hero.astro`, `hero.css`, `Icon.astro` | Design-system buttons: primary for the work, secondary for the résumé, with a mono PDF tag. The address and its copy button are one split button that reuses `email.client.ts` through its `data-email` attributes, so no new script. The address is visually hidden on a phone and "Email" shows; both stay in the link's name. |
| The chips | `Hero.astro`, `profiles.ts`, `Logo.astro`, `PreviewLink.astro` | `PreviewLink` with `place="hero"`, so each chip gets its own preview card. GitHub's avatar is `cardOf()`'s snapshot image, the site's own file. The marks are inline SVG: Primer's Octicons GitHub mark (MIT) and LinkedIn's "in". |
| The header | `Header.astro`, `components.css`, `tokens.css` | One set of profile links for every size: GitHub and LinkedIn as 44 px icon links, then the résumé, a button with a PDF tag that folds to a 44 px icon on a phone, then the menu, shown only on a phone and now holding the sections alone. Under 360 px the icons touch, so all four fit beside the name at 320. `PreviewLink` takes an `aria-label` for the marks. LinkedIn's blue is a token, lightened on dark for 3:1. |
| The morph | `morph.css` | The switch's `role-pill` becomes the picked tile's check, and each tile relights in place under `role-name-N`, so a role switch still slides its mark (D212). |
| The corpus and evals | `corpus.ts`, `corpus/build.ts`, `apps/evals/src/corpus.ts`, `cases.ts` | Both corpus builders read `career`; a career claim links its tile, `#tile-<role>`. Three facts cases, `facts-tile-mobile`, `-fullstack` and `-ai`, each requiring an answered state that cites one of its role's claims. The cases change the fingerprint, so the run goes through an `evals/036-hero-tiles` branch (D193) on Brad's card. |

## Alternatives considered

- **The detail laid out once, with CSS grid tricks** (`display: contents` on the list items, or a subgrid the picked item spans): one copy in the page, but `display: contents` drops list semantics in some browsers, and the subgrid needs the picked item over its neighbours with `pointer-events` games. Two copies, one shown, is plainer and keeps the focus order honest at each size.
- **Years counted only in the browser:** smaller HTML, but no number with no script or for crawlers, and a flash of text on load. The brief asks for both.
- **The years claims under existing subjects** (mobile under Bottle Rocket, full-stack under VINDecoded): no new folder, but the corpus would label them "Résumé · Bottle Rocket" and "Résumé · VINDecoded", and the full-stack claim would lead with VINDecoded. A `career` subject is one small file and a schema line.
- **A test hook in the page to set the date for the "later date" state:** the captures and tests use Playwright's clock instead, so the page carries no hook.

## Risks

- **Many baselines move.** The header changes every page that has one, and the hero changes the home and role pages. Each spec whose snapshots show them is re-baselined in the pinned container in this branch, and the review checks no test was weakened to fit.
- **The years in snapshots.** A built count changes when a build crosses an anniversary. The snapshot tests fix the clock and hold the built figures to the fixed clock's, so a May 2027 build doesn't fail them; the unit tests and the clock tests cover the counting itself.
- **The first screen.** With the buttons and chips after the tiles, the Hopper band starts at 1,081 px at 1440 × 900 (881 on main). The tiles still end inside each first screen: 792 of 800 at 1280 × 800, 767 of 844 at 390 × 844, 802 of 812 at 375 × 812.
- **The eval run** needs Brad's card and about $0.35 of the evals workspace's $10 for November, about $6.69 of it spent.
- **The claims' words** come from Brad's card and the career session's retag; until then the branch carries the draft words in `claims.yaml`, and the export replaces them.

## Tasks

| ID | Task | Covers |
| --- | --- | --- |
| T001 | Gate 1: Brad's cards and approval; record the answers in the spec | all |
| T002 | `tests/036/`: unit tests of the counts and `recount()`, static tests of the words, claims and CSS, e2e tests and snapshots of every state | every ID |
| T003 | Amend the tests and baselines of specs 007, 009, 010, 014, 016, 017, 018, 020, 025, 027, 029 and 030 | FR-012 |
| T004 | Finish the build to the approved cards; measure the module | FR-001–FR-010 |
| T005 | Re-export the claims once the career session retags them | FR-011, S7.1 |
| T006 | The three eval cases and the run from an `evals/` branch | S7.3, SC-006 |
| T007 | D223–D227, `docs/plan.md`'s slice 5.10, the README's description if it names the switch | FR-012 |
| T008 | The full suite locally, then the review skill's reviewer; fix or answer each finding | all |
| T009 | Brad's "push", then main's `ci`, `next` and push runs green, and the open code-scanning alerts listed | Gate 2 |
