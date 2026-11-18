# Spec 041: VINDecoded's card, cleaner and live

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Track           | Full                                                                                                                                                                                                                                                                                                                     |
| Status          | Approved                                                                                                                                                                                                                                                                                                                 |
| Slice           | 5.14 VINDecoded's live card (Brad's ask of 2026-11-17, after reading the card on live v2.10.0)                                                                                                                                                                                                                           |
| Branch          | `041-vindecoded-pulse`                                                                                                                                                                                                                                                                                                   |
| Gate 1          | Brad's cards of 2026-11-17: refresh on read, hourly; the weekly dated PR count; the two empty secrets; the words as drafted; a 2,304-byte allowance (1,024 gzipped); `/privacy`'s three points; the PDFs print `vindecoded-2`, `-3` and `-4`; no new claims. Spec and plan approved the same day                         |
| Mocks and flows | [mocks/README.md](mocks/README.md): every state, captured from this slice's own build                                                                                                                                                                                                                                    |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                                                                |
| Decisions       | D239, the card's new shape, amending [D132](../../docs/decisions/0132-vindecoded-is-a-side-project-on-a-lean-card.md); D240, live numbers from the site's own API. It builds on D133, D143, D146, D147, D156, D170, D175, D182–D185, D211, D228, D229, D230 and D233, and on specs 013, 016, 020, 021, 033, 038 and 040. |

## Summary

On 2026-11-17 Brad read VINDecoded's card under "On the side" on live v2.10.0 and asked for a card that's cleaner to read, worth more to a future employer, and live where it can be. Today's card shows the downloads twice (as two stats, then as a sentence), the case study's four counts as a list frozen at Oct 28, and nothing that says the product still ships. In the career session's study the same day Brad chose direction B, "Live pulse", on four cards: the App Store and GitHub's merged-PR count as live sources, fetched by the site's own API and never by a visitor's browser; one activity tile; and the case study's counts as one line linking it.

This slice rebuilds the card as the study's mock draws it: the icon, name and kicker; `vindecoded-2` as its one sentence; three tiles (the downloads, the latest iOS release, and the PRs merged in the last 30 days); the stack from `vindecoded-4` as tags beside `vindecoded-5`'s AI features; one line of the case study's counts; and a footer with a quiet live line, "How this works", and the links. A new read-only route on the chat API, `GET /pulse`, answers the release and the count from a Firestore cache that it refreshes at most once an hour. The card is built with the weekly snapshots' numbers, so it reads whole with no script and when the API is down, and swaps in the API's as it nears the viewport.

## Scope

**In:**

