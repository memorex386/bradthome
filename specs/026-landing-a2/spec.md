# Spec 026: One receipts drawer per card (landing A2)

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                                                     |
| Status          | Approved                                                                                                                                                                                                                                                                                                 |
| Slice           | 5.2 One receipts drawer per card (direction A's slice A2)                                                                                                                                                                                                                                                |
| Branch          | `026-landing-a2`                                                                                                                                                                                                                                                                                         |
| Gate 1          | Approved by Brad on 2026-11-10, on the session's cards, every option as recommended                                                                                                                                                                                                                      |
| Mocks and flows | [mocks/README.md](mocks/README.md): the states this slice touches, and the motion it's checked against                                                                                                                                                                                                   |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                                                |
| Decisions       | [D208](../../docs/decisions/0208-one-receipts-drawer-per-card.md), from this slice. It amends [D118](../../docs/decisions/0118-direction-a-with-cs-numbered-evidence-receipts.md)'s receipts and spec 009's FR-006, and builds on D122, D126, D129, D133, D153 and specs 009, 011–013, 016, 017 and 025. |

## Summary

Today every claim on the home page carries its own receipt: a note in the margin on a desktop, and a full-width box under the claim on a phone. On a phone that's 23 boxes, 18 of which say the same "Ask me". On 2026-11-09 Brad chose the landing study's compact receipts (Q2): the numbered markers stay in the claims' words, and each card gathers its receipts in one drawer, a Receipts control beside its tags. The drawer lists each receipt's number, title, and either "Ask me" or its source's host as a link, and "Ask Brad about these" goes to Contact until A6. A marker opens its card's drawer and tints its row for a moment. It's a native disclosure, so it works with no script, and its motion is CSS. The phone page gets about 890 px shorter; a desktop page changes by under 2%.

## Scope

**In:**

- A design-system component for the drawer, `components/ds/Receipts.astro`, and its words and helpers in `components/ds/receipts.ts`. `ReceiptMarker.astro` links to its row.
- The cards that gather their receipts (T3): the Hopper story's role lines and its five topics (`Hopper.astro`), Bleacher Report, BookShout and Bottle Rocket (`Experience.astro`), and VINDecoded and Sudoku World (`Side.astro`). If the Hopper story ever shows quotes, they get one drawer too.
- `HopperClaim.astro` and `SideClaim.astro` keep the claim and its marker and lose the per-claim receipt. `Claim.astro` and `Receipt.astro`, the margin note, go.
- The drawer's CSS in `styles/ds/components.css`, and MA-12's motion, in CSS only.
- The gallery's receipts section, `/design-system`.
- Amended tests and baselines in specs 009, 011, 012, 013, 016 and 017, and new tests in `tests/026/`.
- `docs/plan.md`'s slice 5.2, and record D208.

**Out:**

- "Ask me" opening the chat (T9, MA-20): A6. Until then "Ask Brad about these" links `#contact`.
- The markers' entrance (MA-11) and the cards' hover light (MA-19 for cards): A4.
- Any new claim, figure, title or framing. Receipt titles stay `hopper.ts`'s, `experience.ts`'s and `side.ts`'s.
- Any change to the one module, the CSP or the receipts' numbering.
- A release.

## User stories and acceptance scenarios

The IDs in brackets are the study's states and the brief's items, listed in [mocks/README.md](mocks/README.md).

### Story 1: Each card holds its receipts in one drawer (P1)

A recruiter reading on a phone should read the claims straight through, with the evidence one tap away, not interleaved between every paragraph.

**Independent test:** count the drawers and their rows on `/` and each role page, and compare the numbers with the markers.

- **S1.1** Given `/`, then exactly these hold one drawer each, and nothing else does: the Hopper story's role lines, each of its five topics, Bleacher Report, BookShout, Bottle Rocket, VINDecoded and Sudoku World, 11 in all (T3). No per-claim receipt is left on the page.
- **S1.2** Given each drawer, then its rows are its card's receipts, one per marker, in the card's reading order, each showing the marker's number, the receipt's title, and either "Ask me" or one link per evidence URL whose text is the URL's host without `www.`.
- **S1.3** Given `/` and each role page, then the sequence of marker numbers, and of row numbers, is 1 to 23 in reading order, the same as before this slice on that page, and each marker's number, kind and claim match its row's.
- **S1.4** Given a drawer, then it's closed at load, and its control shows each receipt's number as a marker, the word "Receipts", and, from 48 rem wide, a summary: "Public link", "Public links", "No public link yet", "No public links yet", or "N with a public link · M to ask about".
- **S1.5** Given a card with tags, then the control sits in the tags' row, after the last tag and at the line's end, and wraps under the tags when there's no room. Given a card without tags, then the control is a full-width bar under the card's claims, above a hairline.
- **S1.6** Given an open drawer with any "Ask me" row, then it ends with a link "Ask Brad about it" (one) or "Ask Brad about these" (more) to `#contact`; a drawer whose receipts all have public links has none.
- **S1.7** Given a proof row's link, then it's the existing link preview (spec 016): hover or focus shows its card on a desktop, and a tap shows its sheet on a phone.
- **S1.8** Given the claims, then their words, markers and order don't change, and the claims' column is at most 56 rem wide.

### Story 2: A marker opens its drawer and points at its row (P1)

- **S2.1** Given a closed drawer, when the visitor follows a marker, then the drawer opens, the page scrolls its row into view about 40% down the screen, and the row tints with the accent's soft color (S07).
- **S2.2** Given motion allowed, then the row's tint fades out over 650 ms; given reduced motion, then the tint shows without fading while the row is the page's target (MA-12).
- **S2.3** Given the drawer's control, when the visitor clicks or taps it, or presses Enter or Space on it, then the drawer opens or closes, and the chevron turns.
- **S2.4** Given motion allowed in a browser that can animate a disclosure's size, then the drawer opens in 280 ms and the chevron turns in 240 ms; elsewhere, and under reduced motion, it opens at once and the chevron turns at once (MA-12, the brief's allowed difference).
- **S2.5** Given no script, then S2.1, S2.3 and S2.4 hold the same: the drawer, the marker's link and the tint use no script (S12).

