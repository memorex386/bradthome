# Plan for spec 007: Home, as today

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved with this plan at Gate 1 |
| Status | Approved |

## Approach

**The layout.** `src/layouts/Base.astro` ports v0's: the header with Brad's name and the "Elsewhere" links, `<main class="frame">` for the page, and the footer (FR-001). It takes an optional `share` prop, `{ type, title }`; when it's set, the head gets the author, canonical, Open Graph and Twitter card tags, with the canonical address built from Astro's `site` and the page's path without `.html`, as v0 did (FR-004). The home page passes `website`, the essay `article`, and the 404 page nothing. The `frame` prop and the `head` and `header` slots slice 2.4 added go, since every page now shares them.

**The look.** `src/styles/site.css` ports v0's frame, header, footer and home rules onto the tokens and fonts (D92), and every page loads it through the layout. `essay.css` keeps its essay rules and drops the frame and header rules it held for slice 2.4. v0's card transition is left out (FR-006).

**The home page.** `src/pages/index.astro` is v0's markup, without the second Work item (FR-002, D111). The line is one constant used for the description and the lede, as in v0. VINDecoded's name and address come from `getEntry('projects', 'vindecoded')` (FR-003), and the build fails if the file is missing.

**The essay.** `Essay.astro` passes its head tags through `share` and drops its own header. Its article doesn't change (FR-007).

**The 404 page.** Its words stay. It uses the home page's heading and line styles in the shared frame.

**Checks.**

- `tests/007/static/` reads the source: the layout's header, footer and share tags, the home page's content read, no transition, and, where the private-term list is available, no private term in `apps/site/src`, `apps/site/content` or the build. The removed project's name is on that list, so no test can spell it out.
- `tests/007/e2e/` runs in the pinned container with spec 003's helpers: the home page's words against `tests/007/fixtures/home-2026-11-03.txt` minus the removed item, the head tags, the header and footer on all three pages, the Tab order and rings, the theme colors, 320-pixel widths, axe on all three pages in four states, requests and console errors, every outside link in the built site being one of the four allowed addresses, and snapshots of the 404 page in four states (FR-009).
- The words check strips tags to spaces, decodes entities and collapses spaces, on both the fixture (taken from `https://bradthome.com/` on 2026-11-03) and the served page, so markup and whitespace can't hide a changed word.
- Spec 003's amended tests (D112) and spec 006's two amended static tests, then `pnpm lock specs/003-skeleton-and-pipeline`.
- New baselines from `pnpm test:visual --update` in the container: spec 003's four home baselines, spec 006's four essay baselines, and spec 007's four 404 baselines. The PR lists each with its reason.
- The fonts' fallbacks move into `tokens.css`, so spec 003's font-swap check holds on the longer page (see the spec's tier-3 decisions).
- `pnpm csp` rewrites `firebase.json`'s policy, since the pages' hashes change.

## What exists today

- Spec 003's skeleton and checks, spec 005's content model with `projects/vindecoded.yaml`, and spec 006's essay with a "Brad Thome" link above it.
- v0's source for the home page and layout, uncommitted on Brad's PC, and the live page built from it, byte for byte.

## Alternatives considered

- **The words written into the page, VINDecoded included.** Simplest, but the content model already holds the name and address, and phase 3 lists projects from it. Reading them now keeps one source, with the words check guarding them.
- **Header and footer as components.** They appear only in the layout, so a component adds a file and nothing else. Phase 3's design system can split them out.
- **Profile links in content data.** It would keep spec 003's FR-006 unchanged, but only by moving two links to get past a check (D112).

## Risks

- **Locked tests change.** Spec 003's `page.test.ts`, `site.test.ts` and `helpers/site.ts` change, with the relock and D112 in this pull request. CI's locked-tests job checks main's copy reads the new lock.
- **Baselines change in two earlier specs.** Each changed baseline is listed in the pull request with the reason, and the essay's text check proves its words didn't move.
- **Main moves.** This branch merges main (never a rebase) and takes the next free decision numbers if D111 or D112 is taken.

## Changes to locked tests

Spec 003, with D112: `tests/003/helpers/site.ts` (the page's words and links), `tests/003/e2e/page.test.ts` (S1.1, S1.2, S1.4) and `tests/003/static/site.test.ts` (FR-005, FR-006), then the relock. Spec 001 and 002 don't change.

## Tasks

- **T001** Tests from the scenarios: `tests/007/static/`, `tests/007/e2e/` and the words fixture, traced to every ID. They fail until the build.
- **T002** Spec 003's amended tests and relock; spec 006's amended static tests and text.
- **T003** The layout's header, footer and share tags, and `site.css` (FR-001, FR-004, FR-006).
- **T004** The home page and the 404 page (FR-002, FR-003, FR-005).
- **T005** The essay's layout and `essay.css` (FR-007).
- **T006** `pnpm csp`, and baselines from `pnpm test:visual --update` in the container (FR-009, FR-010).
- **T007** Every check run locally: types, unit tests, lint, format, site types, build, html, links, the e2e suite in the container, and Lighthouse.
- **T008** Review with the pinned reviewer, fix or answer each finding, and the PR marked ready with its preview.

## Decisions

- [D111](../../docs/decisions/0111-the-home-page-drops-its-second-work-item.md): the home page drops its second Work item.
- [D112](../../docs/decisions/0112-spec-003s-page-checks-follow-the-ported-home-page.md): spec 003's page checks follow the ported home page.
- Tier 3 decisions are in the spec's "Decisions made while writing this spec".
