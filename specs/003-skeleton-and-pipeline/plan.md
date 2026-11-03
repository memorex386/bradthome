# Plan for spec 003: Skeleton and pipeline

<!-- Written in plan mode, in a fresh session, after Gate 1. Brad approves it at Gate 2. -->

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved 2026-11-02 |
| Status | Approved |

## Approach

The site joins the repo as a pnpm workspace package. Its checks join spec 002's CI as jobs inside `ci / gate`, and the preview and nightly runs get workflows of their own. Each job runs one script or one package command, so the rules stay in tested code, as [D82](../../docs/decisions/0082-the-conventions-batch-for-building-ci.md) set.

- **The workspace** (FR-001, FR-002).
  - `pnpm-workspace.yaml` gains `packages: [apps/*]`. The site is `apps/site`, a private package named `@bradthome/site`.
  - The root keeps its scripts, tests and checks. Root commands reach the site through `pnpm --filter @bradthome/site`.
  - Every version is pinned exactly, at the latest stable release when the build starts. Today that's Astro 7.4.5, @astrojs/react 7.1.2, React and React DOM 19.3.1, Tailwind and @tailwindcss/vite 4.3.4, Motion 14.9.0, @astrojs/check 0.9.12, ESLint 10.14.0, typescript-eslint 8.72.1, eslint-plugin-astro 3.2.1, eslint-plugin-jsx-a11y 6.10.2, Prettier 3.9.10 and prettier-plugin-astro 1.1.2.
  - pnpm 12 holds back any release younger than its minimum release age, and offers to add an exception to `pnpm-workspace.yaml`. The build adds no exception: it waits for the release, or takes the one before.
  - firebase-tools has two install scripts (protobufjs and re2) that the repo's `strictDepBuilds` rejects. Neither is needed, so `allowBuilds` names both as `false`, as [D77](../../docs/decisions/0077-the-tooling-batch-for-slice-1-3.md) asks of every build script.
- **TypeScript** (FR-002, FR-009). The repo pins TypeScript 7.0.2, and both `astro check` and typescript-eslint refuse it (see "Facts this plan rests on").
  - `apps/site` takes Microsoft's side-by-side route for 7.0: `"typescript": "npm:@typescript/typescript6@6.0.2"`, which re-exports the TypeScript 6 API that the Astro language tools and typescript-eslint import.
  - The root keeps `typescript` at 7.0.2, so `pnpm typecheck` still runs TypeScript 7 over the scripts and tests. Spec 001's locked package test wants every root version written as plain digits, which an `npm:` alias isn't, so the alias stays in the site's package.
  - When Astro's checker supports TypeScript 7.1 (today it's `@astrojs/ts-content-mapper`, which needs 7.1, still in beta), Dependabot's pull request can drop the alias.
- **The page** (FR-003 to FR-006, S1.1 to S1.5).
  - One layout, `src/layouts/Base.astro`, with `lang="en"`, the title, the description and the theme. `src/pages/index.astro` holds D93's words. `src/pages/404.astro` uses the same layout (S4.2).
  - The tokens live in `src/styles/tokens.css` as Tailwind 4 `@theme` variables, v0's light values on `:root`, and the dark values under `prefers-color-scheme: dark` (FR-003, S1.2). There's no theme script, so there's no flash and nothing for the CSP to allow.
  - The fonts come through Astro's Fonts API with its local provider, from @fontsource/charis-sil 5.3.0 and @fontsource-variable/inter 5.3.0 in `node_modules`, Latin subset only. The build never fetches a font, so a font host that's down can't break it. `<Font preload />` preloads the two files, `font-display: swap` shows the fallback first, and the API's metric-matched fallbacks keep the swap from moving anything (FR-004, S1.3).
  - React and Motion are installed and configured, and the page uses neither, so it ships no JavaScript and nothing moves (S1.5). Slice 3.1 brings the first island.
  - Astro's `security.csp` puts each page's script and style hashes in a meta tag.