### Story 3: A shorter phone page, an unchanged desktop (P1)

- **S3.1** Given `/` at 390 × 844 with every drawer closed, then the page is at least 800 px shorter than before this slice (10,497 px measured at `5f5ffbc`, so at most 9,697 px).
- **S3.2** Given `/` at 1280 × 800 and 1440 × 900, then the page's height is within 3% of before this slice (6,577 and 6,656 px at `5f5ffbc`).
- **S3.3** Given each role page, then S3.1 and S3.2 hold the same against its own height at `5f5ffbc`.

### Story 4: It still works for everyone (P1)

- **S4.1** Given `/`, a role page and `/design-system`, in either theme at desktop and phone sizes, with a drawer open and closed, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S4.2** Given each drawer's control and each row link, then it's at least 44 px tall and shows a 2 px accent focus ring; the control's name starts with "Receipts", and each row reads "Receipt N:" before its title.
- **S4.3** Given the band and the page, in either theme, then the control's text, the rows' titles, "Ask me" and the host links meet 4.5:1, and the markers keep their contrast (D118).
- **S4.4** Given reduced motion, then each card with its drawer closed and one open, at 1280 × 800 and 390 × 844 in light and dark, and the gallery's receipts section, match their committed snapshots in the pinned container (S01, S02, S03, S05).
- **S4.5** Given the page loading with its fonts still arriving, then the layout doesn't shift (S13), and Lighthouse's CI thresholds hold with `/`'s Cumulative Layout Shift at 0.
- **S4.6** Given the build, then the one module, the CSP and the inline scripts and styles are unchanged.

### Story 5: The design system shows the drawer (P2)

- **S5.1** Given `/design-system`, then its receipts section shows a card with two claims, their markers, tags and a closed drawer with one proof and one "Ask me" row, a card with no tags and its drawer open, and the markers' hover and focus states. The margin note is gone from it.

