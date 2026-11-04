# Plan for spec 010: The hero

|        |                                                           |
| ------ | --------------------------------------------------------- |
| Spec   | [spec.md](spec.md), approved with this plan at Gate 1 on 2026-11-04 |
| Status | Approved                                                  |

## Approach

The new home grows at `/v2` on the design system's layout, beside v1's home (D121, D127). This slice adds its hero and leaves room for 3.3–3.5's sections under it.

- **The hero (FR-002, FR-003, FR-006, S1.1–S1.4, S4.2, S5.2).** `components/home/Hero.astro` assembles the design system's eyebrow, buttons and chips with the hero's own heading, lines and "End to end" card. Its words, actions and facts live in `hero.ts`, so 3.6's role pages pass a role and get their eyebrow, and 3.3 and 3.7 each change one link.
- **The motion (FR-004, FR-005, S2.1–S2.5, S3.1).** `styles/home/hero.css` lays the hero out at rest, then holds every keyframe and animation in one no-preference block at the end, which is spec 003's rule as D122 amended it. The keyframes animate only from a start state to the element's own colors: the words from muted gray and 0.12 em low, the lines, buttons and chips from 10 pixels low, the rows' lit accent in the middle. With `animation-fill-mode: both`, each part waits in its readable start state until its delay, so the first frame is readable (D126) and the end state is exactly the reduced-motion page. Pure CSS plays once per load and needs no script.
- **Facts (FR-007, S5.1).** Each chip and row in `hero.ts` names its claim IDs and terms. `Hero.astro` looks each claim up with `getEntry` while it builds and throws on a missing one. The content schema already refuses a claim that isn't public (spec 005), and a static test checks the terms against `claims.yaml`.
- **The page (FR-001).** `pages/v2.astro`: the skip link, the design system's header with one section, the hero, the stub `#hopper` section and the footer. It turns `DesignBase`'s noindex off (S6.3).
- **Release (FR-008, S6.1).** `scripts/site/release-pages.ts` is an Astro integration. When `BRADTHOME_RELEASE=1`, its `astro:build:done` hook removes `v2.html` and `design-system.html` from the build. `release.yml`'s build step sets the flag. The CSP header in `firebase.json` stays the union of every page's hashes, so the release's header allows a little more than its pages use, never less.
- **Lighthouse (FR-009, S2.5, S6.3).** `lighthouserc.json` adds `/v2.html`. Spec 003's locked test reads only the budgets and settings, which don't change. LHCI can't give one page a tighter budget without `assertMatrix`, which that test would refuse, so `scripts/ci/site-report.ts` adds `PAGE_BUDGETS`: after LHCI's own assertions, it reads each run's report and fails when `/v2`'s median Cumulative Layout Shift is above 0. That's the reviewer's first finding.
- **v1 (FR-010, S6.2).** v1's `tokens.css` gains `@source not` lines for the hero's folders and page. The build already shows v1's stylesheet is still `Base.BKbT8vcy.css`, and the design system's stylesheet is unchanged too.
- **Docs (FR-012).** The plan's 3.2 row, AGENTS.md's repo map, and `docs/release.md` on what a release leaves out.

## Tests

`tests/010/`, written from the scenarios before the remaining build, not locked:

- `static/hero.test.ts`: the words and lines, the eyebrow per role, every fact against `claims.yaml`, the timings parsed from `hero.css`, motion only inside the query and only on color and transform, no loop, and no script.
- `static/release.test.ts`: `dropPhase3Pages` on a temporary build, `release.yml`'s flag on its build step alone, Lighthouse's list, v1's `@source not` lines, and the docs.
- `e2e/hero.test.ts`: the page at both sizes, the first frame with motion on (opacity, filter and contrast), the computed delays and durations, no running animation after 2.7 s, layout shift through the sequence, reduced motion at rest, the buttons' targets and sizes, and keyboard order with rings.
- `e2e/a11y.test.ts`: axe in eight states.
- `e2e/visual.test.ts`: four whole-page baselines and two focus baselines, made with `pnpm test:visual tests/010 --update` in the pinned container.

## What exists today

- `components/ds/` and `styles/ds/`: the design system, from spec 009, used as is.
- `layouts/DesignBase.astro`: the layout, with noindex on by default.
- `content/claims.yaml` and the content schemas, from spec 005.
- `lighthouserc.json`, spec 003's budgets, and the e2e setup in the pinned container.

## Alternatives considered

| Option                                                      | Why not                                                                                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Put the hero's CSS in `styles/ds/components.css`            | Spec 009 caps the design system's motion at 240 ms, and the hero needs 650 ms words and a 2.7 s sequence.                                                     |
| A React island with Motion for the sequence                 | It ships script for something CSS does, and needs a CSP exception. The extras it would allow, ending on a click and once per visit, aren't needed for Gate 2. |
| The new home at `/` behind a build flag                     | Specs 003 and 007's locked tests and snapshots read `/`, so CI would need two builds (D127).                                                                  |
| Hide phase 3 pages with a meta noindex only                 | A v1.x release would put them on live (D127).                                                                                                                 |
| Lighthouse's `assertMatrix` to relax SEO on a noindex `/v2` | Spec 003's locked test reads the single `assertions` block, so it would need a relock.                                                                        |

## Risks

- **Font swap shifts the heading.** Inter Tight loads after the first paint; its fallback is size-adjusted, but a 104-pixel word can still move a pixel. The layout-shift test catches it, and the fix is a tighter fallback.
- **Lighthouse's best-practices or performance scores on `/v2`.** Its three font preloads and inline styles match the gallery's, which has no Lighthouse run yet. The first CI run will tell, and the fix stays inside this slice.
- **Snapshots that catch a frame mid-sequence.** The e2e config already runs with reduced motion and disabled animations, so the baselines show the page at rest.

## Tasks

- T001 Records D124–D128 and the index. Done.
- T002 The page, the hero, its facts and styles, and the release integration, built far enough to be the Gate 1 mock. Done.
- T003 Mocks: screenshots in `mocks/`, and the preview link. Done.
- T004 Gate 1. Approved.
- T005 Tests from the scenarios, in `tests/010/`.
- T006 Finish the build until every test passes, with `pnpm csp` and Lighthouse's list.
- T007 Snapshot baselines in the pinned container.
- T008 Docs: plan, AGENTS.md, release runbook.
- T009 Review with the pinned reviewer; fix or answer each finding.
- T010 Mark the pull request ready, and report for Gate 2.

## Decisions

[D124](../../docs/decisions/0124-the-heros-words-are-take-3-from-the-hero-study.md) the words, [D125](../../docs/decisions/0125-the-hero-plays-at-the-story-pace.md) the pace, [D126](../../docs/decisions/0126-the-heros-text-is-readable-from-the-first-frame.md) the first frame, [D127](../../docs/decisions/0127-the-new-home-shows-at-v2-and-stays-off-live.md) `/v2` and the release flag, and [D128](../../docs/decisions/0128-the-heros-buttons-link-a-stub-and-linkedin-until-their-slices.md) the buttons' targets.
