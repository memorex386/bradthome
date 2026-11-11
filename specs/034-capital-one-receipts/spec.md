# Spec 034: The Capital One card's LinkedIn wording and its first receipts

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|           |                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Track     | Light: a content change, with no new layout                                                                                                |
| Status    | Approved                                                                                                                                   |
| Branch    | `034-capital-one-receipts`                                                                                                                 |
| Gate 1    | Approved by Brad on 2026-11-11, on the session's cards, every option as recommended but the HTS release, which Brad chose as a second link |
| Decisions | D219, from this slice. It builds on D109, D129, D133, D194 and D208                                                                        |

## Summary

On 2026-11-11 Brad updated LinkedIn's Hopper entry. Its Capital One line now covers the whole post-booking Disruption Assistance build, from the RFC and ADR to the rollout. Its RemoteUI line says "co-architected and built", and it adds three mobile facts. The site still says "co-developed" and lists a shorter build. Its Capital One card says "No public links yet", although a public 2024 travel-blog post shows the offer card Brad built.

This slice brings the Hopper story in line with LinkedIn, through the notes and the export (D109). It also gives the Capital One card its first receipt, which links that post and HTS's March 2026 release. The receipt claims only what the links show: the card shipped, and the product still runs. It never says either link names Brad.

On the session's cards Brad chose:

- LinkedIn's list for the end-to-end claim.
- The 2024 post as its own claim and receipt at the card's end.
- HTS's release as that receipt's second link.
- All three mobile facts on the Mobile card.

## Scope

**In:**

- **Brad's notes,** which stay private, through `pnpm content:export`:
  - The reworded `hopper-disruption-assistance-2` and `hopper-mobile-remoteui-and-webviews-1`.
  - The new `hopper-disruption-assistance-4`, with its two links, and the new `hopper-mobile-remoteui-and-webviews-3` and `-4`.
  - The notes' 11/11 background bullets, re-tagged so the export skips them.
- **`components/home/hopper.ts`:** the new claims' receipt titles, and the Capital One and Mobile cards' tags.
- **`components/chat/prep-fixtures.ts`:** `/design-system`'s prep example quotes the RemoteUI claim, so it quotes the new wording.
- **`apps/evals/src/cases.ts` and `checks.ts`:** the "Ask me" cases follow the page's questions (spec 030), the framing check reads "shouldn't" as declining (S3.5), and a fresh eval run follows (D194).
- **Tests and baselines:** amended where they count Hopper's receipts or quote these claims, and new tests in `tests/034/`.
- **Docs:** `docs/plan.md`'s log and record D219.

**Out:**

- The layout, the drawer and the chat's code.
- Any image, branding or words copied from either source. The site links them and nothing more.
- The other Hopper claims, the hero's figures and the résumé PDFs' layout.
- A release.

## User stories and acceptance scenarios

### Story 1: The Capital One card says what LinkedIn says, with a receipt (P1)

A recruiter compares the site's Capital One card with Brad's LinkedIn and finds the same work. They can open a link that shows the shipped card.

- **S1.1** Given the Hopper story on `/` or a role page, then the Capital One card shows four claims in this order: the unchanged launch claim (`-1`), the end-to-end claim in LinkedIn's words (`-2`), the unchanged expansion claim (`-3`) and the offer-card claim (`-4`).
- **S1.2** Given claim `-2`, then it names the RFC and ADR, stakeholder alignment, new services on Terraform-provisioned GCP, backend APIs, a payment flow with rewards points, offer generation and Redis caching, and the React front end's home-screen bottom sheet, offer and purchase. It also names the feature flags, phased rollout, analytics, monitoring and alerting.
- **S1.3** Given the card's receipts drawer, then receipt `-4` is titled "The offer card, as a customer saw it". It links the 22 Jul 2024 Your Mileage May Vary post and HTS's 17 Mar 2026 release, each shown by its host, and the drawer's summary reads "1 with a public link · 3 to ask about".
- **S1.4** Given claim `-4`, then its words say the post shows the card Brad built and HTS says the product still runs. They never say either source names Brad or proves Brad's role.
- **S1.5** Given the repo and the built site, then neither holds the post's screenshot, an image or logo from either source, or a sentence copied from either one.

### Story 2: RemoteUI and the mobile facts match LinkedIn (P1)

- **S2.1** Given the Mobile card, then its first claim reads "Co-architected and built RemoteUI", names Jetpack Compose and MVVM on Android and SwiftUI on iOS, and the words "Co-developed RemoteUI" appear nowhere on the site.
- **S2.2** Given the Mobile card, then its claims read in this order: RemoteUI (`-1`), WebViews (`-2`, unchanged), joining on Android then moving to full-stack, in Kotlin and Swift (`-3`), and the Koin to Dagger/Hilt migration (`-4`). `-3` and `-4` ask, since they have no public link.
- **S2.3** Given `/mobile`, then the Mobile card still comes first, and every role page keeps its topic order.

### Story 3: Nothing that cites a claim breaks (P1)

- **S3.1** Given the existing claim IDs, then each keeps its ID. The new claims are numbered after them, so an old receipt anchor, a chat citation and an eval case still point at the same claim.
- **S3.2** Given `/corpus.json` and `/llms.txt`, then they carry the new and reworded claims, with `-4`'s two links.
- **S3.3** Given the eval suite, then its "Ask me" cases are exactly the built page's questions (spec 030's S2.1), and `evals/results.json` is a fresh run with the code's fingerprint, every must-pass case passing.
- **S3.4** Given the notes' 11/11 background bullets (Brad's own account, the RemoteUI wording note, the stack note, and the Bleacher Report and RealPage tool notes), then the export writes none of them as a claim.
- **S3.5** Given an answer that quotes a label to decline it with "shouldn't", "wouldn't" or "mustn't", as both of this slice's first eval runs did ("labels … that I shouldn't repeat"), then the framing check passes it, as D200 meant. The same label, unquoted or in a sentence that adopts it, still fails. Added on Brad's card after the second run.

## Edge cases

- If a link starts failing, the nightly external link check reports it, and the receipt keeps its link until Brad decides. Both returned 200 to lychee's user agent on 2026-11-11.
- Neither link has a preview card, so each shows as a plain link (spec 016).

## Functional requirements

- **FR-001** The claims come only from the notes' bullets tagged exactly public, through `pnpm content:export`. `claims.yaml` is never edited by hand (D109).
- **FR-002** The claim texts are the ones Brad approved on the session's cards. A receipt title uses only words from its own claim, and a card's tags only words from its claims (spec 011's FR-003).
- **FR-003** Claim `-4`'s evidence is exactly the two https links, in order: the post, then HTS's release.
- **FR-004** No claim keeps the old wording "Co-developed RemoteUI", and the gallery's prep example quotes the RemoteUI claim as it now reads.
- **FR-005** The eval cases quote the page's questions, and the fingerprint matches a fresh run (D194).
- **FR-006** The framing check's declining words add "shouldn't", "wouldn't" and "mustn't". Nothing else in the checks changes.

## Success criteria

- **SC-001** The Hopper story shows 15 receipts, one of them with a public link, and every existing ID in place.
- **SC-002** The full suite, the e2e and visual tests, the links check and the eval run all pass.

## Decisions to record

- **D219:** the Capital One card follows LinkedIn's wording, and its first receipt links the 2024 post and HTS's release, with words that claim only what they show. The Mobile card adds the three approved mobile facts.
