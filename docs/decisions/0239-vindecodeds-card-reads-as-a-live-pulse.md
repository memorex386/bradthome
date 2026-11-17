---
status: accepted
date: 2026-11-17
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D239
---

# VINDecoded's card reads as a live pulse

## Context and problem statement

D132 gave VINDecoded a lean card: two download stats, then `vindecoded-2`, `vindecoded-3` and `vindecoded-7` as written. On live v2.10.0 Brad read it on 2026-11-17 and asked for a card that's cleaner to read and worth more to a future employer. It showed the downloads twice, as stats and then as a sentence; the case study's counts as a four-row list, frozen at Oct 28, that didn't say what they prove; and nothing that said the product still ships. The stack (`vindecoded-4`) and the production AI features (`vindecoded-5`), which employers scan for, were public claims the card left off. What should the card show, and how?

## Decision drivers

- VINDecoded stays a side project that does well, after Hopper and Experience, never the headline (D132).
- Every sentence on the site is a public claim as written, and every label is made of its claims' words or approved by Brad (D129).
- Each claim keeps its anchor and its sparkle (D229, D230), and the card keeps the App Store icon (D233).
- The résumé PDFs print what the card shows and stay at two pages.

## Considered options

The career session's study mocked four cards, listed in the builder's ranked order there. Brad chose on its cards on 2026-11-17, and on spec 041's Gate 1 cards the same day.

1. B, "Live pulse": the sentence, three tiles (the downloads, the latest iOS release, live, and the PRs merged in the last 30 days, live), the stack and the AI features, one line for the case study, and a footer with a quiet live line (recommended)
2. A, "Tidy": the same facts said once each, with no live data
3. C, "Shipping record": twelve weeks of merged PRs and the latest release's notes as the centerpiece
4. Today's card

## Decision outcome

Chosen option 1, B. It amends D132's lean card.

- The card shows, in order: the icon, name and kicker; `vindecoded-2`; three tiles; "What I built", the stack from `vindecoded-4` as six tags, beside "AI in production", `vindecoded-5`'s two items and its guard sentence as written, in place of its lead line; one line, "From the case study, Oct 28: 1,530 test files · 113 runbooks · 46 ADRs", with "Read the case study"; and a footer with the live line, "How this works", and the links vindecoded.com, App Store and Google Play.
- The downloads tile's words are `vindecoded-3`'s, which no longer shows as a paragraph: "1.4M+" and "Android 1M+ ★4.5 · iOS 400K+ ★4.7". The 1,235-PR count and its share from agent branches leave the card, since the live tile replaces them; `vindecoded-7` stays whole in the corpus, and its closing rule never shows.
- One activity tile: the share of PRs from agent branches stays off the card and out of the API's answer, since it invites the "team of AI agents" framing.
- Each of the five claims keeps its `receipt-` anchor and ends with one sparkle; `vindecoded-4` is titled "Re-platformed from AngularJS/Cordova" and `vindecoded-5` "Shipped production AI features". The tiles aren't links, so no sparkle sits inside one.
- The labels and lines are Brad's words, approved as drafted on spec 041's cards and listed there; none is a claim, so `claims.yaml` doesn't change. The "Merged PRs" tile says "In the last 30 days" and nothing about review, since no source says every PR was reviewed.
- The PDFs print `vindecoded-2`, `-3` and `-4`, the platform, the downloads and the stack: all five ran the mobile PDF to three pages. No live number prints.
- The live numbers come from the site's own API, as [D240](0240-live-numbers-from-the-sites-own-api.md) sets.

### Consequences

- Good, because the downloads show once, the stack and shipped AI read in seconds, and the card shows the product ships now.
- Good, because every word is a claim's or one Brad approved, and the build checks each tag, number and item against its claim.
- Bad, because the card is 51 px taller on a desktop and about 360 px on a phone, where the tiles stack.
- Bad, because the PDFs no longer print the case study's counts; the case study, linked from the card, still has them.

### Confirmation

Spec 041's tests check the card's parts and words against the claims and `PULSE`, its anchors and sparkles, the same card on each role page, the PDFs' lines and pages, the corpus's new links and the two new eval cases, and that the CSP, the reveal, axe and layout shift hold. The amended tests of specs 013, 015, 038 and 040 check the same card.

## More information

- Decided by: Brad Thome, on the career session's study cards and at spec 041's Gate 1, 2026-11-17.
- Spec: [spec 041](../../specs/041-vindecoded-pulse/spec.md).
- Amends: [D132](0132-vindecoded-is-a-side-project-on-a-lean-card.md).
- Builds on [D129](0129-the-hopper-story-ships-from-the-public-resume-claims.md), [D133](0133-the-side-projects-public-pages-are-their-evidence.md), [D229](0229-proof-on-the-card.md), [D230](0230-a-sparkle-on-each-claim-opens-the-chat.md) and [D233](0233-the-apps-real-icons-on-their-cards.md).
