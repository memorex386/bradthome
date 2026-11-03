---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D99
---

# The preview comments with pull-requests: write, and accepts Hosting's HSTS

## Context and problem statement

The first real preview runs on pull request #12 found three things the plan's facts didn't cover.

- The comment job held `issues: write`, which the plan read as enough for a pull request comment. GitHub answered the comment with HTTP 403, so the comment needs `pull-requests: write`. Spec 002's locked rules banned that permission in every workflow, and spec 003's locked test pinned `issues: write`.
- On the preview's `web.app` address, Firebase Hosting sends its own `Strict-Transport-Security: max-age=31556926; includeSubDomains; preload` in place of the header `firebase.json` sets. Spec 003's locked evidence test expected `firebase.json`'s two-year value from the real preview.
- The Firebase CLI checks the Hosting API is on before it deploys, which neither of the plan's two roles allows. It answered HTTP 403 from the Service Usage API.

## Decision drivers

- The preview link reaches the pull request the way mock V1 shows.
- Each write permission sits where a spec names it, and nowhere else.
- Evidence records what the real preview sends.

## Considered options

1. Comment: allow `pull-requests: write` in the preview's comment job only (recommended), or drop the comment and show the link in the run's summary.
2. HSTS: the evidence test accepts Hosting's own header on the preview, a year or more with subdomains (recommended), or keeps the test and waits for the custom domain in slice 2.6.
3. Role: grant the preview service account the read-only Service Usage Viewer role (recommended), or find another way.

## Decision outcome

Brad chose the recommendation for each in the build session, on 2026-11-03.

- Spec 002's FR-014 allows `pull-requests: write` in spec 003's preview comment job only. Its Dependabot test checks that exactly that job holds it, and its workflow test names it for that job. Spec 002 is re-locked.
- Spec 003's preview test pins the comment job to `pull-requests: write`, and its evidence test accepts an HSTS header of at least a year with `includeSubDomains` on the preview. The end-to-end header test still checks `firebase.json`'s own value through the Hosting emulator. Spec 003 is re-locked.
- `preview-deployer` holds `roles/serviceusage.serviceUsageViewer` beside Firebase Hosting Admin and Service Usage API Keys Viewer.

### Consequences

- Good, because the link appears in the pull request as one comment, edited on each push.
- Good, because no other workflow or job can hold `pull-requests: write` without a locked test failing.
- Bad, because the comment job's token can also edit the pull request itself. The job runs only the repo's own comment script, after the deploy, and fork pull requests get a read-only token.
- Neutral: the live site's HSTS is whatever Hosting sends on the custom domain. Slice 2.6 records it at the cutover.

### Confirmation

`tests/002/static/dependabot.test.ts`, `tests/002/static/workflows.test.ts`, `tests/003/static/preview.test.ts` and `tests/003/static/evidence.test.ts`. The evidence file records the preview's real headers and the comment's run.

## More information

- Decided by: Brad Thome, in slice 2.1's build session, 2026-11-03. Brad asked to keep the process moving, so the questions came as structured choices in the session rather than on a decision page.
- Specs: [002, CI and rulesets](../../specs/002-ci-and-rulesets/spec.md) and [003, skeleton and pipeline](../../specs/003-skeleton-and-pipeline/spec.md).
