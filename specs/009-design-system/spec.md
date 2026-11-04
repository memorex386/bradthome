# Spec 009: The design system

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Draft |
| Slice | 3.1 Design system |
| Branch | `009-design-system` |
| Mocks and flows | [mocks/README.md](mocks/README.md): the gallery page, `/design-system`, on this pull request's preview, with screenshots of every state |
| Plan | [plan.md](plan.md), for approval with this spec at Gate 1 |
| Decisions | [D116](../../docs/decisions/0116-direction-a-with-cs-numbered-evidence-receipts.md) to [D120](../../docs/decisions/0120-motion-only-when-the-visitor-hasnt-asked-for-less.md), from this slice. It builds on [D35](../../docs/decisions/0035-purposeful-motion.md), [D46](../../docs/decisions/0046-visual-snapshots-in-a-pinned-linux-container.md), [D51](../../docs/decisions/0051-tailwind-css-4-and-motion-for-styling.md), [D58](../../docs/decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md) and [D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md), and on specs 003, 007 and 008. |

## Summary

Phase 3 redesigns the site in direction A, as the "Home v2" board draws it, with direction C's numbered evidence receipts on claims (D116). This slice builds the design system that slices 3.2–3.11 use: tokens for color, type, space, radius, shadow and motion in light and dark, three self-hosted fonts, and the components Home v2 and the receipts need, each working with a keyboard, with reduced motion and in both themes. A gallery page shows every component and state for review, unlinked and with `noindex`. Main starts deploying to the `next` preview channel (D117). v1's pages keep today's look, so main stays releasable for any v1.x fix (D118, D119). Spec 003's locked rule that nothing in the site's source moves becomes "nothing moves when a visitor asks for reduced motion" (D120).

## Scope

**In:**

- Tokens in `apps/site/src/styles/ds/tokens.css`, as Tailwind CSS 4 theme variables, with each color's light and dark value.
- Inter Tight, Inter and JetBrains Mono, self-hosted through Astro's Fonts API from their Fontsource packages (SIL Open Font License 1.1), with size-adjusted fallbacks.
- Components in `apps/site/src/components/ds/`: the header and its phone menu, the footer, buttons, links, chips, the "Hiring for" role switch, cards, the section eyebrow, the stat, the evidence receipt and its marker, and the "Ask about Brad" placeholder.
- A layout of its own, `DesignBase.astro`, and the gallery at `/design-system`.
- A `next` workflow that deploys main to the `next` channel on every push (D117).
- Spec 003's S1.5 and its static check, amended and relocked (D120).
- Tests in `tests/009/`, with snapshot baselines from the pinned container.

**Out:**

- Any change to the home, essay or 404 pages, their words or their look (D119). Slices 3.2–3.5 move them to the new layout.
- The hero's words and motion (3.2), the page's sections (3.3–3.5), the role pages (3.6), the résumé (3.7), link previews (3.8) and the chat (phase 4).
- The boards' words. The gallery's words are its own.
- A theme switch on the site. Only the gallery has one, in CSS, so a reviewer can see both themes on one device.

## User stories and acceptance scenarios

