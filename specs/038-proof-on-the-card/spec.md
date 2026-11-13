# Spec 038: Proof on the card, and a sparkle to ask about any claim

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Track           | Full                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Status          | Approved                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Slice           | 5.11 Proof on the card (Brad's picks of 2026-11-13, from the private receipts study)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Branch          | `038-proof-on-the-card`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Gate 1          | Approved by Brad on 2026-11-13, on the session's cards, every option as recommended                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Mocks and flows | [mocks/README.md](mocks/README.md): every state, captured from this slice's own build                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Decisions       | D229–D231, from this slice. D229 amends [D118](../../docs/decisions/0118-direction-a-with-cs-numbered-evidence-receipts.md), [D208](../../docs/decisions/0208-one-receipts-drawer-per-card.md), [D211](../../docs/decisions/0211-sections-reveal-their-evidence-once.md)'s marker pop, [D217](../../docs/decisions/0217-bradthome-com-gets-a-small-card-with-build-time-counts.md)'s height rule (on Brad's card after the build), and [D218](../../docs/decisions/0218-the-design-system-gallery-is-linked-from-one-receipt.md)'s and [D219](../../docs/decisions/0219-the-capital-one-card-follows-linkedin-with-its-first-receipt.md)'s receipts. D230 amends [D213](../../docs/decisions/0213-ask-me-opens-the-chat.md). D231 removes the charter's first product principle, from [D35](../../docs/decisions/0035-purposeful-motion.md). It builds on D122, D129, D133, D153, D173, D188, D193, D194 and D228. |

## Summary

On 2026-11-13 Brad reviewed the receipts study and picked direction 2, proof on the card. Today every claim on the home and role pages carries a numbered dot, and each card gathers its dots in a drawer. Of the 30 dots, 20 lead to "Ask me", including 14 of the Hopper band's 15, and seven drawers say "No public link yet". The 10 receipts with a link hold 13 distinct public sources, and four of them repeat a link their card already shows.

The dots and drawers go. A stat with a public source links it, with its host under the label: Bleacher Report's 10M+ to its Google Play listing, and VINDecoded's 1M+ and 400K+ to Google Play and the App Store. Any other source shows under its card's claims as a labeled link with its host: the Capital One card's two, and bradthome.com's four. The cards keep their own links, and a source a card already links isn't listed again, so all 13 sources show at rest and each opens in one tap. A claim with no public link reads as plain text.

Each of the 30 claims ends with the Ask button's sparkle. A tap opens Ask about Brad with the claim's words in its box, unsent, through the hand-over "Ask me" uses today (D213); with no script it reaches the contact section (D153). Each claim keeps the anchor its receipt had, `#receipt-<claim id>`, so `/corpus.json`, `/llms.txt`, the deployed chat API and every answer already given keep landing on the claim, which tints for a moment. The charter's first product principle, "Every claim links to its evidence", comes out.

## Scope

**In:**

- The cards: `components/home/` (`Hopper.astro`, `HopperClaim.astro`, `Experience.astro`, `experience.ts`, `Side.astro`, `SideClaim.astro`, `side.ts`, `hopper.ts`, a new `sources.ts`), and `reveal.client.ts`'s marker step.
- The design system: new `ClaimAsk.astro`, `ClaimText.astro`, `Sources.astro`, `proof.ts` and `endOf.ts`; `Stats.astro`'s linked stat; `Receipts.astro`, `ReceiptMarker.astro` and `receipts.ts` retired; `styles/ds/components.css`, `tokens.css` and `gallery.css`; the gallery's "Evidence receipts" section, now "Proof on the card".
- The evals: the 20 kept cases, the 6 retired, the 10 new, and a changed run of the new ones (D193, D228).
- The charter's product principles, `docs/plan.md`'s slice 5.11, records D229–D231, and the words a visitor reads anywhere that name dots, drawers or "Ask me".
- Amended tests and baselines in the specs that pin markers, drawers or "Ask me", and new tests in `tests/038/`.

**Out:**

- The words of the claims, the stats and the card links, which don't change.
- The hero tiles' detail (spec 036): its label is "Proof", and it keeps its three quoted claims and its "Ask about this".
- `/corpus.json`, `/llms.txt`, the chat API and its redeploy, the chat's prompt and model, the résumé PDFs, the CSP and the analytics events.
- A release. The slice lands on main and `next`; bradthome.com changes only through a release on Brad's go-ahead.

