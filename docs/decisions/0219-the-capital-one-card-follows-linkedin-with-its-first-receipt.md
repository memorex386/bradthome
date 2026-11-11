---
status: accepted
date: 2026-11-11
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D219
---

# The Capital One card follows LinkedIn's wording, with its first receipt

## Context and problem statement

On 2026-11-11 Brad rewrote LinkedIn's Hopper entry. Its Capital One line covers the whole post-booking Disruption Assistance build, from the RFC and ADR to the rollout. Its RemoteUI line says "co-architected and built", and it adds three mobile facts. The site still had résumé v2's shorter list, "co-developed", and no public link on the Capital One card. Two public pages now back the card: a 2024 Your Mileage May Vary post with a picture of the offer card Brad built, and HTS's March 2026 release saying HTS still delivers Flight Disruption Assistance to Capital One customers. Neither page names Brad. How should the site say all this, and how should it link the pages?

## Decision drivers

- The site should say what LinkedIn says, through the notes and the export (D109).
- A receipt claims only what its link shows. A third-party page shows the product, not Brad's role.
- Existing claim IDs stay put, since receipt anchors, chat citations and eval cases point at them.
- The site links other sites' pages. It never copies their images, branding or words.

## Considered options

The options are listed in the builder's ranked order. Brad answered four cards in the slice 034 session.

1. The end-to-end claim in LinkedIn's words. The 2024 post as a claim and receipt of its own at the card's end. HTS's release left out. All three mobile facts on the Mobile card (recommended)
2. The same, but with the end-to-end claim keeping résumé v2's extras (bulk persistence, schema changes)
3. The same, but with the post's link on the end-to-end claim, which would read as proof of the whole list
4. The same, but with HTS's release as the offer-card receipt's second link

## Decision outcome

Brad chose option 1, with option 4's second link.

- `hopper-disruption-assistance-2` follows LinkedIn's list:
  - the RFC and ADR, stakeholder alignment, new services on Terraform-provisioned GCP, and backend APIs
  - a payment flow with rewards points, offer generation and Redis caching
  - the React front end's bottom sheet, offer and purchase
  - feature flags, a phased rollout, analytics, monitoring and alerting
- `-1` and `-3` don't change.
- A new `hopper-disruption-assistance-4` says the 2024 post shows the offer card Brad built, as a customer saw it, and that HTS said in March 2026 it still delivers the product to Capital One customers. Its receipt, "The offer card, as a customer saw it", links the post and then the release, each by its host.
- The Mobile card:
  - Its first claim reads "Co-architected and built RemoteUI" and names Jetpack Compose and MVVM on Android and SwiftUI on iOS.
  - Two new claims follow WebViews: joining Hopper on Android before moving to full-stack work in Kotlin and Swift, and the Koin to Dagger/Hilt migration.
- The tags follow the words: React, Payment flow, Terraform, GCP, Redis and Feature flags on the Capital One card, with Jetpack Compose and SwiftUI added on the Mobile card.
- Tier 3, in the spec: the new claims are numbered after the old ones, so every existing ID keeps its place. The notes' 11/11 background bullets are tagged "public, not a site claim", so the export skips them. A third-party article a receipt links gets no preview card, amending spec 016's S1.6. And the eval's framing check counts "shouldn't", "wouldn't" and "mustn't" as declining a quoted label, as D200 meant, on Brad's card after two runs failed on "labels I shouldn't repeat".

### Consequences

- Good, because the card says what LinkedIn says and has its first public link.
- Good, because the receipt claims only what its links show.
- Bad, because the receipt depends on two outside pages. The nightly link check reports them if they go.
- Bad, because the Hopper story's numbers move up by three after the Capital One card. Every test that pinned them was amended.

### Confirmation

Spec 034's tests and the amended tests of specs 011, 012, 013, 016, 026 and 030 check the claims, titles, tags, links and numbers. Spec 030's S2.1 checks that the eval cases match the page's questions. `evals/results.json` is a passing run with the code's fingerprint.

## More information

- Decided by: Brad Thome, on the slice 034 session's cards, 2026-11-11.
- Builds on [D109](0109-jobs-and-projects-are-written-by-hand-claims-are-exported.md), [D129](0129-the-hopper-story-ships-from-the-public-resume-claims.md), [D133](0133-the-side-projects-public-pages-are-their-evidence.md), [D194](0194-a-prompt-or-model-change-needs-a-fresh-eval-run.md), [D200](0200-safety-must-pass-every-case-accuracy-95-percent.md) and [D208](0208-one-receipts-drawer-per-card.md).