The IDs in brackets, such as (G1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: The tokens hold the look in both themes (P1)

Brad chose Home v2's look (D116), and every later slice builds on it, so it lives in one set of tokens.

**Why this priority:** every component and page reads them.

**Independent test:** read `tokens.css`, compute each pair's contrast, and open the gallery in each theme.

- **S1.1** Given `apps/site/src/styles/ds/tokens.css`, then it defines, in Tailwind's `@theme`, the colors Home v2 uses with a light and a dark value each, the three font families, the type scale, the spacing step and layout widths, the radii, the shadows, and the motion durations and easing (G1, G2).
- **S1.2** Given every text and background pair the components use, listed in this spec's contrast table, then each meets WCAG 2.2 AA in light and in dark: 4.5:1 for text, and 3:1 for large text, edges and focus rings.
- **S1.3** Given a device set to light or dark, when the gallery loads, then its page and text use that theme's background and ink, with no flash of the other. When the gallery's theme switch is set to Light or Dark, the page uses that theme whatever the device's setting (G1–G4).
- **S1.4** Given the gallery loads, then Inter Tight, Inter and JetBrains Mono come from the site itself and are preloaded, text shows in size-adjusted fallbacks before they arrive, and no request goes to another host.

### Story 2: The components cover Home v2 and the receipts (P1)

**Why this priority:** slices 3.2–3.5 assemble pages from them.

**Independent test:** open the gallery on a desktop and a phone, and use each component with a pointer and a keyboard.

- **S2.1** Given a desktop 1280 pixels wide, then the header shows "Brad Thome" linking `/`, a navigation region named "Sections", a navigation region named "Elsewhere" with GitHub and LinkedIn linking Brad's profiles, and a résumé button (G1). Given a phone 390 pixels wide, then it shows the name, a résumé icon button and a "Menu" button, all on one row, and opening the menu shows the sections and the profiles (G3, M1).
- **S2.2** Given the gallery, then the footer reads "Brad Thome · Dallas–Fort Worth", with the name linking `/`, beside the page's note (G1).
- **S2.3** Given the gallery, then it shows the primary, secondary, accent and icon buttons, text, quiet and navigation links, highlight and tag chips, the role switch, plain, highlighted, soft, feature and link cards, the accent and muted eyebrows, and the stat, each in its default, hover and keyboard-focus states (C1–C6).
- **S2.4** Given the role switch, then it's a navigation region named by its "Hiring for" label, each role is a link, and the current one has `aria-current="page"` and the filled style (C4).
- **S2.5** Given the band, then its eyebrow, cards, chips and links use the band's colors in both themes (C7).
- **S2.6** Given the "Ask about Brad" placeholder, then it's a link named "Ask about Brad" that opens an email to brad@bradthome.com, and with `floating` it's fixed to the corner on a desktop and sits in the flow on a phone (A1).

### Story 3: A claim's receipt opens its evidence (P1)

Direction C's receipts carry the proof (D116): a numbered marker on a claim, and a note that's proof or something to ask about.

**Why this priority:** it's what the redesign adds to direction A.

**Independent test:** on a desktop and a phone, open each receipt with a pointer, the keyboard and its marker.

- **S3.1** Given a desktop 1280 pixels wide, then each claim's receipts sit in a margin column to the right of the claim, their tops level with it (R1, R3).
- **S3.2** Given a phone 390 pixels wide, then each claim's receipts sit in line under it, inside the text column, and the page never scrolls sideways (R2, R4).
- **S3.3** Given a closed receipt, then it shows its number, its title and its kind, "Proof" or "Ask me". When the visitor clicks it, taps it, or presses Enter or Space on it, then it opens to show its evidence, and doing so again closes it (R1–R4).
- **S3.4** Given a claim's marker, when the visitor follows it, then its receipt opens and scrolls into view (R5).
- **S3.5** Given a proof receipt, then its marker is filled with the accent color and is named "Receipt N, proof"; given an ask-me receipt, then its marker is outlined and named "Receipt N, ask Brad" (R1, R3).

### Story 4: Every component works with a keyboard, with reduced motion and with assistive technology (P1)

**Why this priority:** spec 003's bars apply to every page, and D35 sets the motion rules.

**Independent test:** tab through the gallery, run axe, and compare it with reduced motion on and off.

- **S4.1** Given a keyboard on the gallery, when the visitor presses Tab, then focus moves first to a "Skip to the gallery" link, then the header's name, its sections, its profiles and the résumé button, in that order, and every element that takes focus shows a ring at least 2 pixels wide in the accent color (F1–F3).
- **S4.2** Given reduced motion is on, then no element has a transition or an animation. Given it's off, then hovering a button, link or card changes it over at most 240 ms, and nothing loops.
- **S4.3** Given the gallery in either theme at either size, with its receipts and its phone menu open, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S4.4** Given the gallery at phone 390×844 and desktop 1280×800, in light and dark, with reduced motion on, then each whole page matches its committed snapshot with no pixel tolerance, in the pinned container. So do the phone menu open, and a receipt opened by its marker on each size (G1–G4, M1, R5).
- **S4.5** Given the gallery loads, then it runs no script, requests nothing from another host, carries no inline style and logs no error.

### Story 5: v1 stays as released (P1)

Main must stay releasable for a v1.x fix (D118), so v1's pages don't change (D119).

**Why this priority:** a release from main must not ship the redesign early.

**Independent test:** build the site and read what the home, essay and 404 pages load.

- **S5.1** Given the built site, then the home, essay and 404 pages load no design-system stylesheet and none of the two new fonts, and their stylesheet holds no design-system class or token.
- **S5.2** Given the built site, then the gallery has `<meta name="robots" content="noindex">`, and no page links to `/design-system`.
- **S5.3** Given this branch, then specs 003, 006 and 007's tests pass, and their snapshots match without new baselines.

### Story 6: Main shows on the `next` channel (P2)

D58 sends phase 3 to `next` until v2.0, and D117 deploys it on every push.

**Why this priority:** Brad reviews merged work there, but nothing in this slice depends on it.

**Independent test:** read the workflow; after the merge, open `next`.

- **S6.1** Given a push to main, then the `next` workflow builds main and deploys it to the channel `next` with the noindex copy of the config, expiring 30 days after the push, signed in through the preview's Workload Identity Federation with no stored key.
- **S6.2** Given the workflow, then it runs only on pushes to main, names no channel but `next`, never deploys to live, and sits outside the gate.

### Story 7: Spec 003's motion rule follows D35 (P1)

- **S7.1** Given a file in `apps/site/src`, then a transition or animation inside a `@media (prefers-reduced-motion: no-preference)` block passes spec 003's static check, and one anywhere else fails it (D120).

## Contrast table

The pairs S1.2 checks, each in light and dark. Text needs 4.5:1; the rest need 3:1.

| Text or mark | On | Needs |
| --- | --- | --- |
| ink, ink-2, muted, accent | bg, surface, soft | 4.5:1 |
| ink, ink-2, muted, accent | accent-soft | 4.5:1 |
| bg (a primary button's words) | ink | 4.5:1 |
| on-accent (words on accent) | accent | 4.5:1 |
| band-ink, band-muted, band-accent | band | 4.5:1 |
| dim (an outlined marker's edge) | bg, surface | 3:1 |
| accent (focus ring) | bg, surface, soft | 3:1 |

## Edge cases

- A browser without `light-dark()`, before 2024: colors fall back to the browser's defaults. Every browser in the charter's support range has it. Covered by S1.3 in the pinned browser.
- A browser that can't target a closed disclosure's content: following a marker scrolls to the receipt without opening it, and the visitor opens it there. Covered by S3.4 in the pinned browser.
- Fonts that don't load: text shows in the size-adjusted fallbacks. Covered by S1.4.
- A screen narrower than 320 pixels, or 200% zoom: the header keeps its phone row, and receipts sit in line. Covered by S3.2 at 320.
- The phone menu left open when the screen widens: the desktop header hides the menu. Covered by S2.1.
- No `next` deploy for 30 days: the channel expires until the next push. Covered by S6.1.

## Functional requirements

- **FR-001** `apps/site/src/styles/ds/tokens.css` MUST define the design system's tokens as Tailwind CSS 4 theme variables: colors as `light-dark()` pairs, font families, a type scale with line heights and tracking, the spacing step, layout widths, radii, shadows, and motion durations and easing.
- **FR-002** The site MUST self-host Inter Tight and JetBrains Mono, with Inter, through Astro's Fonts API and its local provider, from their pinned Fontsource packages, each under the SIL Open Font License 1.1, with size-adjusted fallbacks and `font-display: swap`.
- **FR-003** `apps/site/src/components/ds/` MUST hold the header, with its phone menu as a native disclosure, and the footer.
- **FR-004** It MUST hold buttons (primary, secondary, accent, icon), chips (highlight, tag), cards (plain, highlighted, soft, feature, link), the section eyebrow and the stat, and `components.css` MUST style text, quiet and navigation links.
- **FR-005** The role switch MUST be a navigation region of links, with the current role marked `aria-current="page"`.
- **FR-006** The evidence receipt MUST be a native disclosure with a number, a title, its kind and its evidence, and its marker MUST be a link to the receipt's evidence. Receipts MUST sit in a margin column from 64rem wide and in line below that.
- **FR-007** "Ask about Brad" MUST be a placeholder link until phase 4, with a floating form for a desktop.
- **FR-008** The design system MUST have its own layout, `DesignBase.astro`, which sets `noindex` by default. The home, essay and 404 pages MUST NOT load its stylesheets or its two new fonts, and v1's stylesheet MUST NOT gain its classes or tokens.
- **FR-009** The gallery at `/design-system` MUST show every token, component and state, MUST carry `noindex`, MUST NOT be linked from any page, and MUST offer a Device, Light and Dark theme switch in CSS alone.
- **FR-010** Every pair in the contrast table MUST meet its ratio in both themes.
- **FR-011** Every focusable component MUST show a focus ring of at least 2 pixels in the accent color, every button, role link and receipt summary MUST be at least 44 pixels tall, and every other link MUST be at least 24 pixels or spaced as WCAG 2.5.8 allows.
- **FR-012** Every transition and animation in the design system MUST sit inside a `@media (prefers-reduced-motion: no-preference)` block, MUST last at most 240 ms, except the 650 ms intro token kept for slice 3.2, and MUST NOT loop.
- **FR-013** The gallery MUST ship no script, request no other host and carry no inline style, so the Content-Security-Policy needs no exception.
- **FR-014** A `next` workflow MUST deploy main to the channel `next` on every push to main, as S6.1 and S6.2 say.
- **FR-015** Spec 003's S1.5 and its static motion check MUST be amended as D120 says, and spec 003 relocked, in this pull request.
- **FR-016** The end-to-end tests MUST cover the gallery for axe, keyboard order, focus rings, reduced motion, receipts at both sizes and snapshots, in the pinned container.
- **FR-017** AGENTS.md, `docs/release.md` and `docs/plan.md` MUST name the `next` workflow, how a v1.x fix ships (D118) and the gallery.

## Success criteria

- **SC-001** 0 pairs in the contrast table fall below their ratio, in either theme.
- **SC-002** The gallery has 0 automated accessibility violations in each of its four states, and with its receipts and menu open.
- **SC-003** The home, essay and 404 pages' built stylesheet holds 0 design-system classes or tokens, and on this branch it's the same file the v1.0.0 release serves, `Base.BKbT8vcy.css`.
- **SC-004** Every interactive component in the gallery shows a focus ring when tabbed to: 0 without one.

## Mocks and flows

[mocks/README.md](mocks/README.md) lists the gallery's states with screenshots, and links the gallery on this pull request's preview, which Brad can open on a phone.

## Key entities

- **Tokens:** `apps/site/src/styles/ds/tokens.css`.
- **Components:** `apps/site/src/components/ds/*.astro`, styled by `apps/site/src/styles/ds/components.css`.
- **The layout and the gallery:** `apps/site/src/layouts/DesignBase.astro` and `apps/site/src/pages/design-system.astro`, with `apps/site/src/styles/ds/gallery.css`.
- **The `next` workflow:** `.github/workflows/next.yml` and `scripts/ci/next-deploy.ts`.

## Assumptions

- The preview's service account can deploy from a push to main, since its binding names the repo, not the event (spec 003's evidence).
- Hosting's channels expire at most 30 days after a deploy.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D116–D120:

- Home v2's palette passes AA as drawn, so the tokens keep its values. Its dim gray is 3.0:1 to 4.1:1, so it's for edges, never text.
- Colors use `light-dark()`, so one variable holds both themes and the gallery's switch only sets `color-scheme`.
- The role switch is links, not toggle buttons as on the board, since each role is its own page from slice 3.6, and links need no script.
- Receipts and the phone menu use the native disclosure, `details` and `summary`, so they need no script and keep the site's no-script rule.
- A marker links into its receipt's evidence, since a browser opens a closed disclosure when a link targets what's inside it.
- Receipts take A's accent, not C's orange (D116), with "Proof" and "Ask me" as their kinds.
- Every stylesheet scopes Tailwind's sources, so words in the design system's files don't become utilities in v1's stylesheet.
- The gallery shows hover and focus without a pointer through `.is-hover` and `.is-focus` classes, which share the real states' rules.
- The new fonts' fallbacks are computed as Astro's Fonts API computes them, and name the Liberation and Croscore fonts, as spec 007's do.
- The gallery lives at `/design-system`.

## Changes to other specs

- **Spec 003 (locked, D120):** S1.5 and `tests/003/static/site.test.ts`'s motion check allow a transition or animation only inside a no-preference reduced-motion query. Spec 003 is relocked.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/009/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: waiting for Brad.
