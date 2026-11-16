---
status: accepted
date: 2026-11-16
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D234
---

# Three diagrams in the Hopper band, made only of their claims' words

## Context and problem statement

The Hopper band is the page's main story and its longest stretch of text: 2,456 px of the 7,610 px desktop home on live v2.9.0, and 3,955 of 11,557 px on a phone, with no picture. A recruiter skimming it reads claims one after another. Should the band show the shape of the work, and how, without adding a fact the claims don't hold (D129)?

## Decision drivers

- Every word on the page is a public claim's or a label made of its words (D129).
- The chat's sources and the corpus don't change.
- No motion of its own (D122, D211), no new script, and the CSP unchanged.

## Considered options

1. Three inline diagrams, one per role, in the claims' words: Capital One end to end, RemoteUI, and the human-approved loop (recommended)
2. No diagrams

## Decision outcome

Chosen option 1, on Brad's card in the pictures study's first round (2026-11-16), and approved with spec 039 at its Gate 1 the same day.

- Capital One: every layer of its end-to-end claim under "Sole engineering owner", then "reusable capability", Capital One and five more partners, and "10+ partner products, including Frontier and Spirit". It reads "Capital One → 5 more partners", since "then" isn't in the claim.
- RemoteUI: one server-driven UI (components, actions, state management, API mappings) reaching Android (Jetpack Compose and MVVM) and iOS (SwiftUI) by "server deploys", with "app releases" struck.
- The agent workflow: the experimentation loop from telemetry (Amplitude, BigQuery) through what it generates (UI, code, pull requests and visual/browser tests), the human approval, the release behind LaunchDarkly flags and the monitored outcomes, to promotion or rollback. Brad confirmed on the Gate 1 card that the approval sits after what the loop generates and before it releases.
- Every label names its claim, and the build fails if a word of a label isn't in its claim or the claim isn't on the card, as `SITE_RULES` fails it for the side cards.
- Each is inline SVG in the band's tokens, hidden from screen readers since its claims sit beside it. From 1088 px wide it takes the card's right column, 340 px wide; narrower, it follows the claims, before the sources and tags. It settles with its card (D211) and has no motion of its own.

### Consequences

- Good, because a skimmer sees the shape of three pieces of work in seconds, in words the claims already hold.
- Bad, because the band grows: by 403 px on a 1440 px desktop and 1,033 px on a 375 px phone, as built, against the study's estimates of 212 and about 1,000.
- Bad, because a change to one of the three claims fails the build until its diagram is read again.

### Confirmation

Spec 039's tests check each label's words against its claim, the build failing on a planted word, each diagram's place on a desktop and a phone, that it's hidden from screen readers, and a snapshot of each card in both themes.

## More information

- Decided by: Brad Thome, on the pictures study's cards (2026-11-16) and at spec 039's Gate 1 (2026-11-16).
- Spec: [spec 039](../../specs/039-pictures/spec.md).
