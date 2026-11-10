# Plan 026: One receipts drawer per card (landing A2)

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

For approval with [spec.md](spec.md) at Gate 1.

## Approach

No script at all. The drawer is a `details` element, and a marker is a link to its row, so a browser opens the drawer when the link is followed, as today's margin notes already rely on. The row's tint is `:target`. The study's drawer used script to open without moving the page; the link version scrolls the row into view instead, which also works with no script and leaves the one module unchanged.

To put the control beside the tags without script, the drawer's `details` and the tags' list take `display: contents` inside one wrapping flex row: the tags, then the control at the line's end, then the drawer's content on a line of its own. Chromium, Firefox and WebKit lay this out the same (checked on their current Playwright builds on 2026-11-10), and all three open a closed `details` when a link targets a row inside it.

A spike of this plan, measured on the build at reduced motion: `/` at 390 × 844 goes from 10,497 to 9,606 px (891 shorter); at 1280 × 800 from 6,577 to 6,691 (+1.7%); at 1440 × 900 from 6,656 to 6,770 (+1.7%). Each role page measures the same.

| Part    | Where                                                                        | How                                                                                                                                                                                                                                                                                                                                   |
| ------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T3      | `components/ds/Receipts.astro`, `components/ds/receipts.ts`                  | Props: the card's receipts (id, number, kind, title, evidence), with the tags in a `tags` slot. `summaryOf`, `askOf`, `hostOf` and `rowIdOf` live in `receipts.ts`, unit-tested. Rows are an `ol`, each `li`'s `value` its number and its id `receipt-<claim id>`. Proof rows use `PreviewLink`, so spec 016's previews keep working. |
| Markers | `components/ds/ReceiptMarker.astro`                                          | `href="#receipt-<claim id>"`, the row, instead of the old note's body.                                                                                                                                                                                                                                                                |
| Cards   | `Hopper.astro`, `Experience.astro`, `Side.astro`, `HopperClaim`, `SideClaim` | Each card renders its claims, then `<Receipts>` with its tags slotted in. Hopper's role lines get a drawer under them, and its quotes would get one. `Claim.astro` and `Receipt.astro` go, and `hopper.ts`'s `RECEIPT` words with them.                                                                                               |
| Layout  | `styles/ds/components.css`                                                   | One wrapping flex row; the control `margin-left: auto`; the content `flex: 1 0 100%`. A card without tags gets a full-width bar under a hairline. The claims cap at 56 rem. Under 48 rem the summary hides. In the band, the drawer takes the band's rule, muted and accent colors.                                                   |
| MA-12   | `styles/ds/components.css`                                                   | Inside no-preference: the chevron's 240 ms turn, a 650 ms tint-out on the `:target` row, and, inside `@supports (interpolate-size: allow-keywords)`, a 280 ms height on `::details-content`. Under reduce, the row's tint is held and nothing moves.                                                                                  |
| Gallery | `pages/design-system.astro`                                                  | The receipts section shows a tagged card with a closed drawer, an untagged card with its drawer open, and the markers' hover and focus states.                                                                                                                                                                                        |
| Docs    | `docs/plan.md`, D208's record, the decision log                              | Slice 5.2's state, and D208.                                                                                                                                                                                                                                                                                                          |

## Tests first

`tests/026/` holds the new tests, traced to every ID in the spec:

- `unit/receipts.test.ts`: `summaryOf`, `askOf`, `hostOf` and `rowIdOf` (S1.2, S1.4, S1.6).
- `static/receipts.test.ts`: the cards render one `Receipts` each and no `Claim` or `Receipt`; the marker links its row; MA-12's rules sit inside no-preference; no script was added (S1.1, FR-003, FR-004, FR-008).
- `e2e/receipts.test.ts`: the drawers and rows on `/` and each role page against the markers (S1.x), a marker opening and tinting its row (S2.x), no script (S2.5), the heights (S3.x), targets and names (S4.2), contrast (S4.3), layout shift (S4.5), the module and CSP (S4.6), and the gallery (S5.1).
- `e2e/a11y-visual.test.ts`: axe with drawers open and closed, and the snapshots (S4.1, S4.4).

Amended, each with this spec named in a comment:

- Spec 009: the gallery's receipts tests and baselines, and the static checks for `Receipt` and the margin grid.
- Specs 011, 012 and 013: the receipt counts, kinds and links move from per-claim notes to drawer rows; the margin-placement tests go; the receipt baselines show a card with its drawer open; every home baseline is remade.
- Spec 016: the preview tests open a drawer row instead of a note.
- Spec 017: the ask links are the drawers' "Ask Brad about …" links.

## Risks

- Every home baseline changes again, remade in the pinned container with `pnpm test:visual --update`, each diff looked at before it's kept. Spec 025's hand-over warns that element shots with a rounded card edge can differ by a few pixels in CI.
- `display: contents` on `details` is recent in some engines; if one drops it, the control falls under the tags, which still works.
- The phone target leans on the control sitting beside the last tag; a card whose tags grow could lose a line.

## Decisions

D208, in [spec.md](spec.md). The tier-3 details are listed there and in the commit.