## User stories and acceptance scenarios

The state IDs in brackets are the captures in [mocks/README.md](mocks/README.md).

### Story 1: Proof shows on the card (P1)

A recruiter skimming on a phone should see a claim's proof where it is, without opening anything, and never read that something has no public link.

**Independent test:** open `/` and each role page with no script, and read every card's stats, sources and links.

- **S1.1** Given `/` or a role page, then no claim carries a numbered marker, no card has a Receipts drawer, and the page holds no "Ask me", "Ask Brad about it", "Ask Brad about these", "No public link yet" or "No public links yet" (M1–M4, M8).
- **S1.2** Given Bleacher Report's and VINDecoded's cards, then 10M+ links its Google Play listing, 1M+ its Google Play listing and 400K+ its App Store listing, each with its host and an outside-link mark under the label, and a tap anywhere on the stat opens it (M2, M3).
- **S1.3** Given the Capital One card, then under its claims and before its tags a "Sources" list links the 2024 travel-blog post and Hopper Technology Solutions' March 2026 release, each with its label, its host and an outside-link mark (M1).
- **S1.4** Given bradthome.com's card, then under its claims and before "Read the source on GitHub" a "Sources" list links the design system, the working agreement, a release's record and the latest eval run, each with its label and host; the two on this site go by their paths and carry no outside-link mark (M4). On Brad's card after the build, the list may make the card taller than VINDecoded's, and the card less its list stays no taller (amending D217).
- **S1.5** Given VINDecoded's and Sudoku World's cards, then they list no sources, since their stats and links already show every one: vindecoded.com, the case study, both stores and sudokuworld.app (M3).
- **S1.6** Given `/` at rest, then the stats, sources and card links hold all 13 distinct public sources of the claims, each linked once on its card.
- **S1.7** Given a claim with no public link, then it reads as plain text that ends with its sparkle, with nothing that says it lacks a link.

### Story 2: Ask about any claim (P1)

A reader who wants more on any claim should reach Ask about Brad with that claim's words in one tap, and spend nothing until they send.

**Independent test:** on `/`, use each sparkle with a mouse, a tap and the keyboard, and with no script.

- **S2.1** Given `/` or a role page, then each of the 30 claims ends with one sparkle, the Ask button's mark, kept on the line of the claim's last word (M1–M4).
- **S2.2** Given a sparkle, when the visitor clicks, taps or presses Enter on it, then Ask about Brad opens in Ask mode with "Tell me more about this: “{the claim's words}”" in its box, focused and unsent, and closing it returns focus to the sparkle (M6).
- **S2.3** Given a claim written as a lead and a list, then its question holds the lead and the list's items, joined by "; ".
- **S2.4** Given a sparkle, then its accessible name is "Ask about this: {the claim's title}", which holds its tooltip's words and tells the 30 apart.
- **S2.5** Given a pointer that hovers, when it rests on a sparkle, then the sparkle takes the accent on a soft disc and "Ask about this" shows above it; given keyboard focus, then the same, with a 2 px ring around the disc (M5).
- **S2.6** Given no script, or a window that can't load, when a sparkle is used, then it goes to the contact section (M9).
- **S2.7** Given a modified click (Ctrl, Cmd, Shift, Alt or a middle click), then the browser's own behavior runs and the chat doesn't open.
- **S2.8** Given every page width from 320 to 1440 px, then each sparkle's target is 44 × 44 px (Brad's Gate 1 card), no two sparkles' targets overlap, and a claim's line height is the same as without its sparkle.
- **S2.9** Given either theme, then a sparkle at rest keeps 3:1 or more against its background: the page, a card, a highlighted card and the dark band.

### Story 3: Every link to a claim still lands on it (P1)

A source link in a chat answer, or in the public corpus, should still take the reader to its claim.

**Independent test:** open `/#receipt-<claim id>` for claims in each section, with motion allowed and reduced, and compare the built corpus with live's.

- **S3.1** Given `/` or a role page, then each of the 30 claims carries the id `receipt-<claim id>`, and no other element does.
- **S3.2** Given a link to `/#receipt-<claim id>`, then the page opens with that claim about 40% down the screen, clear of the sticky header, and the claim tints (M7).
- **S3.3** Given motion allowed, then the tint fades over 1,600 ms; given reduced motion, then the tint shows, still, while the claim is the target.
- **S3.4** Given the build, then `/corpus.json` and `/llms.txt` are byte for byte those v2.8.0 serves, so the chat API needs no redeploy.

