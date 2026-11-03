# Spec 003: Skeleton and pipeline

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Approved |
| Slice | 2.1 Skeleton and pipeline |
| Branch | `003-skeleton-and-pipeline` |
| Mocks and flows | [mocks/README.md](mocks/README.md): the flow from a push to Brad's merge, and 17 states, with screenshots |
| Plan | [plan.md](plan.md), written after Gate 1 |
| Decisions | [D91](../../docs/decisions/0091-preview-channels-on-the-live-firebase-project.md), [D92](../../docs/decisions/0092-v0s-colors-with-self-hosted-charis-sil-and-inter.md), [D93](../../docs/decisions/0093-the-empty-page-says-the-site-is-being-rebuilt-in-public.md) and [D94](../../docs/decisions/0094-the-conventions-batch-for-the-skeleton-and-its-checks.md), from this slice's interview. It builds on [D29](../../docs/decisions/0029-the-first-screen-serves-the-phone-skim.md), [D30](../../docs/decisions/0030-success-criteria-for-quality-and-process.md), [D35](../../docs/decisions/0035-purposeful-motion.md), [D37](../../docs/decisions/0037-astro-react-and-a-separate-hono-api.md), [D46](../../docs/decisions/0046-visual-snapshots-in-a-pinned-linux-container.md), [D48](../../docs/decisions/0048-the-test-and-quality-batch.md), [D50](../../docs/decisions/0050-industry-standard-by-default.md), [D51](../../docs/decisions/0051-tailwind-css-4-and-motion-for-styling.md), [D52](../../docs/decisions/0052-firebase-hosting-on-blaze-with-the-api-on-cloud-run.md), [D55](../../docs/decisions/0055-split-the-required-checks-by-determinism.md), [D57](../../docs/decisions/0057-six-layers-of-cost-stops.md) and [D58](../../docs/decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md). |

## Summary

Phase 2 rebuilds today's site on the stack Brad chose. This first slice builds the site's skeleton, an empty page on Astro 7 with React, Tailwind 4, Motion and TypeScript, with v0's colors in both themes and self-hosted fonts. It wires up every check D55 requires, so later slices only add pages and tests. Every pull request also gets its own preview link on Firebase Hosting, deployed without a stored key, so Brad can review what changed on a real URL before merging. The live site isn't touched; it moves to the new stack in slice 2.6.

## Scope

**In:**

- A pnpm workspace, with the site in `apps/site` ([D94](../../docs/decisions/0094-the-conventions-batch-for-the-skeleton-and-its-checks.md)).
- The site: Astro 7 with React, Tailwind 4, Motion and TypeScript ([D37](../../docs/decisions/0037-astro-react-and-a-separate-hono-api.md), [D51](../../docs/decisions/0051-tailwind-css-4-and-motion-for-styling.md)), with v0's light and dark colors as tokens, and Charis SIL and Inter self-hosted through Astro's Fonts API ([D92](../../docs/decisions/0092-v0s-colors-with-self-hosted-charis-sil-and-inter.md)).
- One page at `/`, with the words D93 sets.
- New required jobs inside `ci / gate`: lint, format, site types, build, end-to-end with accessibility, visual snapshots and headers in a pinned Playwright container, Lighthouse, HTML and internal links ([D55](../../docs/decisions/0055-split-the-required-checks-by-determinism.md), D94).
- The same container for visual snapshots on Brad's PC through Docker Desktop ([D46](../../docs/decisions/0046-visual-snapshots-in-a-pinned-linux-container.md)).
- A preview workflow: a `pr-N` channel per pull request on the `bradthome` project's Hosting site, signed in through Workload Identity Federation, with the link in one comment ([D91](../../docs/decisions/0091-preview-channels-on-the-live-firebase-project.md), D94).
- Security headers in `firebase.json`, and a noindex header on previews only.
- A nightly workflow, never blocking: external links, and mutation testing on the safety scripts (D94).
- The Google Cloud and GitHub settings listed under "Settings this slice changes", each made at the build with Brad's go-ahead.
- Docs: AGENTS.md's Checks and Setup sections and repo map, the pull request template, the plan's and the working agreement's changes since approval, and records D91 to D94.

**Out:**