## Edge cases

- A card with one receipt: the summary is singular, and the ask link reads "Ask Brad about it".
- A receipt with two evidence URLs (VINDecoded's downloads, Sudoku World's apps): two host links, in the claim's order.
- A visitor follows a marker whose drawer is already open: the row tints again only if it wasn't already the target; nothing else changes.
- 200% zoom or 320 px wide: the control wraps under the tags, the rows wrap their links under their titles, and nothing scrolls sideways.
- A browser without `::details-content`: the drawer opens at once; the control still sits beside the tags, since its layout uses `display: contents`, which every current engine supports on `details`.
- An evidence URL that isn't a full URL fails the build, as `hostOf` throws.

## Functional requirements

- **FR-001** Every card in T3 MUST hold exactly one receipts drawer, and no claim may keep a per-claim receipt (D208, amending D118 and spec 009's FR-006).
- **FR-002** A drawer MUST be a native `details`, closed at load, whose control shows its receipts' numbers, "Receipts" and, from 48 rem, the summary of S1.4, and whose rows show each receipt's number, title, and "Ask me" or its evidence hosts as links.
- **FR-003** Each marker MUST link to its row, and following it MUST open its drawer and tint the row with no script.
- **FR-004** The drawer's motion MUST be MA-12's, in CSS, inside `prefers-reduced-motion: no-preference`; under reduce, everything is at its end at once.
- **FR-005** The words MUST be labels only: "Receipts", the summary, "Ask me", hosts and "Ask Brad about it" or "about these". The receipts' titles and numbers MUST NOT change.
- **FR-006** The phone page MUST be at least 800 px shorter, and each desktop page within 3%, as S3.x measure.
- **FR-007** The pages MUST meet WCAG 2.2 AA in both themes at both sizes, with 44 px targets and a visible focus ring.
- **FR-008** The change MUST add no script to the one module, no inline script or style, no CSP change and no request to another host.
- **FR-009** Specs 009, 011, 012, 013, 016 and 017's tests and baselines MUST be amended to match, and `tests/026/` MUST cover every ID here.
- **FR-010** `docs/plan.md` MUST show slice 5.2's state, and the decision log MUST hold D208.

## Success criteria

- **SC-001** 11 drawers on `/`, with 23 rows in all, numbered 1 to 23 as before, on `/` and each role page.
- **SC-002** The phone page at 390 px is at least 800 px shorter; each desktop page changes by under 3%.
- **SC-003** Every drawer opens with script off, from its control and from each of its markers.
- **SC-004** axe finds 0 violations, and layout shift is 0.
- **SC-005** The one module's size and the CSP are unchanged.

## Mocks and flows

The approved mock is the private landing study's "A · Refined" view with Receipts set to Drawer, which Brad reviewed on 2026-11-09. Nothing from it is copied here. [mocks/README.md](mocks/README.md) lists the states this slice touches and how each is checked, and the measured heights. Screenshots of the build at 390 and 1280, closed and opened from a marker, go to Brad with the Gate 1 cards.

## Decisions to record

- **D208** Compact receipts: one drawer per card, numbers inline (amends D118's per-claim notes and spec 009's FR-006). With it, the choices below.

On Brad's Gate 1 cards (2026-11-10): the claims' column caps at 56 rem, not the study's 46, which would make the desktop page 3.7% longer; the phone control shows its numbers and "Receipts" without the summary, so it fits beside the tags; and a marker is a link that scrolls its row about 40% down the screen, with no script, not the study's script that opens in place. Tier 3: the row's tint uses the accent's soft color, and the band's own soft blue.

## Changes since approval

- Changed in spec 033 (slice 5.8), on 2026-11-11: the home has a twelfth card, bradthome.com's, with four more receipts ([D217](../../docs/decisions/0217-bradthome-com-gets-a-small-card-with-build-time-counts.md)). S3.1–S3.3's page heights measure the drawers' saving, so the test takes the new card's height, and the gap before it, out of each page's height; the card and receipt counts include it. Brad approved it with spec 033 at its Gate 1.
