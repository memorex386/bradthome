# Plan for spec 014: Role links

|        |                                                              |
| ------ | ------------------------------------------------------------ |
| Spec   | [spec.md](spec.md), approved with it at Gate 1 on 2026-11-05 |
| Status | Approved                                                     |

## Approach

A role page is the home page with one input, the role, so the change is to make the page take it and let three small pieces react to it.

- **One page, four addresses (FR-001, FR-006, FR-007).** `v2.astro`'s body moves into `components/home/HomePage.astro`, which takes `role`. `v2.astro` renders it with `role="all"`, and `pages/[role].astro` renders it for each of `roles.ts`'s three roles. `DesignBase.astro` gains an optional `canonical` prop. `release-pages.ts` adds `mobile.html`, `fullstack.html` and `ai.html` to phase 3's pages.
- **The roles (FR-002, FR-003, FR-005, FR-006).** `components/home/roles.ts` holds each page's address, label, title and note, D134's topic orders by topic name, and small pure functions: `switchOf()`, `addressOf()`, `canonicalOf()`, `topicOrderOf()` and `noteOf()`.
- **The Hopper order (FR-003, S1.3, S2.4).** `storyOf()` takes an optional order. It groups the claims by topic as before, throws if the order names a topic with no claims, sorts the named topics first and the rest after in claim order, and only then numbers the receipts, so they still run in reading order. `Hopper.astro` passes `topicOrderOf(role)`. Experience and "On the side" only count Hopper's receipts, which the order doesn't change.
- **The hero's highlight (FR-002, S1.4, S5.2).** `Hero.astro` adds `hero__word--on` or `--off` to each word and `hero__row--lit` to the role's rows on a role page, and the note reads `noteOf(role)`. `hero.css` gives them their rest colors from the tokens. The sequence is unchanged: each word still lands from muted into its own rest color.
- **The switch (FR-005, S3.1–S3.3).** `HomePage.astro` renders spec 009's `RoleSwitch.astro` with `switchOf(role)` in a `ds-wrap` row under the header; `styles/home/roles.css` only spaces it.
- **Layout shift (S5.3).** The end-to-end tests measure each role page's layout shift. Lighthouse stays on `/v2`, since its SEO budget of 1 fails a noindex page.
- **Docs (FR-011).** D134–D136, the plan's 3.5 and 3.6 rows, and the decision log.

## Tests

`tests/014/`, written from the scenarios, not locked:

- `static/roles.test.ts`: `roles.ts`'s addresses, labels, titles, notes, switch links and canonical URLs; `storyOf()` with each role's order on the real claims (order, numbering, the same claims as with no order), with an order naming a missing topic (throws) and leaving one out (shown after); the hero and page sources passing the role; `release-pages.ts` and a planted dist; no script, inline style or motion added; the plan and decision log.
- `e2e/roles.test.ts`: on each built page, the section order, eyebrow, Hopper topic order, highlight colors and note, the claims and receipt numbers against `/v2`'s, Hopper first and VINDecoded in no heading, the résumé link, the switch's links, current mark and address, following a link and going back, the keyboard path and target size, titles, robots and canonical, no sideways scroll at 320, layout shift 0, the highlight's contrast, and no v1 page linking a role page.
- `e2e/a11y.test.ts`: axe on each role page in both themes at both sizes.
- `e2e/visual.test.ts`: the top of each role page at both sizes in both themes, and the switch with a link focused, made with `pnpm test:visual tests/014 --update` in the pinned container.
- Specs 010–013's tests and baselines, brought in line as the spec's "Changes to other specs" says.

## What exists today

- `RoleSwitch.astro`, built as links in spec 009, shown on the gallery.
- `hero.ts`'s `Role` type and `EYEBROW` per role, and `Hero.astro`'s `role` prop, from spec 010.
- `storyOf()` from spec 011, and the topic names in `claims.yaml`.
- `release-pages.ts` and the `BRADTHOME_RELEASE` flag, from spec 010.

## Alternatives considered

| Option                                        | Why not                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| An in-page switch with script                 | It needs a script and a state in the address, can't be shared as cleanly, and breaks with no JavaScript. |
| Three page files                              | Three copies of the same five lines; one dynamic route takes its roles from `roles.ts`.                  |
| Use the job and project files' `roles` orders | Every job before Hopper is Android and VINDecoded is always first, so they would order nothing (D134).   |
| A per-claim order for the Hopper story        | Topics are the story's units; ordering claims within a topic would split a topic's reading.              |
| Lighthouse on the role pages                  | Its SEO budget of 1 fails any noindex page, and `/v2` already measures the same page.                    |

## Risks

- **Specs 010–013's whole-page baselines** change, since the switch row moves everything under the header down. They're made again here.
- **A renamed Hopper topic** fails the build. That's deliberate.
- **Snapshots** come only from the pinned container, and `pnpm test:visual` breaks cost-guard's types until `pnpm install` runs again.

## Tasks

- T001 D134–D136, the plan rows, and the spec, plan and mocks for Gate 1, with the pages on the preview.
- T002 Tests in `tests/014/` from the scenarios, and specs 010–013's changed tests.
- T003 `roles.ts`, `HomePage.astro`, `[role].astro`, the hero and Hopper changes, `roles.css`, the canonical link and the release list, until the tests pass.
- T004 Snapshot baselines in the pinned container, and specs 010–013's remade where they moved.
- T005 Review with the pinned reviewer, then fix or answer each finding.
- T006 The pull request, marked ready, with the preview links.