- Deploying to the live channel, and the cutover. Slice 2.6 does both, with its rollback.
- The cost guard that unlinks billing. That's slice 2.2.
- Content: the content collections (slice 2.3), the essay (slice 2.4) and the home page (slice 2.5).
- A theme switch, components and the phase 3 look. Slice 3.1 brings the design system.
- The API package. It arrives in phase 4, in `apps/api`.
- The PDF accessibility check. There's no PDF until slice 3.7.
- A full-site crawl. With one page there's nothing to crawl; it joins the nightly job when there are pages to find.
- Analytics. That's slice 3.10.

## User stories and acceptance scenarios

The IDs in brackets, such as (P1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: The empty page is the site's foundation (P1)

Brad wants the rebuild to start from a page that already meets the charter's bars: fast on a phone, accessible, in both themes, with the fonts and colors v1.0 will use. Every later page inherits its layout, tokens and fonts.

**Why this priority:** every check in Story 2 needs a real page to check, and slices 2.3 to 2.5 build on this one.

**Independent test:** build the site and open `/` in a browser on a phone and a desktop, in light and dark, with the keyboard and with fonts blocked.

- **S1.1** Given the built site, when a visitor opens `/`, then the page shows the heading "Brad Thome", the line "bradthome.com is being rebuilt in public, one reviewed slice at a time." and a link "Read the source on GitHub" to the repo, with the title "Brad Thome", that line as its description, and `lang="en"` (P1, P3).
- **S1.2** Given a device set to light or dark, when the page loads, then it uses v0's colors for that theme, with no flash of the other theme (P1–P4).
- **S1.3** Given the page loads, then every font file comes from the site itself, no request goes to another host, the heading and line show at once in a fallback before the fonts arrive, and swapping to the fonts doesn't shift the layout (P6).
- **S1.4** Given a keyboard, when the visitor presses Tab, then focus lands on the link with a visible focus ring, and nothing else takes focus (P5).
- **S1.5** Given reduced motion is on, then the page is identical, since nothing on it moves ([D35](../../docs/decisions/0035-purposeful-motion.md)).

### Story 2: Every quality check runs on every pull request (P1)

D55 makes every check that gives the same answer every time required, however long it takes. Brad wants them all wired up now, on the empty page, so no later slice ships without them.

**Why this priority:** the checks are what make later slices safe to merge, and they're cheapest to add while the site is one page.

**Independent test:** in a scratch pull request, break each rule once and see its job, and the gate, fail with the message in the mocks.

- **S2.1** Given a pull request where everything passes, when CI finishes, then the gate passes and the checks list shows lint, format, site types, build, end-to-end, Lighthouse, HTML and links beside spec 002's checks (C0).
- **S2.2** Given a lint error, unformatted code, or a type error that `astro check` finds, when CI runs, then that job fails, naming the file, line and rule (C4).
- **S2.3** Given an automated accessibility violation at WCAG 2.2 AA, with the target-size rule on, in either theme at either size, when CI runs, then the end-to-end job fails, naming the rule, the element and the state (C1).
- **S2.4** Given a page that differs from its committed snapshot by even one pixel, at phone 390×844 or desktop 1280×800, in light or dark, when CI runs, then the end-to-end job fails and keeps the diff image in the run's artifacts (C2).
- **S2.5** Given a page whose median over five Lighthouse runs, on a phone profile, misses a budget, when CI runs, then the Lighthouse job fails, naming each metric, its value and its budget (C3).
- **S2.6** Given invalid HTML, or a link or anchor in the built site that points to nothing the build has, when CI runs, then the HTML or links job fails, naming the file and the link (C5).
- **S2.7** Given Brad's PC with Docker Desktop, when `pnpm test:visual` runs, then the snapshots run in the same pinned container as CI and match the same baselines.

### Story 3: Every pull request gets a preview link (P1)

Brad reviews visible changes on a real URL, on a phone, before merging. Each pull request gets its own preview channel on the project that hosts the live site, deployed with no stored key ([D91](../../docs/decisions/0091-preview-channels-on-the-live-firebase-project.md)).

**Why this priority:** the working agreement's Done list asks for a preview of anything visible, and the slice plan's "done when" names it.

**Independent test:** open a pull request from a branch and from a fork, push twice, and read the comment, the channel list and the workflow's sign-in.

- **S3.1** Given a pull request from a branch in the repo, when it's opened or pushed, then the site deploys to the channel `pr-N`, and one comment shows the link, the commit and the expiry, edited on each later push rather than repeated (V1).
- **S3.2** Given the preview job runs, then it signs in to Google with GitHub's identity token, no Google key exists in the repo or its secrets, and only runs from this repo can use the sign-in (V1).
- **S3.3** Given a pull request from a fork, when CI runs, then the preview job skips with the reason, and every other check still runs (V2).
- **S3.4** Given Firebase Hosting refuses or fails the deploy, then the preview job fails with the error and how to retry, and the gate's result doesn't change (V3).
- **S3.5** Given any workflow in the repo, then it deploys only to `pr-N` channels and never to the live channel.
- **S3.6** Given a preview, when it's served, then it asks search engines not to index it, and a channel expires 7 days after its last push.

### Story 4: Every response carries security headers (P2)

**Why this priority:** headers are cheap to set on the first page and hard to retrofit once pages add scripts.

**Independent test:** serve the build as Firebase Hosting serves it, and read the headers of `/` and of a missing page.

- **S4.1** Given the built site served with `firebase.json`'s configuration, when any page or the 404 page is requested, then the response carries a Content-Security-Policy with no `unsafe-inline` for scripts, HSTS, `X-Content-Type-Options: nosniff`, a referrer policy and a permissions policy (C6).
- **S4.2** Given a path that doesn't exist, when it's requested, then the site answers 404 with a page in the same layout, and it passes the same accessibility check.

### Story 5: Slow or outside checks run nightly and never block (P3)

**Why this priority:** D55 keeps checks that can fail for outside reasons out of the gate, but they still need to run.

**Independent test:** run the nightly workflow by hand, and read its summary.

- **S5.1** Given the nightly run, then lychee checks every external link in the built site and reports each broken one in the run's summary, and a failure never blocks a pull request (N1).
- **S5.2** Given the nightly run, then StrykerJS runs on the safety scripts and reports the mutation score in the run's summary, with no threshold until there's a baseline (N1).

## Edge cases

- A pull request edits the preview workflow to deploy to the live channel. The preview's sign-in could do it (D91). CODEOWNERS puts every `.github/` change in front of Brad, the reviewer flags changes to the workflow, and S3.5's test fails on any workflow that names the live channel. Covered by S3.5.
- Dependabot's pull requests. They run the checks with Dependabot's secrets. Whether GitHub gives them an identity token is checked at the build; if it doesn't, the preview skips with the reason, as for a fork. Covered by S3.3.
- Google's fonts or a package registry is down during a build. Astro's Fonts API caches the fonts at build time, and the workflow restores the cache; a build that can't fetch them fails rather than shipping without them. Covered by S1.3.
- Snapshots on Windows or a Mac. Baselines only match inside the pinned container; `pnpm test:visual` runs there, and the plain test command never runs snapshots outside it. Covered by S2.7.
- Lighthouse varies from run to run. The median of five, with budgets below the charter's limits, keeps one slow run from failing the gate. Covered by S2.5.
- More than one open pull request. Each gets its own channel, named by its number. Covered by S3.1.
- A pull request closes. Its channel expires on its own 7 days after its last push. Covered by S3.6.
- A visitor's device has no dark setting, or an old browser ignores it. The page falls back to light. Covered by S1.2.

## Functional requirements

- **FR-001** The repo MUST be a pnpm workspace with the site in `apps/site`, and the repo's existing checks MUST keep working from the root.
- **FR-002** The site MUST build with Astro 7, React, Tailwind CSS 4, Motion and TypeScript, at exact versions.
- **FR-003** The site MUST define v0's light and dark colors as design tokens in Tailwind's theme, and MUST follow the device's color-scheme setting.
- **FR-004** The site MUST self-host Charis SIL for text and Inter for headings through Astro's Fonts API, MUST show text in a fallback before they load, and MUST NOT shift the layout when they swap in.
- **FR-005** The page at `/` MUST show the heading, line and link D93 sets, with that title and description, and `lang="en"`.
- **FR-006** The site MUST make no request to any host but its own.
- **FR-007** CI MUST add these jobs to the gate, each required: lint, format, site types, build, end-to-end, Lighthouse, HTML and links. A draft pull request skips end-to-end, Lighthouse, HTML and links until it's ready for review ([D100](../../docs/decisions/0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md)).
- **FR-008** The lint job MUST run ESLint with the Astro plugin, and the format job MUST run Prettier's check, over the site and the repo's scripts.
- **FR-009** The site-types job MUST run `astro check`.
- **FR-010** The end-to-end job MUST run Playwright in a pinned Playwright container image, with axe at WCAG 2.2 AA and the target-size rule on, for every page in both themes at phone and desktop sizes.
- **FR-011** Visual snapshots MUST cover phone 390×844 and desktop 1280×800, in light and dark, with reduced motion on, a fixed clock and no pixel tolerance, and MUST run only inside the pinned container, in CI and on Brad's PC.
- **FR-012** The Lighthouse job MUST take the median of five runs on a phone profile and fail below these budgets: performance 95, accessibility 100, best practices 100, SEO 100, LCP 2.0 s, CLS 0.05 and total blocking time 150 ms.
- **FR-013** The HTML job MUST run html-validate over every built page, and the links job MUST run lychee offline over the built site, checking internal links and anchors.
- **FR-014** Every failing job MUST say what failed, where, and how to fix it, in the shape of spec 001's messages.
- **FR-015** A preview workflow MUST deploy each pull request from a branch in the repo to the channel `pr-N` on the `bradthome` project's Hosting site, with a 7-day expiry, and MUST keep one comment with the link, commit and expiry up to date.
- **FR-016** The preview workflow MUST sign in through Workload Identity Federation, as a service account that only this repo's runs can use, and MUST NOT use a stored Google key.
- **FR-017** The preview workflow MUST sit outside the gate, MUST skip with its reason when no identity token is available, and MUST NOT deploy to the live channel.
- **FR-018** Previews MUST send a noindex header, and the live configuration MUST NOT.
- **FR-019** `firebase.json` MUST set a Content-Security-Policy that allows no inline script except by Astro's hashes, HSTS, `X-Content-Type-Options: nosniff`, a referrer policy and a permissions policy on every response, and MUST serve a 404 page for missing paths.
- **FR-020** A nightly workflow MUST check external links with lychee and run StrykerJS on the safety scripts, report both in its summary, and never be required.
- **FR-021** Every new workflow MUST follow spec 002's rules: Actions pinned to full commit hashes, read-only token permissions unless a job needs more, and pinned runner images and tool versions.
- **FR-022** `pnpm setup:check` MUST report whether Docker is available for `pnpm test:visual`.
- **FR-023** AGENTS.md's Checks and Setup sections, its repo map and the pull request template MUST name the new checks, the preview and `pnpm test:visual`.

## Success criteria

- **SC-001** On a phone profile, the page's median over five lab runs has LCP of 2.0 s or less, CLS of 0.05 or less and total blocking time of 150 ms or less, inside the charter's 2.5 s, 0.1 and 200 ms.
- **SC-002** The page has no automated accessibility violations, in either theme, at either size.
- **SC-003** Every pull request from a branch in the repo, opened after this slice merges, gets a preview link within 10 minutes of the push, measured over its first two weeks. [This is a measure, not a limit.]
- **SC-004** For each planted failure in Stories 2 and 4, the gate fails on the first try, every time.
- **SC-005** No Google key exists for the preview: the repo's secrets hold none, and the service account has no user-managed key.
- **SC-006** The project's Hosting use stays inside the no-cost allowance (10 GB stored and 10 GB a month served on 2026-11-02) over the slice's first two weeks, under D57's alerts.

## Mocks and flows

[mocks/README.md](mocks/README.md) shows the flow from a push to Brad's merge and every state, with [desktop](mocks/show-it-desktop.png) and [phone](mocks/show-it-phone.png) screenshots: P1 to P6 for the page, C0 to C6 for the checks, V1 to V3 for the preview, and N1 for the nightly run. Reduced motion is the same as P1 to P4, since nothing moves.

## Key entities

- **Preview channel:** a Hosting channel named `pr-N` for pull request N, with its own URL, expiring 7 days after its last push.
- **Deploy identity:** the Google service account the preview workflow acts as, reachable only through this repo's GitHub identity tokens.
- **Design tokens:** the colors and fonts the site's styles use, in Tailwind's theme, one set per theme.

## Settings this slice changes

Each is made at the build, after Gate 2, with Brad's go-ahead for that step. None needs a secret value. The agent runs the Google Cloud steps with Brad's gcloud login and the GitHub step with Brad's gh login, which is logged ([D90](../../docs/decisions/0090-log-the-agents-use-of-brads-login-instead-of-asking.md)).

**Google Cloud, project `bradthome`:**

1. Turn on the IAM Service Account Credentials and Security Token Service APIs, if they're off.
2. Create a workload identity pool for GitHub, with an OIDC provider for `token.actions.githubusercontent.com` that maps the repository and owner IDs and accepts only this repo's ID.
3. Create a service account for previews.
4. Grant it Firebase Hosting Admin and Service Usage API Keys Viewer on the project, the roles the Firebase CLI needs to deploy to a channel.
5. Let the pool's principals for this repo impersonate the service account (Workload Identity User), and nothing else.

**GitHub, repo `memorex386/bradthome`:**

6. Add three repo variables, not secrets, since none is secret: the provider's name, the service account's address and the project ID.

The ruleset doesn't change, since the new jobs sit inside `ci / gate` and the preview isn't required. Nothing is created on the live channel, and no billing setting changes.

## Assumptions

- The `bradthome` project stays on Blaze with D57's alerts at $1, $3, $5 and $25, checked on 2026-11-02.
- GitHub gives same-repo pull request runs an identity token when the job asks for `id-token: write`, and gives fork runs none.
- Firebase's GitHub Action needs a stored key, so the preview uses Google's auth action and the Firebase CLI's channel deploy instead, as checked on 2026-11-02.
- `@astrojs/check` 0.9.12 lists TypeScript 5 or 6 as its peer, and the repo pins TypeScript 7. The plan resolves it.
- Docker Desktop on Brad's PC can run the Playwright container image.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D91 to D94:

- The new jobs are `ci / lint`, `ci / format`, `ci / site-types`, `ci / build`, `ci / e2e`, `ci / lighthouse`, `ci / html` and `ci / links`; the preview is `preview / deploy`; the nightly workflow is `nightly`.
- The site builds once in `ci / build`, and the later jobs use its output.
- Accessibility, snapshots and headers share the end-to-end job, since they share its browser and container.
- Headers are checked against the build served as Firebase Hosting serves it, so `firebase.json` is what's tested.
- The 404 page uses the same layout and passes the same checks.
- The noindex header is added to the configuration only for preview deploys, so the HTML Lighthouse checks is the HTML that goes live.
- The preview's settings are repo variables, not secrets, since none of them is secret under Workload Identity Federation.
- A full-site crawl waits until there's more than one page.

## Traceability

Every S, FR and SC ID above appears in at least one test's name. Spec 001's traceability check confirms it, and CI runs it.

## Approval

- Gate 1: approved by Brad on 2026-11-02 ([comment on #12](https://github.com/memorex386/bradthome/pull/12#issuecomment-6590329563))
- Changed in the build, on 2026-11-03: the preview's comment job holds `pull-requests: write`, since GitHub refused the comment with `issues: write`, and the locked evidence test accepts Firebase Hosting's own HSTS header on the preview's web.app address, which replaces `firebase.json`'s there, at a year or more with subdomains. The end-to-end header test still checks `firebase.json`'s own value. `tests/003/static/preview.test.ts` and `tests/003/static/evidence.test.ts` changed, and spec 003 was re-locked. The preview service account also holds the read-only Service Usage Viewer role, which the Firebase CLI needs to check the Hosting API is on. Brad chose each in the build session ([D99](../../docs/decisions/0099-the-preview-comments-with-pull-requests-write-and-accepts-hostings-hsts.md)) and approves them at Gate 3.
- Changed on 2026-11-03, after this slice merged: FR-007, so a draft pull request skips the slow jobs until it's ready for review. `tests/003/static/ci.test.ts` changed with it, and a CodeQL alert's regular expression in `tests/003/static/preview.test.ts` was made linear. Spec 003 was re-locked. Brad asked for this in the slice 2.1 session ([D100](../../docs/decisions/0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md), [#17](https://github.com/memorex386/bradthome/issues/17)).
