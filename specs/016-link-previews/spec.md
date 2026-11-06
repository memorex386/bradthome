# Spec 016: Link previews

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Status          | Approved                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Slice           | 3.8 Link previews                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Branch          | `016-link-previews`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Mocks and flows | [mocks/README.md](mocks/README.md): the cards themselves, on `/v2` and `/design-system#previews` on this pull request's preview, with each state listed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Decisions       | [D143](../../docs/decisions/0143-app-store-cards-show-a-rating-only-from-100-ratings.md)–[D151](../../docs/decisions/0151-spec-003s-script-check-searches-without-a-tag-regex.md), from this slice. It builds on D48 (previews are committed and refreshed by a scheduled pull request; LinkedIn and Play are written by hand), D50, D118–D127 and D133, on spec 003's Content-Security-Policy, spec 005's content model and spec 009's receipts. |

## Summary

A link to GitHub, LinkedIn, an app's store page or one of Brad's sites shows a small card of what's behind it before a visitor follows it: an image or badge, a title, a line, a few facts, where it goes, and where and when its words came from. On a desktop the card opens on hover or keyboard focus; on a phone a tap opens it as a sheet and doesn't follow the link. With no script, every link is a plain link.

GitHub's and the App Store's cards are snapshots, fetched from their public APIs by `pnpm previews:refresh` and committed with their images resized. LinkedIn's and Google Play's cards, and the sites', are written by hand from public claims and the job and project files, since neither LinkedIn nor Google Play has a public API and the site never scrapes them. Nothing is fetched while a visitor views a page, and no request for a preview leaves the visitor's browser. A weekly workflow refreshes the snapshots and, when one changed, opens a pull request for Brad's merge with a GitHub App's token, so CI and the preview run on it. Previews show on phase 3's pages only, which a release build leaves out.

## Scope

**In:**

- The data: `apps/site/content/previews/snapshots.json` and `cards.yaml`, their schemas in `apps/site/src/content/previews.ts`, two content collections, and the images in `apps/site/public/previews/`.
- The cards: `apps/site/src/components/previews/` (`PreviewLink.astro`, `PreviewCard.astro`, `cards.ts`, `data.ts`, `previews.client.ts`) and `apps/site/src/styles/previews.css`.
- Where they show: the design system's header (GitHub and LinkedIn, on a desktop and in the phone's menu), every proof receipt's evidence link that has a card, and the side projects' site links, on `/v2` and the role pages. The design system's gallery shows each kind held open.
- The refresh: `scripts/previews/` and `pnpm previews:refresh`, and `.github/workflows/previews.yml`.
- The release build leaves the previews' images and script out, as it leaves out phase 3's pages.
- Specs 002 and 003 amended and relocked (D148, D149), and specs 009–014's no-script checks allowing the one module (D147).
- Tests in `tests/016/`, with snapshot baselines from the pinned container.

**Out:**

- Facts with no public source: the board's contribution heatmap and count (D144), and the repos (D150), download counts and ratings beyond the claims and the snapshot's rating (D143), LinkedIn's headline and follower count, and Brad's city on the cards.
- Previews for the site's own pages (the case study, the résumé PDFs), the ask-me email link and v1's pages, which stay word for word as live.
- Fetching anything while a visitor views a page, or scraping LinkedIn or Google Play.
- Creating the GitHub App, its variable and its secret, which Brad does (D146).
- Motion.

## User stories and acceptance scenarios

