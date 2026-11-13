---
status: accepted
date: 2026-11-13
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D229
---

# Proof on the card: linked stats and sources at rest, in place of numbered receipts

## Context and problem statement

D118 gave every claim on the home page a numbered receipt, and D208 gathered each card's receipts in one drawer. Counted on bradthome.com on 2026-11-12, the home and each role page showed 30 numbered dots in 12 drawers. 20 of them said "Ask me", including 14 of the Hopper band's 15, and seven drawers said "No public link yet" or "No public links yet". The 10 receipts with a link held 13 distinct public sources, and four of them repeated a link their card already showed. A source took two taps to reach: a dot, then its row. How should the cards show their proof?

## Decision drivers

- A recruiter skimming on a phone should see the proof where it is, without opening anything.
- The page shouldn't announce what isn't public, and a claim with no public link should read as a plain résumé line.
- A source shows once per card, and a stat or a card link that already links it counts.
- Every link to a claim already given out keeps landing on it: `/corpus.json`, `/llms.txt`, the deployed chat API and every chat answer use `#receipt-<claim id>`.

## Considered options

The options are listed in the builder's ranked order, from the receipts study's round 1 (2026-11-12).

1. Proof on the card: no dots or drawers; stats link their store listings, the cards keep their links, and any other source shows as a labeled link under the claims (recommended)
2. Links only: dots and drawers stay only for the 10 claims with a public source
3. Links in the words: the words that name the proof are the link
4. No receipts: plain claims, and the cards keep the links they have

## Decision outcome

Chosen option 1, which Brad picked on the receipts study's card (2026-11-13) and approved at spec 038's Gate 1 the same day. It amends D118's numbered receipts, D208's drawers, D211's marker pop, and the receipts D218 and D219 placed their links in.

- No claim carries a numbered marker, and no card has a drawer. "Ask me", "Ask Brad about it" and "about these", and every "No public link" line go, on the home and each role page.
- A stat with a public source links it at rest, with its host under the label and an outside-link mark: Bleacher Report's 10M+ to its Google Play listing, and VINDecoded's 1M+ and 400K+ to Google Play and the App Store. A stat may link only the one URL on its host in its own claim's evidence, or the build fails.
- Any other source shows under its card's claims, before the tags and the card's links, as a link holding its label and its host. The Capital One card lists the 2024 travel-blog post and Hopper Technology Solutions' March 2026 release; bradthome.com lists the design system, the working agreement, a release's record and the latest eval run. The two on this site go by their paths and carry no outside-link mark.
- On Brad's Gate 1 card the six labels are the study's drafts with the working agreement's in its claim's words: "The offer card, in a 2024 travel-blog post", "Hopper Technology Solutions, March 2026", "The design system", "Each feature starts as a spec Brad approves", "A release's written record" and "The latest eval run, case by case". Each claims only what its page shows (D219).
- The cards' own links stay, and a source a card already links isn't listed again, so all 13 sources show at rest and each opens in one tap.
- Each claim carries the id its receipt's row had, `receipt-<claim id>`, so every existing link lands on the claim, about 40% down the screen, and tints it for a moment. The corpus, `/llms.txt` and the chat API don't change.
- The drawer's motion (MA-12) and the markers' pop (MA-11) go.
- On Brad's card after the build, bradthome.com's four sources may make its card taller than VINDecoded's: up to 305 px at 320 px wide, and 97 px at 1280. Its claims and counts stay within VINDecoded's height, as D217 set, and it stays the small card, last in "On the side". This amends D217's height rule.

### Consequences

- Good, because every source shows at rest and opens in one tap, and the page no longer says what isn't public.
- Good, because the phone home is 108 px shorter, the one module 29 bytes smaller, and the corpus and the chat API unchanged.
- Bad, because a source sits under its card's claims rather than on the sentence it backs.
- Bad, because the numbered look Brad chose in D118 is gone from the cards.

### Confirmation

Spec 038's tests count the markers, drawers, sparkles and anchors on each page, read every card's stats and sources against its claims' evidence, check the 13 sources are linked once, and land on claims by their anchors. The amended tests of specs 009, 011–014, 016–018, 020–022, 024, 025, 027–031, 033, 034 and 036 check the same pages.

## More information

- Decided by: Brad Thome, on the receipts study's cards (2026-11-13) and at spec 038's Gate 1 (2026-11-13).
- Spec: [spec 038](../../specs/038-proof-on-the-card/spec.md).
- Amends: [D118](0118-direction-a-with-cs-numbered-evidence-receipts.md), [D208](0208-one-receipts-drawer-per-card.md), [D211](0211-sections-reveal-their-evidence-once.md)'s marker pop, [D217](0217-bradthome-com-gets-a-small-card-with-build-time-counts.md)'s height rule, [D218](0218-the-design-system-gallery-is-linked-from-one-receipt.md) and [D219](0219-the-capital-one-card-follows-linkedin-with-its-first-receipt.md).
- Builds on [D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), [D129](0129-the-hopper-story-ships-from-the-public-resume-claims.md) and [D133](0133-the-side-projects-public-pages-are-their-evidence.md).
