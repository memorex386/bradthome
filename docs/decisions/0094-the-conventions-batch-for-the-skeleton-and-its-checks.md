---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D94
---

# The conventions batch for the skeleton and its checks

## Context and problem statement

Slice 2.1 builds the site's skeleton and wires up every check [D55](0055-split-the-required-checks-by-determinism.md) requires, with the tools [D48](0048-the-test-and-quality-batch.md) named. Those records leave the layout, the budgets, the snapshot sizes and how previews behave open. They're conventions, so they went to Brad as one batch at the interview. Approve the batch?

## Decision drivers

- Every check that gives the same answer every time is required, however long it takes (D55).
- The charter's limits: LCP 2.5 s, CLS 0.1 and INP 200 ms on phones, and WCAG 2.2 AA ([D30](0030-success-criteria-for-quality-and-process.md)).
- Visual snapshots run in a pinned Linux container ([D46](0046-visual-snapshots-in-a-pinned-linux-container.md)).
- Backend code lives in its own package in the same repo ([D37](0037-astro-react-and-a-separate-hono-api.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Approve all (recommended)
2. Approve all except the ones Brad names
3. Discuss each one

## Decision outcome

Chosen option: "Approve all". Brad added no note.

- **Layout:** a pnpm workspace, with the site in `apps/site` and, from phase 4, the API in `apps/api`. The repo's checks stay at the root.
- **Versions:** the latest stable releases at the build, pinned exactly. Dependabot keeps them current.
- **New jobs inside `ci / gate`,** all required: lint (ESLint with the Astro plugin), format (Prettier), `astro check`, build, end-to-end with axe (WCAG 2.2 AA, with the target-size rule on) and visual snapshots in the pinned Playwright container, Lighthouse CI (the median of five runs), html-validate, and internal links with lychee over the built site.
- **Lighthouse budgets,** in the lab on a phone profile: performance at least 95, and accessibility, best practices and SEO at 100. LCP 2.0 s or less, CLS 0.05 or less, and total blocking time 150 ms or less, each tighter than the charter's limits.
- **Visual snapshots:** a phone at 390×844 and a desktop at 1280×800, in light and dark, with reduced motion on, a fixed clock and no pixel tolerance.
- **Previews:** one channel per pull request, named `pr-N`, kept 7 days after the last push, with the link posted as a comment. The preview job sits outside the gate, since it depends on Google. A pull request from a fork gets no preview, and the job says why.
- **Nightly, never blocking:** external links with lychee, and StrykerJS mutation testing on the safety scripts, reported but not a gate until there's a baseline.
- **Security headers** on every response: a Content-Security-Policy using Astro's script hashes, HSTS, `nosniff`, a referrer policy and a permissions policy.

### Consequences

- Good, because the skeleton meets every D55 check from its first page, so later slices only add tests.
- Good, because the budgets leave headroom under the charter's limits.
- Bad, because the gate takes longer, with a build, a container and five Lighthouse runs on every pull request.

### Confirmation

Spec 003's requirements and tests cover each line, and the reviewer checks the workflow against them.

## More information

- Decided by: Brad Thome, on the slice 2.1 interview page (B1).