### Story 4: Asking stays checked (P2)

Every question a sparkle can ask should have an eval case, and the run that checks the new ones should pass.

**Independent test:** compare the eval cases with the built page's questions, and read the changed run's results.

- **S4.1** Given the built `/`, then its 30 sparkles ask 30 distinct questions, and each is exactly one facts case's question, citing its claim.
- **S4.2** Given the cases, then the 20 that "Ask me" asked keep their words, ids and hashes, the 6 drawers' cases are gone, and 10 new cases ask about the claims with public links.
- **S4.3** Given a push to `evals/038-proof-on-the-card`, then the changed run asks the cases new since the last full run, the 10 new ones and spec 036's three tile cases, and passes, with the chat's prompt and model unchanged.

### Story 5: The record says what the site does (P2)

The charter, the gallery and the docs should match the page.

**Independent test:** read the charter, the gallery and the docs a visitor reads.

- **S5.1** Given the charter, then its product principles no longer hold "Every claim links to its evidence", the other five are numbered 1 to 5, and its changes list D231.
- **S5.2** Given `/design-system`, then "Proof on the card" shows a card with a linked stat, sources and sparkles, the sparkle's, stat's and source's hover and focus, a claim tinted as a link lands on it, and the same parts in the band, in both themes (M10).
- **S5.3** Given the site's pages, the essay, the hero's words and the gallery, then nothing a visitor reads promises numbered dots, drawers or "Ask me". The README describes the live site, so it changes with the release that brings this slice to bradthome.com (D216).

### Story 6: It still moves only as asked (P2)

- **S6.1** Given motion allowed, then the claims' sparkles don't pop as the markers did, and no drawer opens or turns its chevron; the only new motion is MA-27 and MA-28.
- **S6.2** Given any motion, then it sits inside the no-preference query (D122), and the page's layout shift stays 0 while it loads and scrolls.

## Requirements

