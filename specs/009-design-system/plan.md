# Plan for spec 009: The design system

| | |
| --- | --- |
| Spec | [spec.md](spec.md), for approval with this plan at Gate 1 |
| Status | Draft |

## Approach

The design system sits beside v1, not on it (D119). Its tokens, components, layout and gallery are new files, and v1's `tokens.css`, `site.css`, `essay.css` and `Base.astro` are untouched except for one block in `tokens.css` that keeps the design system's files out of v1's Tailwind sources (FR-008, S5.1).

- **Tokens (FR-001, FR-010, S1.1–S1.3).** `styles/ds/tokens.css` imports Tailwind with `source(none)`, adds the design system's own files as sources, and defines `@theme static` variables. Colors are `light-dark()` pairs taken from Home v2, so `color-scheme` picks the theme: the device's by default, or the gallery's switch. The type scale, spacing, radii, shadows and motion follow Home v2's values.
- **Fonts (FR-002, S1.4).** Inter Tight and JetBrains Mono join Charis SIL and Inter in `astro.config.mjs`, from `@fontsource-variable/inter-tight` and `@fontsource-variable/jetbrains-mono` 5.3.0. Only `DesignBase.astro` preloads them. Their fallbacks are computed with the same capsize method Astro uses, and checked against Inter's existing numbers.
- **Components (FR-003–FR-007, FR-011, FR-012).** One Astro component per part in `components/ds/`, styled by `styles/ds/components.css` with plain classes over the tokens. Nothing ships script: links for the role switch, `details` for the receipts and the phone menu. Every transition is in one no-preference block at the end of the file.
- **Gallery (FR-009, FR-013).** `/design-system`, on `DesignBase.astro`, with its own `gallery.css`. Its theme switch is three radio buttons that set `color-scheme` through `:has()`.
- **`next` (FR-014, S6.1, S6.2).** `.github/workflows/next.yml` runs on pushes to main: build, then deploy with the preview's sign-in script and a new `scripts/ci/next-deploy.ts`, which deploys the channel `next` with the noindex config and a 30-day expiry. The preview's own files don't change, so spec 003's locked preview tests still hold.
- **Spec 003 (FR-015, S7.1).** Its S1.5 text and the static motion check change as D120 says: the check strips each no-preference reduced-motion block before it looks for motion. Then `pnpm lock` rewrites `tests.lock`.
- **Docs (FR-017).** AGENTS.md's workflow list, `docs/release.md`'s v1.x path and `docs/plan.md`'s slice 3.1 row.

## What exists today

- `apps/site/src/layouts/Base.astro`, `styles/tokens.css`, `styles/site.css` and `styles/essay.css`: v1's layout and styles, which stay.
- `apps/site/astro.config.mjs`: the Fonts API config with Charis SIL and Inter.
- `.github/workflows/preview.yml` and `scripts/ci/preview-*.ts`: the per-pull-request preview and its keyless sign-in.
- `tests/003/static/site.test.ts`: the locked motion check that D120 amends.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Restyle v1's pages with the new tokens now | Brad chose to keep v1 as released (D119). |
| A React island with toggle buttons for the role switch, as on the board | It ships script, and each role is its own page from 3.6, so links fit better. |
| A script that opens receipts and syncs margin notes on hover | The native disclosure covers opening, the keyboard and the marker's link, with no script. |
| Separate light and dark variable blocks | `light-dark()` keeps each color's pair in one line, and lets the gallery switch themes by `color-scheme` alone. |
| Reuse `preview-deploy.ts` for `next` | Its locked tests fix it to `pr-N` channels and a 7-day expiry; a small new script leaves them alone. |

## Decisions

- [D116](../../docs/decisions/0116-direction-a-with-cs-numbered-evidence-receipts.md) the look, [D117](../../docs/decisions/0117-main-deploys-to-the-next-channel-on-every-push.md) `next`, [D118](../../docs/decisions/0118-v1-x-fixes-ship-from-main-which-stays-releasable.md) v1.x fixes, [D119](../../docs/decisions/0119-v1s-pages-keep-todays-look-until-the-redesign-replaces-them.md) v1's look, and [D120](../../docs/decisions/0120-motion-only-when-the-visitor-hasnt-asked-for-less.md) the motion rule.

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A dependency bump changes v1's built stylesheet | Medium | S5.1 checks it holds nothing from the design system; SC-003's file name is recorded for this branch only. |
| Snapshot baselines can't be made without Docker | Medium | Docker Desktop is started for `pnpm test:visual --update`; CI's e2e job is the backstop. |
| The preview's sign-in refuses a push event | Low | Spec 003's evidence shows the binding names the repo only. The first push to main proves it; the workflow is outside the gate. |
| A browser doesn't open a disclosure on a link | Low | The receipt still scrolls into view, and opens with a tap. |

## Tests to write

| ID | Test file | Test name includes |
| --- | --- | --- |
| S1.1, S1.2, FR-001, FR-010, SC-001 | `tests/009/static/tokens.test.ts` | `S1.1`, `S1.2`, `FR-001`, `FR-010`, `SC-001` |
| S1.4, FR-002 | `tests/009/static/tokens.test.ts`, `tests/009/e2e/gallery.test.ts` | `S1.4`, `FR-002` |
| FR-003–FR-007, FR-012, FR-013, S5.1, S5.2, FR-008, FR-009 | `tests/009/static/components.test.ts` | each ID |
| S6.1, S6.2, FR-014 | `tests/009/static/next.test.ts` | `S6.1`, `S6.2`, `FR-014` |
| S7.1, FR-015 | `tests/009/static/spec-003.test.ts` | `S7.1`, `FR-015` |
| FR-017 | `tests/009/static/docs.test.ts` | `FR-017` |
| S1.3, S2.1–S2.6, S3.1–S3.5, S4.1, S4.2, S4.5, SC-004, FR-011 | `tests/009/e2e/gallery.test.ts` | each ID |
| S4.3, SC-002, FR-016 | `tests/009/e2e/a11y.test.ts` | `S4.3`, `SC-002`, `FR-016` |
| S4.4 | `tests/009/e2e/visual.test.ts` | `S4.4` |
| S5.1, S5.3, SC-003 | `tests/009/e2e/v1.test.ts` | `S5.1`, `S5.3`, `SC-003` |

## Tasks

- [x] **T001** Record D116–D120 (Gate 1 inputs).
- [x] **T002** Prototype the tokens, fonts, components and gallery for "Show it".
- [ ] **T003** Write `tests/009/` from the scenarios.
- [ ] **T004** Amend spec 003's S1.5 and its check, and relock (FR-015).
- [ ] **T005** Finish the build until every test passes (FR-001–FR-013).
- [ ] **T006** Add the `next` workflow and script (FR-014).
- [ ] **T007** Make the snapshot baselines in the pinned container (S4.4).
- [ ] **T008** Update AGENTS.md, `docs/release.md` and `docs/plan.md` (FR-017).
- [ ] **T009** Review with the pinned reviewer, fix or answer each finding, and mark the pull request ready.

## Preview and rollback

This pull request's preview serves the gallery at `/design-system`. After the merge, `next` serves main. Nothing here reaches live until a release, and a v1.x release from main would serve the gallery unlinked and with `noindex` (D118). To undo it, revert the merge: v1's pages never depended on it.

## Approval

- Gate 1: waiting for Brad.