The IDs in brackets, such as (L1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: See what's behind a link before following it (P1)

A recruiter reading a claim should be able to see what its proof link holds, and where it goes, without leaving the page.

**Why this priority:** it's the slice.

**Independent test:** open `/v2` on a desktop and a phone, and hover, focus and tap each previewed link.

- **S1.1** Given a desktop 1280 pixels wide, when the pointer rests on the header's GitHub link for 300 ms, then its card opens below the link, and it stays open while the pointer moves onto the card; 200 ms after the pointer leaves both, it closes (L1, L2).
- **S1.2** Given the keyboard, when Tab reaches a previewed link, then its card opens at once; Tab onward closes it; Escape closes it and focus stays on the link. Focus never moves into a hover or focus card, so the Tab order is the page's own (F1, F2).
- **S1.3** Given a phone 390 pixels wide, when a visitor taps a previewed link, then its card opens as a sheet along the bottom of the screen and the page doesn't navigate. Focus moves to the sheet's Open button, which follows the link. Close, Escape or a tap outside the sheet closes it and puts focus back on the link (T1, T2).
- **S1.4** Given any open card, then it never covers its link: a hover or focus card sits below the link, or above it when there's no room below, inside the viewport; a sheet scrolls the page so the link sits above it.
- **S1.5** Given a browser with JavaScript off, then every previewed link is a plain link that goes where it says, and no card shows.
- **S1.6** Given `/v2`, then these links have a card: the header's GitHub and LinkedIn, on a desktop and in the phone's menu; each proof receipt's evidence link to Google Play, the App Store, vindecoded.com or sudokuworld.app; and the side projects' links to vindecoded.com and sudokuworld.app. The case study link, the ask-me email link, the résumé and every in-page link have none.

### Story 2: Every card says where its words came from (P1)

**Why this priority:** the repo and site are public, and every fact on the site has a source (D129).

**Independent test:** read every card's text against the snapshots, the hand-written cards, the claims and the job and project files.

- **S2.1** Given the GitHub snapshot, then its card shows the avatar, name, username and bio, the public repo count, `github.com`, and "Snapshot from GitHub, <date>" with the snapshot's date (D145, D150) (L1).
- **S2.2** Given an App Store snapshot, then its card shows the app's icon, its store name, seller and category, the description's opening sentences, `apps.apple.com`, and "Snapshot from the App Store, <date>" (L3).
- **S2.3** Given an App Store snapshot with at least 100 ratings, then its card adds "Rating: <r> stars · <n>+ ratings", the rating to one decimal and the count rounded down to two significant figures; with fewer, it shows no rating (D143).
- **S2.4** Given a hand-written card, then its title is its job or project file's name, or "Brad Thome" for LinkedIn, the page's own public title; its line is copied from a public claim; its rows are job and project files with their years; and it says "Written by hand, <date>" with the date it was written (L2, L4).
- **S2.5** Given a link whose snapshot is missing, then its card shows the missing state: the link's host, a line saying there's no snapshot yet and the link opens the page itself, and "No snapshot yet". It's never blank (L5).

### Story 3: Previews make no outside request (P1)

**Why this priority:** spec 003's Content-Security-Policy allows `'self'` only, and a visitor's browser talks to no third party.

**Independent test:** load `/v2` and open every card while recording the network.

- **S3.1** Given `/v2`, when every card is opened in turn, then every request the page makes is to its own origin.
- **S3.2** Given the build, then each card's image is served from `/previews/`, named by its content's hash; the previews' script is one file under `/_astro/`, never inline; and `firebase.json`'s Content-Security-Policy is the one `pnpm csp` writes, still `'self'` with no other host and no new script hash.
- **S3.3** Given a release build, with `BRADTHOME_RELEASE=1`, then it has no `previews/` folder, no previews script and no page with a previewed link, and v1's pages ship no script.

### Story 4: The snapshots refresh themselves, by pull request (P2)

**Why this priority:** the cards should stay true without Brad's hands, and never change main without Brad's merge (D48).

**Independent test:** run the refresh and the pull request script on recorded responses and a fake GitHub.

- **S4.1** Given a source whose data changed, then the refresh writes its snapshot with today's date and its image, removes images no snapshot names, and reports `changed=true`; the workflow then opens one pull request, from a new `previews/refresh-<date>` branch with one commit made through GitHub's API, never touching main.
- **S4.2** Given every source unchanged, then the refresh writes nothing, keeps every date, reports `changed=false`, and no pull request opens.
- **S4.3** Given a source that fails, then it keeps its last snapshot, the others still refresh, the report names it, and the run fails at its end so Brad sees it. A card never blanks.
- **S4.4** Given an open refresh pull request, then a new run opens no second one.
- **S4.5** Given the workflow, then it runs weekly and by hand, reads with a read-only token, makes the App's token only when something changed, pins every action by commit, and never merges or approves (D146, D149).

### Story 5: The cards are accessible in both themes (P2)

**Independent test:** axe, contrast and layout shift on `/v2` and the gallery, with cards open, in both themes.

- **S5.1** Given each card state in light and dark, then axe finds no violation at WCAG 2.2 AA, with the target-size rule on, and the sheet's buttons are at least 44 pixels tall.
- **S5.2** Given every text color on a card against its background, in both themes, then the contrast is at least 4.5:1.
- **S5.3** Given `/v2`, then opening and closing cards shifts nothing: the page's layout shifts add up to 0, and Lighthouse's median Cumulative Layout Shift stays 0. The cards have no animation.
- **S5.4** Given the pinned container, then the cards match their baselines: GitHub on hover and LinkedIn on focus on a desktop, a sheet on a phone, in light and dark, and the gallery's section.
- **S5.5** Given `/design-system#previews`, then the gallery holds open a GitHub snapshot, an App Store snapshot with its rating, LinkedIn's and Google Play's hand-written cards, the missing state and a sheet.

## Requirements

- **FR-001** `PreviewLink.astro` MUST render a plain link, followed by its card as a hidden popover made of phrasing elements, when the link has a snapshot or a hand-written card, and a plain link alone when it has neither.
- **FR-002** The cards MUST open and close as S1.1–S1.3 say, from one first-party module, bundled as one file and never inline, which only adds to plain links (D147).
- **FR-003** A card MUST never cover its link (S1.4), and MUST never trap focus.
- **FR-004** The snapshots MUST come only from GitHub's public REST API, for Brad's profile, and Apple's public lookup API, for each App Store ID the claims' evidence links, and MUST match the schemas in `content/previews.ts`.
- **FR-005** Each hand-written card MUST take its title from a job or project file, or Brad's name, its line from a public claim's text, and its rows from job and project files, and MUST carry the date it was written.
- **FR-006** An App Store card MUST show a rating only from 100 ratings, rounded as S2.3 says (D143).
- **FR-007** A link whose snapshot is missing MUST show the missing state, never an empty card.
- **FR-008** No preview MUST make a request to another host. Images MUST be self-hosted under `public/previews/`, resized to 112 pixels square as WebP, and named by their hash, and the Content-Security-Policy MUST gain no host and no script hash.
- **FR-009** A release build MUST leave out the previews' images and script with phase 3's pages.
- **FR-010** `pnpm previews:refresh` MUST change a snapshot and its date only when its data changed, keep a failing source's last snapshot, report each change and failure, and exit 1 when a source failed.
- **FR-011** `.github/workflows/previews.yml` MUST run weekly and by hand, and open a pull request only when a snapshot changed and none is open, with the GitHub App's token from `vars.PREVIEWS_APP_CLIENT_ID` and `secrets.PREVIEWS_APP_KEY`, on a new branch, never on main (D146).
- **FR-012** The cards MUST pass WCAG 2.2 AA in both themes, with 4.5:1 text contrast and 44-pixel sheet buttons, and MUST shift no layout and have no motion.
- **FR-013** Specs 002 and 003 MUST be amended and relocked as D148 and D149 say, and specs 009–014's no-script checks MUST allow exactly the previews' module.
- **FR-014** The docs MUST record D143–D149, mark slice 3.8 in the plan, and name the previews workflow and `pnpm previews:refresh` in AGENTS.md.

## Success criteria

- **SC-001** Every word on every card on `/v2` traces to a snapshot field, a hand-written card whose words trace to a public claim or a job or project file, or the card's own labels.
- **SC-002** With every card on `/v2` opened, the page makes 0 requests to another host.
- **SC-003** axe reports 0 violations at WCAG 2.2 AA across the card states, in both themes.
- **SC-004** Opening cards adds 0 layout shift, and the previews' script is under 4 KB. Since specs 017 and 018 share the one module, its test allows their budgets on top: under 1 KB for the copy button and 2.5 KB for the analytics.
- **SC-005** The refresh's three paths, changed, unchanged and failing, and the pull request's three, opened, none and already open, each have a passing test on recorded data, with no live call.

## Edge cases

- A GitHub bio or app description with a private term would reach the site through a snapshot. The refresh's pull request runs `ci / privacy` like any other, so Brad sees it fail before merging.
- Apple serves icons from shards `is1` to `is5`; one that resets the connection is skipped for the next.
- An App Store ID that leaves the claims drops its snapshot and image at the next refresh.
- A refresh that finds a change while an earlier refresh pull request is open opens nothing; the next run after Brad merges or closes it picks the change up.
- Until Brad adds the App's variable and secret, a run that finds a change fails at the token step, after reporting what changed.
- A pointer that hovers a link already open by keyboard focus leaves the card as it is.

## Approval

- Gate 1: approved by Brad in the session on 2026-11-05, with the plan and mocks ([recorded on #47](https://github.com/memorex386/bradthome/pull/47#issuecomment-6672091558)).
- Changed after Gate 1, on 2026-11-05: the GitHub card shows Brad's profile only, with no repos, and the snapshot no longer fetches them. S2.1 and FR-004 changed. Brad chose this on a choice card in the career session ([D150](../../docs/decisions/0150-the-github-card-shows-the-profile-only.md)), which supersedes the repos half of D144.
- Changed in spec 018 (slice 3.10), on 2026-11-05: SC-004's size check measures the one module, which now also holds spec 017's copy button and spec 018's analytics, so `tests/016/e2e/previews.test.ts` allows their budgets on top of the previews' 4 KB. The previews' own code is unchanged. A detail of spec 018's approved plan, which put the analytics in this module (D155).
- Changed in spec 019 (slice 3.11), on 2026-11-06: v2.0 retires the release flag (D127) and moves the new home from `/v2` to `/` ([D162](../../docs/decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)). This spec's tests that expected a release build to leave phase 3 out, or named `/v2`, now expect the release build to be the same build as every other and read `/`.
