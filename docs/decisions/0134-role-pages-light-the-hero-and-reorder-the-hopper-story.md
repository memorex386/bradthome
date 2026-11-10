---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D134
---

# Role pages light the hero and reorder the Hopper story

## Context and problem statement

D6 makes /mobile, /fullstack and /ai the same page as the home, reordered for one kind of role, with the same words and facts. The jobs before Hopper are all Android, and VINDecoded is always the first side project, so the order of the jobs and projects can't say much per role. The Hopper story's five topics can. What should each role page change, and in what order should its Hopper topics show?

## Decision drivers

- Hopper stays first on every page, and VINDecoded is never the headline (AGENTS.md's positioning, D132).
- A role page shows exactly the claims the home shows (D6).
- The Home v2 board draws a highlight for each role and an order for the Hopper topics (D118).

## Considered options

The options are listed in the builder's ranked order. For what else changes:

1. The eyebrow, the Hopper topics, and the hero's highlight: the role's word turns blue, the other two dim, and its "End to end" rows stay lit (recommended)
2. The same, and /ai also moves "On the side" ahead of Experience
3. The eyebrow and the Hopper topics only

For each role's topic order, the board's order was recommended, against one or two alternatives on each card.

## Decision outcome

Chosen option 1, with the board's order for every role. The role lines stay at the top of the Hopper story; the topics follow in this order:

| Page       | Hopper topics                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------- |
| /v2        | The claims' own order: Disruption Assistance, Partner platform, Fintech AI, Agent workflow, Mobile  |
| /mobile    | Mobile (RemoteUI and WebViews), Disruption Assistance, Partner platform, Fintech AI, Agent workflow |
| /fullstack | Disruption Assistance, Partner platform, Mobile, Agent workflow, Fintech AI                         |
| /ai        | Fintech AI, Agent workflow, Partner platform, Disruption Assistance, Mobile                         |

Experience keeps its jobs newest first, and "On the side" keeps VINDecoded first, on every page. The sections stay Hopper, Experience, On the side.

### Consequences

- Good, because a recruiter for one role sees that role's Hopper work first, with no claim that differs from the home.
- Good, because the order lives in one table in the code, by topic name, and the build fails if a name loses its claims.
- Bad, because the job and project files' `roles` orders stay unused for now, as every page shows them in the same order.

### Confirmation

Spec 014's tests check each page's topic order, its highlight, and that every page shows the same claims as `/v2`.

## More information

- Decided by: Brad Thome, on the slice 3.6 session's cards, 2026-11-05.
- Amended in part by [D206](0206-the-role-switch-moves-into-the-hero-without-the-address.md), 2026-11-09: the switch is one quiet line in the hero, "Tailor this page", with the three roles and no address.