- **FR-001** The home and role pages MUST show no numbered marker, receipts drawer, "Ask me", "Ask Brad about it" or "about these", or "No public link" line; `Receipts.astro`, `ReceiptMarker.astro` and `receipts.ts` MUST be gone.
- **FR-002** A stat MUST link a source only when its look names its claim and a host, and the link MUST be the one URL on that host in that claim's evidence, with the claim on the same card; anything else MUST fail the build. A linked stat MUST show its host under its label, with an outside-link mark when it leaves the site, and its link's box MUST cover the stat.
- **FR-003** Each card MUST list under its claims, before its tags and links, each of its claims' evidence URLs that its stats and card links don't already link, once each, in claim order, as a link holding its label and host, with an outside-link mark when it leaves the site and its path when it doesn't. A listed source with no label MUST fail the build. The six labels, on Brad's Gate 1 card, are the study's drafts with the working agreement's in its claim's words: "The offer card, in a 2024 travel-blog post", "Hopper Technology Solutions, March 2026", "The design system", "Each feature starts as a spec Brad approves", "A release's written record" and "The latest eval run, case by case".
- **FR-004** The cards' own links (vindecoded.com, "Read the case study", sudokuworld.app and "Read the source on GitHub") MUST stay as they are.
- **FR-005** Each claim MUST end with a sparkle: a link to `#contact` holding the sparkle icon, with `data-chat-ask` set to "Tell me more about this: “{the claim's words}”", its words on one line, and the accessible name "Ask about this: {the claim's title}". It MUST stay with the claim's last word.
- **FR-006** A sparkle's target MUST be 44 px square (Brad's Gate 1 card), its icon MUST keep 3:1 or more at rest on every background it sits on, in both themes, and it MUST take the accent on hover and focus, with "Ask about this" in a CSS tooltip and a focus ring. It MUST NOT change the line height of its claim, and no two sparkles' targets may overlap.
- **FR-007** Each claim MUST carry the id `receipt-<claim id>`, land about 40% down the screen when targeted, and tint while it is the target; with motion allowed the tint MUST fade (MA-28).
- **FR-008** The drawer's motion (MA-12) and the markers' pop (MA-11) MUST go, and the sparkles MUST NOT pop (Brad's Gate 1 card). MA-27 (the sparkle's color, disc and tooltip) and MA-28 MUST run only with motion allowed, and layout shift MUST stay 0.
- **FR-009** The eval cases MUST hold one facts case per sparkle question, citing its claim (or, for VINDecoded's platform claim, `vindecoded-2`, its claim, the VINDecoded project or the essay's product section, which all describe the platform, on Brad's card after the first changed run cited the essay twice with a supported answer): the 20 "Ask me" cases unchanged, the 6 drawers' cases removed and 10 new cases. Spec 030's check that the cases match the built page's questions MUST read the sparkles. A changed run (D228) MUST pass, with the prompt and model unchanged.
- **FR-010** The charter's first product principle MUST be removed and the others renumbered, in a record that cites Brad's card. Records that quote it stay as history.
- **FR-011** The gallery MUST show the new parts in place of "Evidence receipts", and no text a visitor reads may promise dots, drawers or "Ask me".
- **FR-012** `/corpus.json`, `/llms.txt`, the résumé PDFs, the CSP, the analytics events, the chat API, the hero tiles' detail and the role pages' topic order MUST NOT change, and the one module MUST NOT grow.
- **FR-013** The slice MUST record D229–D231, add slice 5.11 to `docs/plan.md`, note the change in specs 009, 026 and 030, and update every test and baseline that pinned a marker, drawer or "Ask me".

## Success criteria

- **SC-001** On `/` and each role page: 0 markers, 0 drawers, 30 sparkles and 30 `receipt-` anchors (live today: 90 markers in 12 drawers).
- **SC-002** On `/` at rest, the 13 distinct public sources are linked: 6 listed, 3 stats and 4 card links.
- **SC-003** The one module is no larger than main's 13,039 bytes.
- **SC-004** Cumulative layout shift is 0 on `/` while it loads and scrolls, and lighthouse's budgets still pass.
- **SC-005** The changed eval run passes each of its cases.
- **SC-006** No automated accessibility violation on `/`, the role pages and the gallery, in both themes.
- **SC-007** `/corpus.json` and `/llms.txt` are byte for byte live's.

## Edge cases

- A claim written as a lead and a list (VINDecoded's case study counts): its sparkle ends the last item, and its question joins the list with "; ".
- A claim ending in a long word: the sparkle stays with it, and the line wraps before the word instead.
- A sparkle near the right edge: its tooltip ends at the sparkle, so it never reaches past the screen.
- A stat's host held twice, or not at all, by its claim's evidence; a stat whose claim isn't on its card; a listed source with no label: the build fails.
- A card link written as a path (`/vindecoded-agents`) and its claim's evidence as a full URL: they match, so the source isn't listed twice.
- bradthome.com's card with its four sources is taller than VINDecoded's at every width (by 305 px at 320, 97 px at 1280); spec 033's height check measures it without its sources list.
- The chat open when a source link in it is followed: the page scrolls behind the chat to the claim, which tints, and the chat stays open.
- A claim the hero's detail also quotes: the detail keeps its own words and no anchor, so ids stay unique.

## Tier-3 choices, inside this spec

- The sparkle's name holds its tooltip's words, "Ask about this: {title}", rather than the brief's "Ask about: {title}", so a voice user who says what they see reaches it (WCAG 2.5.3).
- A source on this site (the design system, the eval run) goes by its path, so a preview or `next` stays there, and carries no outside-link mark, since it doesn't leave the site.
- The stat's and sources' outside links keep their preview cards (spec 016), as the drawer's sources did.
- The claims' titles, which named the receipts, now name the sparkles; their words don't change.
- The band's sparkle takes a new token, `--color-band-dim` (#6e7581), 3.6:1 or more on the band and its highlighted card, so it stays quieter than the band's text.
- The claims sit 1.25rem apart, 4 px more than before, so two sparkles' 44 px targets can never overlap: the review found two could meet at about 900 px wide, between the widths the first test measured.
- In the gallery's band, a stat takes the band's colors, so the band shows every part the page has; no band card has a stat yet.
- The 20 kept cases keep their titles, "“Ask me” on …", so their hashes hold and the changed run doesn't ask them again; one of them missed in the last full run. The 10 new cases are titled "“Ask about this” on …", like the hero tiles'.

## Not decided here

- When this reaches bradthome.com: a release, on Brad's go-ahead.