- The card: `components/home/side.ts` (VINDecoded's look and its words), `Side.astro`, a new `SidePulse.astro`, `SideClaim.astro`'s heading, `styles/home/side.css`, and a new `pulse.client.ts` in the one module.
- The API: a new `apps/chat-api/src/pulse.ts`, the route in `app.ts`, the Firestore cache in `firestore.ts`, its log line in `log.ts`, `server.ts`, `constants.ts`, and the deploy script's secrets and read-back.
- The build's numbers: a new `content/previews/pulse.json` holds the latest iOS release and the weekly merged-PR count, from `pnpm previews:refresh`.
- `/privacy`'s words, the résumé PDFs' VINDecoded lines, the chat's corpus anchors, and the evals' cases.
- Records D239 and D240, slice 5.14 in `docs/plan.md`, new tests in `tests/041/`, and the tests and baselines that pin today's card.

**Out:**

- Google Play's numbers, which have no public API: 1M+ and 4.5 stay as `vindecoded-3` writes them (D48).
- Android vitals, Sentry, and the share of PRs from agent branches (Brad's cards).
- Sudoku World's and bradthome.com's cards, and the order of the page: VINDecoded stays a side project after Hopper and Experience (D132).
- The chat's prompt, model and limits. It answers from the corpus, never from `/pulse`.
- The deploy and a release. The route reaches Cloud Run only by `pnpm chat-api:deploy`, on Brad's own go-ahead (D185), and a release needs Brad's separate go-ahead after it.

## User stories and acceptance scenarios

The state IDs in brackets are the captures in [mocks/README.md](mocks/README.md). "Today" in a scenario is the fake clock the tests set: 2026-11-17 at 15:12 UTC.

### Story 1: The card reads as Brad chose (P1)

A hiring manager skimming "On the side" should see in a few seconds that VINDecoded has real users, still ships, and what Brad built in it, without reading it as the page's headline.

**Why this priority:** it's Brad's ask.

**Independent test:** open `/` and each role page at 375 × 812 and 1440 × 900, in light and dark, with the API's fake answering.

- **S1.1** Given the home at 1440 × 900, then `#side-vindecoded` shows, in order: the App Store icon, the level-3 heading "VINDecoded" and the kicker "Vehicle research · since 2015"; `vindecoded-2` as written, ending with its sparkle; three tiles; "What I built" and "AI in production" side by side; the case study's line; and the footer (M1).
- **S1.2** Given the tiles, then they're a description list of three: "Downloads" with "1.4M+" and "Android 1M+ ★4.5 · iOS 400K+ ★4.7" ending with `vindecoded-3`'s sparkle; "Latest iOS release" with the version and "Shipped" and its day; and "Merged PRs" with the count and "In the last 30 days" (M1).
- **S1.3** Given "What I built", then it's a level-4 heading over a tag list named "VINDecoded, what I built" holding React/TypeScript web app, Native Android and iOS, Node.js/TypeScript API, SQL, Firebase and Azure, followed by `vindecoded-4`'s sparkle; and given "AI in production", then it's a level-4 heading over `vindecoded-5`'s two items as a list and its closing sentence, ending with its sparkle, with the claim's lead line not shown (M1).
- **S1.4** Given the case study's line, then it reads "From the case study, Oct 28: 1,530 test files · 113 runbooks · 46 ADRs", ends with `vindecoded-7`'s sparkle, which asks about the claim's lead and those three counts, and is followed by "Read the case study", linking `/vindecoded-agents`; "1,235", "83%" and the claim's closing rule don't show anywhere on the card (M1).
- **S1.5** Given the footer, then it shows the live line, the "How this works" button, and the links vindecoded.com, App Store and Google Play, whose targets are `vindecoded-2`'s and `vindecoded-3`'s evidence, each with its preview card (spec 016) (M1).
- **S1.6** Given the card's claims, then each of `vindecoded-2`, `-3`, `-4`, `-5` and `-7` carries its `receipt-` anchor and ends with one sparkle named by its title, made of its own words, and no other part of the card has a sparkle (D229, D230).
- **S1.7** Given `/mobile`, `/fullstack` or `/ai`, then the card is the same as the home's (M2).
- **S1.8** Given a phone 375 or 320 pixels wide, then the tiles stack, "What I built" sits above "AI in production", the links wrap, and the page never scrolls sideways (M1, M2).
- **S1.9** Given the section, then Sudoku World's and bradthome.com's cards don't change, and VINDecoded's card keeps its App Store icon (D233) and its `side-vindecoded` anchor.

### Story 2: Every word is a claim's, or one Brad approved (P1)

**Why this priority:** the site is public, and every sentence on the page is a public claim as written (D129).

**Independent test:** read the built card's text against `content/claims.yaml` and the approved words.

- **S2.1** Given the build, then the downloads tile's numbers and stores, each tag, and each of the case study's items are words of their claims, and a planted look whose tag or item its claim doesn't hold fails the build.
- **S2.2** Given the card, then every word that isn't a claim's is one of `PULSE`'s, exactly as Brad approved them at Gate 1 (below), or a live number, a day, an age or a store's name.
- **S2.3** Given the "Merged PRs" tile, then it says no more than its source: no word about reviews (the study's "each reviewed" draft is dropped).
- **S2.4** Given the tiles' and the line's words, then none names the repo, a branch, a title or a person, and none calls Brad "one engineer" or the work "a team of AI agents" (D132).

### Story 3: The card swaps in live numbers, and never breaks (P1)

**Why this priority:** live numbers are what Brad chose, and the card must read whole whatever the API does.

**Independent test:** the e2e tests route the API's address to a fake, set the clock, and read the card.

- **S3.1** Given the home with script, then the page sends no request to the API until the card is within 600 pixels of the viewport, and then exactly one `GET /pulse`, to the chat API's own address; a visit that never comes near "On the side" sends none.
- **S3.2** Given the fake answering both sources, fetched 15:00 UTC, then the release tile reads "v12.7.8" and "Shipped Nov 10, 7 days ago", the merged tile the answer's count, the iOS stars the answer's rating, a dot follows each live tile's label, and the line reads "Live from the App Store and GitHub · updated 12 min ago" (M1).
- **S3.3** Given the fake answering the App Store only, then the merged tile keeps its built count with no dot, and the line reads "Live from the App Store · updated 12 min ago · GitHub as of" the built day (M5).
- **S3.4** Given the API down, refusing, slow or answering something unreadable, then the card keeps every built number, "Shipped" and the release's day with no age, shows no dot and no error, and the line reads "From the App Store and GitHub · as of" the built day (M4).
- **S3.5** Given no script, then the card shows the built numbers, "Shipped" and the release's day with no age, and the dated line; "How this works" doesn't show (M3).
- **S3.6** Given "How this works", then it's a button with `aria-expanded` and `aria-controls`; pressing it opens a panel with the note, the three steps (the sources, the site's API, this card) as an ordered list, and "Read the code on GitHub" linking `apps/chat-api/src/pulse.ts` in the public repo; pressing it again closes it (M6).
- **S3.7** Given the numbers swapping while the card is in view, then nothing moves: no animation with or without reduced motion, the tiles and the line keep their size, and layout shift stays 0. The line is plain text, never a live region.
- **S3.8** Given the build, then the release tile's version and day and the count come from `content/previews/pulse.json`, the iOS stars from the App Store snapshot (only from 100 ratings, D143), and the line's day is the older of the file's two days.

### Story 4: The site's own API answers, and bounds its calls (P1)

**Why this priority:** no visitor may reach Apple or GitHub, and no number of visits may raise the calls to them or their cost.

**Independent test:** `tests/041/` runs the app with a memory store and fakes of Apple and GitHub; nothing calls either.

- **S4.1** Given `GET /pulse` with an allowed origin (bradthome.com, a preview or `next`, D183), then it answers 200 JSON `{ appStore: { version, released, rating, ratings, fetched }, github: { merged, days: 30, fetched } }`, with that origin in `Access-Control-Allow-Origin`, `Vary: Origin` and `Cache-Control: public, max-age=300`; given any other origin or none, then 403 with no body.
- **S4.2** Given each source's cache tried less than an hour ago, then the answer comes from the cache and nothing calls Apple or GitHub.
- **S4.3** Given a source's cache over an hour old and many requests together, across instances, then one claims the refresh in a Firestore transaction and calls the source once; the others answer the cache. Over any hour, each source is called at most once.
- **S4.4** Given a source that fails or takes over 4 seconds, then the answer gives its last good numbers with their fetch time, or leaves it out when it has none, and the route still answers 200; a store that fails answers what it has, or nothing. `/pulse` never answers 5xx.
- **S4.5** Given no token or no repo, then nothing calls GitHub and the count is the last cached, or left out.
- **S4.6** Given GitHub's closed pull requests, newest update first, then the count is those merged in the 30 days before now; it reads only `merged_at` and `updated_at`, stops at the first page reaching past the window, reads at most 20 pages, and the answer holds the count and nothing else of the repo.
- **S4.7** Given Apple's lookup, then the answer has the version and release day, and the rating and its count only from 100 ratings (D143).
- **S4.8** Given a refresh, then the API writes one numbers-only line: `pulse.refresh`, the source, `refreshed`, `failed` or `missing`, and the milliseconds; nothing per visit, and never the count, the repo, the token or a visitor's address (D175).
- **S4.9** Given the deploy, then the service reads the token and the repo only from the Secret Manager secrets `pulse-github-token` and `pulse-github-repo`, which only its service account can read; it mounts each only once it has a version, and reads the service back to check them; the repo's name is nowhere in the repo.

### Story 5: The weekly refresh keeps the built numbers current (P2)

- **S5.1** Given `pnpm previews:refresh`, then `pulse.json` takes VINDecoded's current version and release day from Apple's lookup, with the day they changed, and the App Store snapshots don't change shape, so the link previews' dates don't move with each release.
- **S5.2** Given the deployed API, then the refresh reads `/pulse` as bradthome.com, never GitHub, and writes the count to `pulse.json` with the day, only when it changed; a source that fails keeps its last numbers and fails the run, as a failing source does; an API answer without a count keeps the last count and is reported, without failing.

### Story 6: The PDFs keep two pages (P1)

- **S6.1** Given each résumé PDF, then VINDecoded prints `vindecoded-2`, `-3` and `-4` as bullets, the platform, the downloads and the stack, and not `-5` or `-7` (Brad's card); all five ran the mobile PDF to three pages (M7).
- **S6.2** Given each PDF, then it is two US Letter pages with no type under 11.5 px, passes veraPDF's PDF/A-2a and PDF/UA-1 profiles, prints the same bytes twice, and shows no live number.

### Story 7: The chat and its evals follow (P1)

- **S7.1** Given `/corpus.json` and `/llms.txt`, then `vindecoded-4` and `vindecoded-5` link `#receipt-vindecoded-4` and `#receipt-vindecoded-5`, `vindecoded-2`, `-3` and `-7` keep their `receipt-` links, and every other source is unchanged; spec 038's S3.4 and spec 040's pins take the new bytes, with the reason.
- **S7.2** Given the eval cases, then `facts-receipt-vindecoded-4` and `facts-receipt-vindecoded-5` ask their sparkles' questions with their claims' words and must cite them, and `facts-vindecoded` still passes.
- **S7.3** Given a push to an `evals/041-vindecoded-pulse` branch, then the changed run asks the cases new or edited since the last full run, and every one passes (D228).

### Story 8: The privacy note says what's fetched (P1)

- **S8.1** Given `/privacy`, then a section headed "VINDecoded’s live numbers" says, in Brad's three approved points, what the card fetches and from where, that Apple and GitHub never see the visit, and that nothing about it is kept; the note's date moves to the day it changed.

### Story 9: Everything else holds (P1)

- **S9.1** Given the build, then the CSP doesn't change (the API's host is already in `connect-src`), there's no new script and no inline script, and the one module grows by no more than Brad's allowance: 2,304 bytes, and 1,024 bytes gzipped (Brad's card; 2,084 and 870 as measured).
- **S9.2** Given `/` and each role page in both themes at both sizes, with the card live, built and with "How this works" open, then axe finds no WCAG 2.2 AA violation; the card's text meets 4.5:1, and its sparkles and the button 3:1; every target is 24 px or more.
- **S9.3** Given motion allowed, then the card reveals once like the others (D211); given reduced motion or no script, it shows at rest.
- **S9.4** Given the home loading and scrolling to its end, with the API's fake answering, then layout shift is 0.
- **S9.5** Given the analytics, then no event is added or changed (D156).
- **S9.6** Given the pinned container with reduced motion, then the card on the home at phone and desktop in light and dark, live, built with no script, with the API down, and with "How this works" open, each match its committed snapshot with no pixel tolerance. Every screenshot hides the built numbers and their line, which the weekly refresh changes, until the API's fake answers, so a refresh never moves a baseline; the tests read them as text.
- **S9.7** Given specs 001–003, then none of their locked tests changes.

## Edge cases

- **Apple ships a release:** the API answers it within the hour, and the weekly refresh writes it to the snapshot, so the build follows within a week. (Since spec 044, the build follows with the next refresh Brad runs on Brad's PC and its release.)
- **The token expires, or the org revokes it:** GitHub answers 401; the count stays the last good one, with its age in the line, and each hour's try logs `failed`. The weekly refresh then keeps reading the old count from the API. (No longer applies since spec 044: no token exists.)
- **The clock:** the visitor's clock dates the ages. A clock behind the API's makes an age negative: it reads "just now", and a release "in the future" shows its day with no age.
- **The secrets have no version yet:** the deploy leaves them unmounted and says so; the count is left out and the tile keeps its built number.
- **Firestore is down:** each source answers nothing and the card keeps its built numbers.
- **A new export changes `vindecoded-4`'s, `-5`'s or `-7`'s words:** a tag or item that's no longer its claim's fails the build, and the sparkles' cases follow the words (D230).
- **The previews job has no App yet:** (No longer applies since spec 044: the job and the App are gone.) a Monday with a change fails at its token step, and the built numbers keep their "as of" day until Brad creates the App D146 calls for (Brad's card of 2026-11-17, recorded in D240) or a session runs `pnpm previews:refresh`.
- **Over 2,000 PRs merged in 30 days:** the count reads 20 pages, gives up, logs `failed`, and keeps the last good count.

## Functional requirements

- **FR-001** VINDecoded's card MUST read as S1.1–S1.6 set, on the home and each role page, with the claims `vindecoded-2`, `-3`, `-4`, `-5` and `-7`, each with its anchor and sparkle, and `vindecoded-3`'s paragraph and the case study's 1,235 and 83% not shown (D239, amending D132).
- **FR-002** Every word on the card MUST be its claim's, checked at build, or one of Brad's approved `PULSE` words, a live or built number, a day, an age or a store's name.
- **FR-003** The card MUST show the built numbers with no script and before the API answers, then swap in the API's with no motion and no layout shift, and the line MUST say how old they are, or "as of" the built day.
- **FR-004** The card MUST call the site's own API once, only as it nears the viewport, through the one module, and never Apple or GitHub.
- **FR-005** `GET /pulse` MUST answer only the origins `/chat` answers, with S4.1's headers, from a Firestore cache that each source refreshes at most once an hour through a lease, and MUST never answer 5xx (D240).
- **FR-006** No answer, log line or page MAY carry anything of the repo but the merged count, or anything of a visitor; the token and the repo's name MUST come only from Secret Manager.
- **FR-007** `pnpm previews:refresh` MUST write the App Store's version and release day, and the count from the deployed API, to `pulse.json`, which the build reads, and MUST leave the App Store snapshots' shape alone.
- **FR-008** The PDFs MUST print VINDecoded's `vindecoded-2`, `-3` and `-4` and stay at two pages each, as S6.1 and S6.2 set.
- **FR-009** The corpus MUST link `vindecoded-4` and `-5` to their `receipt-` anchors, and the evals MUST hold `facts-receipt-vindecoded-4` and `-5`, with a changed run passing (D228).
- **FR-010** `/privacy` MUST say what S8.1 sets, in Brad's approved words.
- **FR-011** The CSP, WCAG 2.2 AA in both themes, reduced motion, the reveal, layout shift 0, the page with no script, one order across the home and role pages, and the analytics events MUST NOT change, and the one module MUST grow by no more than Brad's allowance.
- **FR-012** Every API test MUST run against fakes; CI MUST never call Apple or GitHub with a token.
- **FR-013** The slice MUST record D239 and D240, add slice 5.14 to `docs/plan.md`, note the amendments in specs 013, 016, 020, 021, 038 and 040, and update the tests and baselines that pin today's card. Specs 001–003's locked tests MUST NOT change.

## Success criteria

- **SC-001** 5 claims and 5 sparkles on VINDecoded's card, 3 tiles, 6 tags and 3 links, on the home and each role page.
- **SC-002** At most 24 calls a day to each of Apple and GitHub, whatever the traffic; 0 calls from any visitor's browser to either.
- **SC-003** 1 request to `/pulse` per page view that reaches the card, and 0 for one that doesn't.
- **SC-004** 0 axe violations and layout shift 0, with the one module within its allowance.
- **SC-005** 3 of 3 PDFs at two pages, each passing both veraPDF profiles, with VINDecoded's three lines.
- **SC-006** Every case the changed run asks passes.

## Brad's approved words

On the Gate 1 cards of 2026-11-17, each "as drafted". None is a claim, so `claims.yaml` doesn't change (Brad's card: "None").

- Tiles: "Downloads", with "1.4M+" and "Android 1M+ ★4.5 · iOS 400K+ ★4.7" from `vindecoded-3`; "Latest iOS release", with the version and "Shipped Nov 10, 7 days ago"; "Merged PRs", with the count and "In the last 30 days".
- Headings: "What I built" and "AI in production".
- The case study's line: "From the case study, Oct 28:", then `vindecoded-7`'s items "1,530 test files · 113 runbooks · 46 ADRs", and "Read the case study".
- The live line: "Live from the App Store and GitHub · updated 12 min ago"; with the built numbers, "From the App Store and GitHub · as of Nov 17"; with one source down, "Live from the App Store · updated 12 min ago · GitHub as of Nov 17".
- "How this works", and its note: "The site’s own API reads the App Store’s public listing and counts the pull requests merged in VINDecoded’s repo, with a read-only token, at most once an hour, and keeps the numbers. This card asks that API, never Apple or GitHub, and shows the numbers it was built with until it answers." Its steps: "App Store · GitHub" (Read-only, at most hourly), "The site’s API" (Cached in Firestore), "This card" (The build’s numbers, then fresher ones); and "Read the code on GitHub".
- `/privacy`'s section, "VINDecoded’s live numbers": "When you scroll near VINDecoded’s card, your browser asks this site’s own service for the app’s latest iOS release and the number of pull requests merged in the last 30 days. Nothing about you is sent with it." "That service gets those numbers from Apple’s public App Store listing and from GitHub on its own, at most once an hour. Apple and GitHub never see your visit." "It keeps no record of the request: no address, no cookie and no log line about you."

## Decisions made while writing this spec

Tier 3, within D129, D229, D230, D239 and D240:

- The tiles aren't links, so a tile's sparkle is never inside a link; the store links sit in the footer, where the study drew them.
- Edited after Gate 1, from the tests: a live dot follows its tile's label, where the study drew it before, and the line has none, its "Live" saying it, since a dot that appears before words moves them, and S3.7 holds layout shift at 0. "How this works" sits beside the line, which fills its row, so new words in the line never move it.
- Edited after Gate 1, from the tests: the case study's line shows three of `vindecoded-7`'s items, so its sparkle asks about the claim's lead and those three, never the 1,235 PRs or their share from agent branches, which Brad took off the card; `facts-receipt-vindecoded-7` asks the same, and the claim stays whole in the corpus. The downloads tile's stars sit in a paragraph whose last word, the iOS rating, keeps its sparkle, as every other claim's does (D230); the stack's sparkle follows its last tag.
- The case study's line keeps its own "Read the case study" link, as the study's mock does, and the footer doesn't repeat it.
- "AI in production" stands in for `vindecoded-5`'s lead line, "Shipped production AI features:", which the card doesn't show; the two items and the closing sentence show as written.
- The iOS stars in the downloads tile are the App Store's live rating, which the build takes from the snapshot (4.7 today, as `vindecoded-3` says); Android's 4.5 stays as the claim writes it.
- New sparkle titles: `vindecoded-4` "Re-platformed from AngularJS/Cordova" and `vindecoded-5` "Shipped production AI features", each made of its claim's words.
- The GitHub count reads the repo's closed pull requests, which a token read-only on pull requests can always do, rather than the search API.
- An answer is reused for a minute inside an instance, and five minutes in a browser, so visits don't each read Firestore.
- No Cloud Scheduler, no new service, and no new setting beyond the two secrets (Brad's card).
- The star in the downloads tile reads as "stars" to a screen reader, `vindecoded-3`'s own word, so the tile adds no word of its own (the review's finding).
- Edited after Gate 1, while writing the tests: the brief put the built release in the App Store snapshot, but a snapshot whose data changes moves its date, which the link previews show and spec 016's gallery pins, so every iOS release would have moved a baseline. The release goes in `pulse.json` beside the count instead (S3.8, S5.1, FR-007). And the built numbers change weekly, while spec 003's locked full-page screenshots hold the card, so the screenshots hide them until the API's fake answers (S9.6). With the built numbers, the release shows no age, so a screenshot never depends on the day it's taken (S3.4).

## Changes to other specs

Specs 001–003 stay locked as they are, and none of their tests change.

- **Spec 013:** VINDecoded's claims, stats and links read the pulse.
- **Spec 016:** the App Store snapshot's fields gain the version and release day.
- **Spec 020:** `vindecoded-4` and `-5` link their claims.
- **Spec 021:** the API gains `GET /pulse`, its log line and its two secrets.
- **Spec 038:** the counts of sparkles, anchors and cases grow by 2, and S3.4 pins the new corpus bytes.
- **Spec 040:** its pins of the VINDecoded card and the corpus take the new ones.

## Approval

- Gate 1: approved by Brad in the session on 2026-11-17, with the plan and mocks, after eleven cards: "On read, hourly"; "Weekly dated count"; "Yes, create both now"; the tiles, headings, lines and note "As drafted"; "2,304 bytes, 1,024 gzipped"; "Three plain points"; "Platform, downloads, stack"; "None"; and "Approve".

## Changes since approval

- Changed in spec 044 (slice 5.17), on 2026-11-18: the live GitHub side is gone ([D247](../../docs/decisions/0247-the-previews-and-the-pr-count-refresh-by-hand-on-brads-pc.md)). `/pulse` answers the App Store alone, the pulse's two secrets and the deploy's checks for them are removed, and the weekly refresh is retired. The merged-PR count is counted by hand on Brad's PC through Brad's own `gh` and built into the card with its day: the tile reads "In the 30 days to" that day, with no dot, and the line names the App Store alone. S3.3, S4.5, S4.6's count, S4.9, S5.1's weekly run and S5.2 no longer apply, and their tests retired; `PULSE`'s words and `/privacy`'s first two points are Brad's new ones. Brad approved it with spec 044 at its Gate 1.
