# Plan for spec 016: Link previews

|        |                                                     |
| ------ | --------------------------------------------------- |
| Spec   | [spec.md](spec.md), for approval with it at Gate 1  |
| Status | Approved                                             |

## Approach

The cards are data-driven, like spec 013's section: one pure function, `cardOf()`, turns a link and the committed data into what its card shows, so the static tests can trace every word.

- **Data (FR-004–FR-007).** `content/previews/snapshots.json` holds the snapshots, keyed `github` and `appstore-<id>`; `content/previews/cards.yaml` holds the hand-written cards, keyed by name, each naming its claim and files. `src/content/previews.ts` has their schemas, strict like spec 005's, and the helpers the build, the refresh and the tests share: which snapshot a link previews from, and the rating's rounding. `content.config.ts` adds two collections, `previewSnapshots` and `previewCards`.
- **Cards (FR-001, FR-006, FR-007).** `components/previews/cards.ts`'s `cardOf()` finds a link's snapshot or hand-written card and builds its view: title, subtitle, image or badge, line, repos, rows, host, provenance and the Open label. A missing snapshot gives the missing state. `PreviewCard.astro` renders a view as spans, so it can sit after a link in a paragraph, as a popover with `role="dialog"`; with `still` the gallery shows it open.
- **Links (S1.6).** `PreviewLink.astro` renders the link and, when `cardOf()` finds one, its card right after it, with an ID from its place on the page. The header, `HopperClaim.astro`, `SideClaim.astro` and `Side.astro` use it for the links S1.6 names.
- **Behavior (FR-002, FR-003, D147).** `previews.client.ts` is the one script. It wires each `a[data-preview]` to its card when the browser supports popovers: hover with a mouse after 300 ms, closing 200 ms after the pointer leaves the link and the card; keyboard focus at once; a touch or pen tap opens the sheet and cancels the navigation. The browser's popover gives Escape and the tap outside. Placement is computed from the link's box and set through the style object, which the Content-Security-Policy allows; a sheet scrolls the page instead. `astro.config.mjs` keeps the script out of line, so it adds no CSP hash.
- **Release (FR-009).** `scripts/site/release-pages.ts` gains `dropPhase3Assets()`, which removes `previews/` and the previews' script from a release build.
- **Refresh (FR-010).** `scripts/previews/refresh-lib.ts` fetches through an injected fetcher and resizer: GitHub's user and repos, and each App Store ID from the claims' evidence. A snapshot whose data, less its date, matches the committed one is kept as it is; a changed one gets today's date and a new image, named by its hash; a failing one keeps the old. `refresh.ts` wires in `fetch`, sharp (resize to 112 pixels, WebP) and the files, and writes the step's `changed` output.
- **Pull request (FR-011, D146).** `scripts/previews/open-pr-lib.ts` takes the changed files and a GitHub client: it returns early when nothing changed or a refresh pull request is open, otherwise creates `previews/refresh-<date>` from the run's commit, commits through GraphQL's `createCommitOnBranch` (signed by GitHub), and opens the pull request. It refuses any changed file outside the snapshots and images. `.github/workflows/previews.yml` runs it with the App's token on Mondays at 13:23 UTC and by hand.
- **Specs 002, 003 and 009–014 (FR-013).** Spec 003's FR-002 and its static check allow the previews' one `<script>`, and spec 002's FR-015 and its check allow the previews workflow's one `permission-pull-requests: write`; both are relocked (D148, D149). The script-count checks in specs 009–014's end-to-end tests allow exactly the previews' module.
- **Docs (FR-014).** D143–D149, the plan's 3.8 row and log, AGENTS.md's workflows and scripts.

## Why these sources

- **GitHub:** the public REST API's `/users/{login}` is GitHub's documented, stable way to read a public profile, and need no token. The workflow passes its own read-only token only to raise the rate limit.
- **App Store:** Apple's lookup API (`itunes.apple.com/lookup?id=`) is Apple's public, keyless way to read a listing; App Store Connect's API needs a key and covers only the seller's own data.
- **LinkedIn and Google Play** have no public API for a profile or a listing, and both forbid scraping, so their cards are written by hand (D48).

## Tests

`tests/016/`, written from the scenarios, not locked:

- `static/cards.test.ts`: `cardOf()` on the real data, every word against its source (SC-001); on planted data, the missing state, the rating threshold and rounding, a hand-written card naming a missing file; which links get a card; the schemas; the docs.
- `unit/refresh.test.ts`: the refresh on recorded GitHub and Apple responses in `tests/016/fixtures/`: changed, unchanged and failing sources, image names, removed apps, the summary's sentences.
- `unit/open-pr.test.ts`: the pull request script with a fake GitHub: opened, nothing changed, already open, a file outside the refresh's paths; the workflow's triggers, steps, token and pins.
- `static/release.test.ts`: `dropPhase3Assets()` on a planted build.
- `e2e/previews.test.ts`: hover, focus, Escape, tap, Close, focus return, placement, the links that have cards, no outside request with every card open, one external script, no layout shift, contrast in both themes, the gallery.
- `e2e/nojs.test.ts`: with JavaScript off, the links navigate and no card shows.
- `e2e/a11y.test.ts`: axe in each card state, both themes.
- `e2e/visual.test.ts`: the baselines, made with `pnpm test:visual tests/016 --update` in the pinned container, and spec 009's gallery and spec 010's whole-page baselines made again.

## What exists today

- `components/ds/Header.astro` and the receipts in `HopperClaim.astro` and `SideClaim.astro`, from specs 009–013.
- `content/claims.yaml`'s evidence links (D133) and the job and project files, from spec 005.
- `scripts/site/release-pages.ts`, from spec 010, and `pnpm csp`, from spec 003.

## Alternatives considered

| Option                                          | Why not                                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Fetch the cards in the browser                  | Every view would call GitHub and Apple, the CSP would need their hosts, and a visitor's browser would talk to third parties. |
| Unfurl Open Graph tags at build time            | Every build would depend on outside sites, LinkedIn and Google Play block it, and a failure would break the build.           |
| One card per page, moved next to the open link  | Simpler markup, but a link's card wouldn't follow it in the DOM, which screen readers and the no-script fallback rely on.     |
| A third-party tooltip library                   | It would add far more script than the 2 KB this needs, for behavior the popover API now gives.                               |
| Commit to main from the workflow                | D48 and the ruleset: every change reaches main through Brad's merge.                                                         |

## Risks

- The weekly pull request is noise if Apple's rating count crosses a rounding step often. The rounding to two significant figures keeps that to a few a year.
- A browser with no popover support gets plain links; that's under 5% of visitors today.
- The App isn't there until Brad makes it. Until then a changed snapshot fails the run at the token step, and the report says what changed.

## Tasks

- T001 The data, schemas and collections, and the first real snapshots.
- T002 `cardOf()`, `PreviewCard.astro` and `PreviewLink.astro`, wired into the header, receipts and side links.
- T003 `previews.client.ts` and the styles.
- T004 The release build's drop.
- T005 The refresh, the pull request script and the workflow.
- T006 Specs 002 and 003 amended and relocked; specs 009–014's script checks.
- T007 The tests in `tests/016/` and the baselines.
- T008 The docs.