- **The headers** (FR-018, FR-019, S4.1, S3.6).
  - `firebase.json` at the root sets `public` to `apps/site/dist`, clean URLs, no trailing slash, and the headers on every path (`**`): the Content-Security-Policy, HSTS (`max-age=63072000; includeSubDomains`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and a Permissions-Policy that turns off every device feature.
  - The policy starts `default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`, and its `script-src` and `style-src` list `'self'` plus the hashes Astro wrote. `scripts/site/csp.ts`, run as `pnpm csp`, reads the hashes from the built pages and writes them into `firebase.json`. `pnpm csp --check` fails the build job when the file is out of date, naming the fix (C6).
  - Live has no noindex. The preview workflow writes `firebase.preview.json`, a copy with `X-Robots-Tag: noindex` added, and deploys with `--config firebase.preview.json`. So the committed file is the live configuration, and the HTML that Lighthouse checks is the HTML that goes live.
  - The headers are tested by serving the build through the Firebase Hosting emulator, inside the Playwright container (see the facts).
- **The CI jobs** (FR-007 to FR-014, S2.1 to S2.6). `ci.yml` gains eight jobs on `ubuntu-24.04`, and `scripts/ci/gate.ts` lists them, in the mocks' order:
  - `lint`: ESLint, with typescript-eslint, eslint-plugin-astro and jsx-a11y, over `apps/site` and `scripts/`. ESLint runs from the root with `--config apps/site/eslint.config.js`, so its plugins resolve from the site's packages and get the TypeScript 6 API. Spec tests in `tests/` are locked, so they aren't linted.
  - `format`: `prettier --check` over the same paths, with `semi: false`, `singleQuote: true` and a print width that matches today's scripts. The build reformats `scripts/` once, in its own `style(003)` commit, with spec 001's and 002's suites passing before and after.
  - `site-types`: `astro check` in `apps/site`.
  - `build`: `astro build`, then `pnpm csp --check`. It uploads `apps/site/dist` as the run's `site` artifact, which the later jobs download.
  - `e2e`: Playwright 1.64.1 in `mcr.microsoft.com/playwright:v1.64.1-noble`, pinned by digest. It serves the build through the Firebase Hosting emulator and runs the page, accessibility, snapshot and header tests. On a failure it uploads the report and every diff image (S2.4).
  - `lighthouse`: Lighthouse CI 0.16.0 in the same container, with the container's Chromium. Five runs on the mobile preset, the median asserted against FR-012's budgets (S2.5).
  - `html`: html-validate 11.18.0 over every built page.
  - `links`: lychee 0.24.2, `--offline --include-fragments --root-dir`, over the built site. Its release is downloaded and checked against the pinned SHA-256 `1f4e0ef7f6554a6ed33dd7ac144fb2e1bbed98598e7af973042fc5cd43951c9a`, like gitleaks.
  - Each job prints spec 001's message shape through `scripts/lib/messages.ts`: what failed, where and how to fix it (FR-014). A script turns each tool's report into that shape, so the messages are unit-tested.
- **Visual snapshots on Brad's PC** (FR-011, S2.7). `pnpm test:visual` runs `scripts/site/visual.ts`, which runs the same container image, by the same digest, through Docker, with the repo mounted. `--update` writes new baselines. The plain test commands never run snapshots outside the container: `playwright.config.ts` refuses to start unless `BRADTHOME_CONTAINER=1` is set, and only the container runs set it.
- **The preview** (FR-015 to FR-017, S3.1 to S3.6). `.github/workflows/preview.yml`, on `pull_request` (opened, synchronize, reopened), with a concurrency group per pull request. Three jobs, each with only the permissions it needs:
  - `build`: no extra permissions. Builds the site and uploads it. It runs the pull request's code and its dependencies, and never holds a Google sign-in.
  - `deploy`: `contents: read` and `id-token: write`. It skips with V2's reason when the pull request comes from a fork, or when GitHub gave the job no token request URL. Otherwise `scripts/ci/preview-credentials.ts` writes Google's federated sign-in file (an `external_account` file that reads GitHub's token and impersonates the preview service account), and the Firebase CLI runs `hosting:channel:deploy pr-N --expires 7d --config firebase.preview.json --json`. This job installs only firebase-tools, not the site's packages. On a failure it prints the CLI's error lines and V3's fix.
  - `comment`: `issues: write` only, which is enough for a pull request comment. It runs `scripts/ci/preview-comment.ts`, which finds its own earlier comment by a hidden marker and edits it, or posts one, with the link, the commit and the expiry (V1).
  - The workflow is outside the gate, so a failed deploy never changes the gate (S3.4). It names only `pr-` channels, never `firebase deploy`, and never the live channel (S3.5).
  - The repo variables are `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_PREVIEW_SERVICE_ACCOUNT` and `FIREBASE_PROJECT_ID`, read from the environment, never interpolated into a script.
- **The nightly run** (FR-020, S5.1, S5.2). `.github/workflows/nightly.yml`, on a daily schedule and `workflow_dispatch`, read-only. It is never required, and the gate doesn't read it.
  - `links`: builds the site and runs lychee online over its external links. Each broken one goes in the run's summary.
  - `mutation`: StrykerJS 10.1.1 with the Vitest runner, on `scripts/lib/` and `scripts/hooks/`, with spec 001's and 002's unit tests. The score goes in the summary, with no threshold (N1).
- **Setup and docs** (FR-022, FR-023).
  - `pnpm setup:check` gains a Docker line, shown only in a checkout that has `apps/site`. It passes when `docker version` answers and names the container image, and otherwise gives the fix. Specs 001 and 002 lock the setup check's exact lines in scratch repos that have no `apps/site`, so their tests still pass.
  - AGENTS.md's Checks section names the eight jobs and the preview. Its Setup section names Docker Desktop and `pnpm test:visual`. `pnpm test:visual` doesn't go in the Checks list of hand-run commands, which spec 002's locked docs test keeps to the three that CI doesn't cover. The repo map gains `apps/`, `firebase.json` and the new scripts. The pull request template asks for the preview link and the new checks.

## What exists today

- Spec 001's hooks and libraries in `scripts/lib/` and `scripts/hooks/`, and spec 002's CI scripts in `scripts/ci/`, with `scripts/ci/gate.ts` holding the gate's expected jobs.
- `.github/workflows/ci.yml` (eight jobs and the gate) and `locked-tests.yml`, `dependabot.yml` (npm and github-actions, weekly, grouped), CODEOWNERS and the ruleset file.
- `tests/001/` and `tests/002/`, both locked. Vitest's `unit` and `integration` projects pick up `tests/*/unit`, `tests/*/static` and `tests/*/integration`.
- No site, no `apps/`, no `firebase.json`.
- The Firebase project `bradthome` has one Hosting site, `bradthome`, serving v0 on its live channel. Its Blaze plan has D57's budget alerts.
- The agent's private CI sandbox, `bradthome-agent/bradthome-ci-sandbox`, from spec 002.

## Facts this plan rests on

Checked on 2026-11-03, by a real run where one was possible:

1. **TypeScript 7 and the site's checkers.** Real runs in a scratch project with Astro 7.4.5:
   - With TypeScript 7.0.2, `astro check` exits 1 with "astro check does not currently support TypeScript 7.0. To continue using astro check, install TypeScript 6 instead." It names `@astrojs/ts-content-mapper` as the future route, which needs TypeScript 7.1.
   - typescript-eslint 8.72.1 peers TypeScript below 6.1, and with 7.0.2 it stops with "typescript-eslint does not support TS 7.0."
   - TypeScript 7.0 ships no JavaScript API. Microsoft's 7.0 announcement recommends aliasing `typescript` to `@typescript/typescript6` for tools that import it.
   - With that alias (6.0.2, which resolves TypeScript 6.0.3), `astro check` passes a clean page, fails a planted type error with `ts(2322)` and exit 1, ESLint lints, and pnpm reports no peer problems. With `@typescript/native` aliased to 7.0.2 beside it, `tsc` is still 7.0.2.
   - ESLint 10 ignores files outside the config's folder when it runs from `apps/site`. Run from the root with `--config apps/site/eslint.config.js`, it lints both `apps/site` and `scripts/`.
2. **Testing the headers.** Real runs of firebase-tools 15.34.2's Hosting emulator, with a `firebase.json` that sets five headers on `**`:
   - In a Linux container (Node 22), every header is on the 200 for `/`, the 404 for a missing path (with the custom 404 page) and the 301 for `/index.html`. It needs no Java and no login, with a `demo-` project ID.
   - On Windows the emulator sends none of them: its server rewrites the rule's `/**` to `\**`, which matches nothing. So the header test runs only inside the Linux container, in CI and through `pnpm test:visual`'s container on Brad's PC.
   - Live Hosting adds `Strict-Transport-Security: max-age=31556926` on its own today, but nothing else, so `firebase.json` sets every header itself.
3. **Dependabot and the identity token.** GitHub's docs say a Dependabot pull request run gets a read-only token that the `permissions` key can raise, and no Actions secrets. The OIDC docs mention Dependabot only for its update jobs (`event_name` is `dynamic`). No page says whether a Dependabot pull request run gets an identity token. A probe in the sandbox was considered and not run. So the deploy job decides at run time: with no token request URL it skips with the reason, as for a fork (S3.3), and with one it deploys. Either way no key exists to fall back to. The build records the first real Dependabot run's result in the evidence.
4. **The keyless deploy.**
   - FirebaseExtended/action-hosting-deploy v0.11.0 still needs a stored key.
   - google-github-actions/auth v3 (`7c6bc770…`) would work, but it's third-party code with the job's token, which D82 rules out. It writes an `external_account` file, which a repo script can write instead.
   - A real run: firebase-tools 15.34.2 with only an `external_account` file in `GOOGLE_APPLICATION_CREDENTIALS` (in a clean home folder, with no login) made the token exchange with Google's STS, which refused the made-up pool with `invalid_target`. Its own message was "Failed to authenticate, have you run firebase login?", so the deploy job prints the CLI's real error lines on a failure.
   - `hosting:channel:deploy` takes `--expires` (default 7d, max 30d), and the global `--json` and `--config`.
   - Creating or editing a pull request comment needs `issues: write` or `pull-requests: write`. The first is enough, and spec 002's Dependabot test bans the second.
5. **Versions.** All the stack and tool versions above are the latest on 2026-11-03. Since the interview, Lighthouse CI moved from 0.15.1 to 0.16.0 (published 2026-11-02), and Astro 7.4.5 is younger than pnpm's minimum release age. The upload-artifact v7.0.2 and download-artifact v8.0.2 actions are at `cf430e030ddbb5b0abf93d22962f4752f3646cd9` and `9000827ccba6bdab643e8b6fd33ac0654aef8333`.
6. **Spec 002's locked tests** pin the CI job list, the gate's needs and expected jobs, the workflow folder to two files, and the actions to checkout and setup-node. Spec 001's pin every root version to plain digits and the setup check's exact lines. See "Changes to locked tests".

## Changes to locked tests

Building this spec means changing spec 002's locked tests, and a locked test changes only with a spec change Brad approves ([D21](../../docs/decisions/0021-lock-tests-written-from-approved-scenarios.md)).

| Locked test | What it pins | Why spec 003 collides |
| --- | --- | --- |
| `tests/002/static/workflows.test.ts` | `ci.yml`'s eight job IDs, the gate's needs, the workflow folder holding only two files, and the actions to checkout and setup-node at fixed hashes | FR-007's eight jobs, FR-015's and FR-020's workflows, and the artifact actions |
| `tests/002/unit/gate.test.ts` | The gate's expected jobs equal a fixed list | FR-007 |

Brad chose how far the change goes, on the plan's decision page: [D95](../../docs/decisions/0095-spec-002s-locked-tests-check-rules-instead-of-lists.md), rules instead of lists.

- The tests check that the gate needs every other job in `ci.yml`, and that `scripts/ci/gate.ts` matches `ci.yml`'s jobs.
- Every workflow in the folder uses GitHub's own actions, each pinned to a full commit hash, with pinned runners and tools, a read-only token by default, and checkouts that don't keep it.
- A job holds a write permission only where a spec names it. Spec 003 names `id-token: write` for the preview's deploy job and `issues: write` for its comment job.
- Spec 002's other rules stay, including the ban on `pull-requests: write`.

The tests session edits spec 002's FR-002 and FR-014 and their two test files in one commit, then relocks spec 002 with `pnpm lock specs/002-ci-and-rulesets`. That commit comes before spec 003's tests are locked. Brad's Gate 2 approval of this plan approves that spec change.

Nothing else collides, by design:

- Spec 001's package test: the TypeScript alias stays in `apps/site/package.json`.
- Spec 001's and 002's setup-check tests: the Docker line shows only where `apps/site` exists.
- Spec 002's docs test: `pnpm test:visual` goes in Setup, not in the Checks list.
- Spec 002's Dependabot test: the comment uses `issues: write`.
- Spec 002's `ci.yml` text test (no `npx`, `--frozen-lockfile` installs, Corepack): the new jobs follow it.

## Order of work

Each stage runs in a fresh session started in this repo's folder.

1. **Tests (stage 5), T001–T008.** After Gate 2.
   - The spec 002 change and its relock come first (T001).
   - Then spec 003's tests, written from the scenarios and locked with `pnpm lock specs/003-skeleton-and-pipeline`.
   - Spec 003 is new on this branch, so the lock hook doesn't guard `tests/003/` until it merges, the same gap specs 001 and 002 had. The unit test that checks every spec's lock covers it, and the reviewer lists any test change after the lock commit.
2. **Build (stage 6), T009–T024.** Brad's Google Cloud and GitHub steps come just before the preview workflow is pushed, each with Brad's go-ahead.
3. **Review (stage 7), T025.**

## How each mock state is tested

| State | Locked test | Real run |
| --- | --- | --- |
| P1–P4 | `e2e/page.test.ts`: words, title, description, `lang`, each theme's colors read from computed styles. `e2e/visual.test.ts`: four snapshots | This pull request's preview, on Brad's phone and desktop, at Gate 3 |
| P5 | `e2e/page.test.ts`: one Tab stop, the link, with a visible focus ring | Preview |
| P6 | `e2e/page.test.ts`: font requests blocked, text visible, no layout shift on swap. `static/site.test.ts`: the fonts' config | — |
| C0 | `unit/gate-jobs.test.ts`: the gate's list and the mocks' order. `static/ci.test.ts`: the eight jobs | This pull request's checks, and a clean sandbox run |
| C1 | `unit/messages.test.ts`: the axe report becomes C1's message. `e2e/a11y.test.ts`: the rules and tags in use | Sandbox: a planted low-contrast token |
| C2 | `unit/messages.test.ts`. `static/visual.test.ts`: the container, no tolerance, the clock, reduced motion | Sandbox: a planted one-pixel change |
| C3 | `unit/messages.test.ts`. `static/lighthouse.test.ts`: five runs, the mobile preset, every budget | Sandbox: a planted blocking script |
| C4 | `unit/messages.test.ts`. `integration/site-checks.test.ts`: a planted lint error, unformatted file and type error each fail their command | Sandbox, one of each |
| C5 | `unit/messages.test.ts`. `integration/site-checks.test.ts`: invalid HTML and a broken anchor in a fixture build | Sandbox |
| C6 | `e2e/headers.test.ts` against the emulator. `unit/csp.test.ts`: hashes in and out of date | Sandbox: a header removed |
| V1 | `unit/preview-comment.test.ts`: one comment, found and edited. `static/preview.test.ts`: triggers, jobs, permissions | This pull request, twice: the comment edited, not repeated |
| V2 | `unit/preview-skip.test.ts`: fork, and no token URL. `static/preview.test.ts` | A pull request from a fork under the agent's account, with Brad's go-ahead. Dependabot's first pull request. |
| V3 | `unit/preview-deploy.test.ts`: a fake CLI's refusal becomes V3's message | — (recorded output only) |
| N1 | `unit/nightly-summary.test.ts`. `static/nightly.test.ts` | One run started by hand |

**Planted failures.** As in spec 002, they run in the agent's private sandbox, never in this repo (D82). Each is pushed once to a branch there, and its run's link and result go in `specs/003-skeleton-and-pipeline/evidence/ci-runs.md`. The sandbox has no Google sign-in, so its preview job skips; the preview's real runs are in this repo.

**The success criteria.**

- **SC-001:** the evidence records the median figures from this pull request's Lighthouse job. A locked test reads them against the limits.
- **SC-002:** `e2e/a11y.test.ts` in CI, both themes and both sizes.
- **SC-003:** measured over the first two weeks after the merge, from the preview runs' times. Slice 2.2's pull request reports it.
- **SC-004:** the sandbox table shows every planted failure in Stories 2 and 4 failing the gate on the first try.
- **SC-005:** `static/preview.test.ts` finds no Google key in any workflow, and the evidence records `gh secret list` and `gcloud iam service-accounts keys list --managed-by=user` for the preview account, both empty.
- **SC-006:** read from the Hosting usage page two weeks after the merge, with Brad's login, and reported in slice 2.2's pull request.

## Files the build adds

- **`apps/site/`:** `package.json`, `astro.config.mjs`, `tsconfig.json`, `eslint.config.js`, `src/layouts/Base.astro`, `src/pages/index.astro`, `src/pages/404.astro` and `src/styles/tokens.css`.
- **Root:** `firebase.json`, `.firebaserc` (project `bradthome`, no secrets), `playwright.config.ts`, `lighthouserc.json`, `.htmlvalidate.json`, `lychee.toml`, `stryker.config.json`, `.prettierrc.json` and `.prettierignore`.
- **`.github/workflows/`:** `preview.yml` and `nightly.yml`. `ci.yml` gains its eight jobs.
- **`scripts/`:** `site/csp.ts`, `site/visual.ts`, `ci/site-report.ts` (turns each tool's report into the messages), `ci/preview-credentials.ts`, `ci/preview-comment.ts` and `ci/nightly-summary.ts`. `scripts/ci/gate.ts`, `scripts/lib/messages.ts` and `scripts/setup-check.ts` change.
- **`tests/003/`:** `unit/`, `static/`, `integration/`, `e2e/` (run by Playwright in the container), `helpers/`, `fixtures/` and the snapshot baselines.
- **`specs/003-skeleton-and-pipeline/`:** `tests.lock`, and `evidence/ci-runs.md` from the build.
- **Changes:** `package.json` (the `lint`, `format`, `site:*`, `test:e2e`, `test:visual` and `csp` commands, and the exactly pinned test tools), `pnpm-workspace.yaml`, the lockfile, `vitest.config.ts` (unchanged patterns, so `e2e/` stays out of Vitest), AGENTS.md, the pull request template, the plan and the working agreement's changes since approval, the decision log, and the spec's status.

## Settings the build changes

The spec's "Settings this slice changes" lists them. Brad's Gate 2 comment approves the list. Each step still gets Brad's go-ahead when it runs (T018), with Brad's gcloud and gh logins, which are logged ([D90](../../docs/decisions/0090-log-the-agents-use-of-brads-login-instead-of-asking.md)).

| Step | Detail the plan settles |
| --- | --- |
| APIs | `iamcredentials.googleapis.com` and `sts.googleapis.com`, turned on only if off. `firebasehosting.googleapis.com` is already on. |
| Pool and provider | Pool `github`, provider `bradthome-repo`, issuer `https://token.actions.githubusercontent.com`. It maps `google.subject`, `attribute.repository_id` and `attribute.repository_owner_id`, with the condition `assertion.repository_id == '1440242332'`. |
| Service account | `preview-deployer@bradthome.iam.gserviceaccount.com`, with no keys |
| Roles | `roles/firebasehosting.admin` and `roles/serviceusage.apiKeysViewer` on the project |
| Impersonation | `roles/iam.workloadIdentityUser` on the service account, for `principalSet://…/attribute.repository_id/1440242332` only |
| Repo variables | The three names above |

## Alternatives considered

| Option | Why not |
| --- | --- |
| TypeScript 6 for the whole repo | The repo chose 7, and only the site's tools need 6. The alias keeps 7 everywhere else. |
| The TypeScript 6 alias at the root | Spec 001's locked package test wants plain version numbers at the root |
| `@astrojs/ts-content-mapper` with TypeScript 7.1 | 7.1 is in beta. Revisit when it's stable. |
| Skipping `astro check` until TypeScript 7.1 | FR-009 requires it |
| Testing headers against a deployed preview only | It depends on Google and the preview runs outside the gate. The preview's real headers are recorded once in the evidence. |
| The Hosting emulator on Windows | Its server drops every header there |
| Checking `firebase.json` as a file only | It wouldn't show what Hosting serves, which the spec asks for |
| google-github-actions/auth | Third-party code with the job's token, which D82 rules out. A repo script writes the same file. |
| FirebaseExtended/action-hosting-deploy | Needs a stored key (FR-016) |
| One preview job that builds and deploys | The site's packages would run with a Google sign-in. The split keeps them apart. |
| `pull-requests: write` for the comment | `issues: write` is enough, and spec 002 bans the other |
| Fonts from Fontsource's CDN through the Fonts API | The build would depend on a font host. The local provider reads the packages already installed. |
| A theme script with a toggle | The spec has no toggle (slice 3.1), and a script would need a CSP hash and could flash |
| Building the site again in every job | Slower, and the jobs could test different builds |
| Lighthouse on the runner's Chrome | The container's Chromium is pinned with everything else |

## Decisions

- **New record:** [D95](../../docs/decisions/0095-spec-002s-locked-tests-check-rules-instead-of-lists.md), tier 1, accepted on 2026-11-03 from Brad's answer on the plan's decision page: spec 002's locked tests check rules instead of lists.
- **Tier 3, decided here and listed in the pull request:**
  - The site package is `@bradthome/site`, and its TypeScript is the 6 API through Microsoft's documented alias. The root keeps 7.0.2.
  - ESLint and Prettier cover `apps/site` and `scripts/`, not the locked tests. `scripts/` is reformatted once, in its own commit.
  - Fonts come from the Fontsource packages through the Fonts API's local provider, Latin subset only.
  - The CSP header's hashes come from Astro's build, written into `firebase.json` by `pnpm csp`, and checked in the build job.
  - The preview's noindex comes from a generated `firebase.preview.json`.
  - Header, accessibility and snapshot tests serve the build through the Hosting emulator, in the container only.
  - Lighthouse runs in the same container.
  - The preview has three jobs, and only the deploy job holds a Google sign-in. It installs only firebase-tools.
  - A Dependabot pull request gets a preview if GitHub gives it a token, and skips with the reason if not.
  - The workload identity condition matches the repository ID, and the impersonation binding names only that repository.
  - The preview service account is `preview-deployer`.
  - The Docker line in the setup check shows only where `apps/site` exists.
  - pnpm's minimum release age gets no exceptions, and firebase-tools' two install scripts are named as not allowed.
  - Mutation testing covers `scripts/lib/` and `scripts/hooks/`.
- **Changed from the spec's assumptions:** the spec assumed "Google's auth action". The deploy signs in through the same Workload Identity Federation, with the sign-in file written by a repo script, so FR-016 and S3.2 hold unchanged. The spec's text isn't edited; this line records it.

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A pull request that edits the preview workflow deploys to the live channel (D91) | Low | CODEOWNERS and the reviewer cover `.github/`. S3.5's test fails on any workflow that names the live channel or plain `firebase deploy`. Only the deploy job holds the sign-in. |
| A compromised dependency runs with the Google sign-in | Low | The site's packages run only in the build job, which has no token. The deploy job installs only firebase-tools, pinned in the lockfile, and Dependabot's cooldown delays new releases. |
| The `@typescript/typescript6` alias breaks a tool, or pnpm resolves TypeScript 6 to an unexpected patch | Low | The lockfile pins it. `site-types` and `lint` run on every pull request. |
| The emulator's headers differ from live Hosting's | Medium | The emulator uses the same `firebase.json`. The build records the preview's real headers once, and the reviewer compares them. |
| Snapshots differ between the CI container and Docker Desktop | Medium | Same image by digest, fonts from the repo, a fixed clock, reduced motion. The first run on Brad's PC is recorded. |
| Lighthouse's median varies past a budget on a shared runner | Medium | Budgets sit under the charter's limits, five runs, and the page ships no JavaScript. A flaky run is fixed, never loosened without a spec change. |
| The gate takes too long, or the Actions minutes run out | Medium | The repo is public since slice 1.5, so standard runners are free. The build records the run time. |
| Dependabot's pull requests get no token, so they get no preview | Medium | They skip with the reason, and their checks still run (S3.3) |
| The firebase-tools auth bug from June 2026 (#10726) comes back | Low | The deploy job prints the CLI's real error lines, and V3 says how to retry |
| A version the build needs is younger than pnpm's minimum release age | Low | The build takes the release before. No exceptions. |
| Reformatting `scripts/` changes behavior | Low | Prettier changes layout only, and spec 001's and 002's locked suites run before and after |

## Tests to write and lock

Paths are under `tests/003/`. Every file ends in `.test.ts`, which the trace check reads. Vitest runs `unit/`, `static/` and `integration/`; Playwright runs `e2e/` in the container. Each test's name leads with the IDs it covers ([D78](../../docs/decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md)).

| File | IDs in its test names |
| --- | --- |
| `static/workspace.test.ts` | FR-001, FR-002 |
| `static/site.test.ts` | S1.3, S1.5, FR-002, FR-003, FR-004, FR-006 |
| `static/ci.test.ts` | S2.1, FR-007, FR-008, FR-009, FR-013, FR-021 |
| `static/visual.test.ts` | S2.4, S2.7, FR-010, FR-011 |
| `static/lighthouse.test.ts` | S2.5, FR-012 |
| `static/firebase.test.ts` | S4.1, FR-018, FR-019 |
| `static/preview.test.ts` | S3.2, S3.3, S3.5, S3.6, FR-015, FR-016, FR-017, FR-021, SC-005 |
| `static/nightly.test.ts` | S5.1, S5.2, FR-020, FR-021 |
| `static/docs.test.ts` | FR-022, FR-023 |
| `static/evidence.test.ts` | SC-001, SC-003, SC-004, SC-005, SC-006 |
| `unit/gate-jobs.test.ts` | S2.1, FR-007 |
| `unit/messages.test.ts` | S2.2, S2.3, S2.4, S2.5, S2.6, S4.1, FR-014 |
| `unit/csp.test.ts` | S4.1, FR-019 |
| `unit/preview-credentials.test.ts` | S3.2, FR-016 |
| `unit/preview-comment.test.ts` | S3.1, FR-015 |
| `unit/preview-skip.test.ts` | S3.3, FR-017 |
| `unit/preview-deploy.test.ts` | S3.4, S3.6, FR-015, FR-017 |
| `unit/nightly-summary.test.ts` | S5.1, S5.2, FR-020 |
| `integration/site-checks.test.ts` | S2.2, S2.6, FR-008, FR-009, FR-013, FR-014 |
| `integration/setup-check-docker.test.ts` | FR-022 |
| `e2e/page.test.ts` | S1.1, S1.2, S1.3, S1.4, S1.5, FR-003, FR-004, FR-005, FR-006 |
| `e2e/a11y.test.ts` | S2.3, S4.2, FR-010, SC-002 |
| `e2e/visual.test.ts` | S2.4, S2.7, FR-011 |
| `e2e/headers.test.ts` | S4.1, S4.2, S3.6, FR-018, FR-019 |

## Tasks

Tests session (stage 5):

- [ ] **T001** Spec 002's change, from D95: edit FR-002 and FR-014 in its spec to rules instead of lists, add a "changed" note linking D95, change `tests/002/static/workflows.test.ts` and `tests/002/unit/gate.test.ts` to match, run spec 002's suite against today's files, and relock with `pnpm lock specs/002-ci-and-rulesets`. One commit, `test(002): …`, naming D95. (groundwork for FR-007, FR-015, FR-020, FR-021)
- [ ] **T002** The harness: the workspace, `apps/site/package.json` with every exact pin, root test tools, `playwright.config.ts` with the container guard, and the empty configs the static tests read. No page and no workflow. (groundwork for FR-001, FR-002)
- [ ] **T003** The helpers: a fixture build (valid, invalid HTML, broken anchor, missing header), a fake Firebase CLI and a fake GitHub API on the PATH, and an event-file builder for pull requests from a branch, a fork and Dependabot. Reuse `tests/001/helpers/` and `tests/002/helpers/`. (S2.6, S3.1–S3.4)
- [ ] **T004** The static tests. (FR-001–FR-004, FR-006–FR-013, FR-015–FR-023, S1.3, S1.5, S2.1, S2.4, S2.5, S2.7, S3.2, S3.3, S3.5, S3.6, S4.1, S5.1, S5.2, SC-001, SC-003–SC-006)
- [ ] **T005** The unit tests: the gate's jobs, the messages, CSP, the preview's credentials, skip, deploy and comment, and the nightly summary. (S2.1–S2.6, S3.1–S3.4, S3.6, S4.1, S5.1, S5.2, FR-007, FR-014–FR-017, FR-019, FR-020)
- [ ] **T006** The integration tests: the site checks on the fixture build, and the setup check's Docker line. (S2.2, S2.6, FR-008, FR-009, FR-013, FR-014, FR-022)
- [ ] **T007** The end-to-end tests for Playwright: page, accessibility, snapshots (baselines come at the build) and headers. (S1.1–S1.5, S2.3, S2.4, S2.7, S3.6, S4.1, S4.2, FR-003–FR-006, FR-010, FR-011, FR-018, FR-019, SC-002)
- [ ] **T008** Confirm coverage and lock. (D21)
  1. Run `pnpm trace specs/003-skeleton-and-pipeline`, and have a fresh-context subagent confirm every ID.
  2. Run the suites once, to check each test fails for a missing module or file, not a syntax error.
  3. Run `pnpm lock specs/003-skeleton-and-pipeline`, commit `test(003): lock the tests for spec 003`, and push.

Build session (stage 6):

- [ ] **T009** The site: Astro, React, Tailwind, Motion, the layout, both pages, the tokens and the fonts. (FR-002–FR-006, S1.1–S1.5)
- [ ] **T010** `firebase.json`, `pnpm csp`, and the preview config writer. (FR-018, FR-019, S3.6, S4.1)
- [ ] **T011** ESLint and Prettier, then the one-time `style(003)` reformat of `scripts/`, with spec 001's and 002's suites passing. (FR-008)
- [ ] **T012** The messages and `scripts/ci/site-report.ts`. (FR-014, S2.2–S2.6)
- [ ] **T013** The container, `pnpm test:visual`, and the first baselines, made in the container. (FR-010, FR-011, S2.4, S2.7)
- [ ] **T014** Lighthouse CI, html-validate and lychee configs. (FR-012, FR-013, S2.5, S2.6)
- [ ] **T015** The eight `ci.yml` jobs and the gate's list. (FR-007, FR-009, FR-021, S2.1)
- [ ] **T016** The setup check's Docker line. (FR-022)
- [ ] **T017** The preview scripts and `preview.yml`. (FR-015–FR-017, FR-021, S3.1–S3.6)
- [ ] **T018** Brad's settings, one go-ahead each, in the spec's order, with the details above. Then record the key check. (S3.2, SC-005)
- [ ] **T019** The nightly workflow, its summary, and StrykerJS. (FR-020, S5.1, S5.2)
- [ ] **T020** The sandbox: push the branch, run each planted failure and a clean run, and sweep the logs. (SC-004)
- [ ] **T021** Push to this pull request: its checks, its first preview, a second push that edits the comment, and the preview's real headers. Then, with Brad's go-ahead, a pull request from a fork under the agent's account. (S2.1, S3.1–S3.3, SC-001)
- [ ] **T022** The docs: AGENTS.md, the pull request template, the plan, the working agreement, the decision log and the spec's status. (FR-023)
- [ ] **T023** The evidence: the sandbox table, the Lighthouse medians, the preview runs and the key check. (SC-001, SC-004, SC-005)
- [ ] **T024** The full check: the tests, the type check, trace, the lock check, `pnpm setup:check`, `pnpm ruleset:check` and the hand-run checks. Then push and update the pull request. (every ID)

Review session (stage 7):

- [ ] **T025** Review with the pinned reviewer through the review skill, fix or answer each finding, then mark the pull request ready for Gate 3.

## Preview and rollback

This slice builds the preview, so its own pull request shows the first one: the empty page on `pr-12`, in both themes, at Gate 3. The live channel isn't touched.

To undo it after merging:

1. Revert the squash commit. Previews stop, and their channels expire within 7 days, or are deleted with `firebase hosting:channel:delete`.
2. With Brad's login, delete the impersonation binding, the service account, then the provider and the pool, and the three repo variables.
3. The two APIs can stay on. They cost nothing unused.

## Approval

- Gate 2: approved by Brad on 2026-11-03 ([comment on #12](https://github.com/memorex386/bradthome/pull/12#issuecomment-6606858514)), on the committed plan. The approval also covers [D95](../../docs/decisions/0095-spec-002s-locked-tests-check-rules-instead-of-lists.md)'s change to spec 002 and the settings this plan lists.
