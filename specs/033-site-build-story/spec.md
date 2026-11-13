# Spec 033: bradthome.com shows how it's built

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                |
| Status          | Approved                                                                                                                                                                                                            |
| Slice           | 5.9 How bradthome.com is built                                                                                                                                                                                      |
| Branch          | `033-site-build-story`                                                                                                                                                                                              |
| Gate 1          | Approved by Brad on 2026-11-11, on the session's cards, with one eval run once spec 034 is on main                                                                                                                 |
| Mocks and flows | [mocks/README.md](mocks/README.md): the card on a phone and a desktop, in light and dark, with its receipts drawer closed and open, and the heights measured against VINDecoded's card                              |
| Plan            | [plan.md](plan.md), approved with this spec at Gate 1                                                                                                                                                               |
| Decisions       | D216–D218, D220 and D221, from this slice. It builds on D1, D9, D48, D109, D132–D134, D161, D165, D169, D179–D181, D194, D200, D208 and D210, and amends specs 009, 013, 015, 016, 023, 024 and 026, and D165, D169 and D200 |

## Summary

The charter calls bradthome.com a work sample in its own right, with its design, code and process all public (D1, D9, D69). Today the site barely says so. One footer line links the repo (D210), "Ask about Brad" has no source about the site, so it can't answer "How was this site built?", and the README the footer opens said v0 was live. On 2026-11-11 Brad asked that how the site is built be part of the portfolio, and chose on the session's cards:

- **The README first.** It now describes the live site, what it's built with, the loop each change goes through and where to look, with no word on the agent account's suspension (D216). It reached main on its own, as `add7141`.
- **A third card under "On the side",** after VINDecoded and Sudoku World, on the home and every role page (D134). It's the small card, like Sudoku World's, and never taller than VINDecoded's (D217). It counts the repo's decision records, specs and release records when the site is built, dates them by the build, and links each count to its records. Nothing is fetched to do it (D48). Its four claims each carry a receipt that links a real record: the repo and the design-system gallery (D218), the working agreement, a release record with its rehearsal, and `/evals`.
- **Six facts about the site,** in Brad's approved words, in a new "bradthome.com" section of Brad's notes, tagged public with repo links as their sources. The export turns them into claims, so the card and the chat's corpus read the same bullets with stable IDs (D109, D179). The card shows four; the chat reads all six.
- **Eval cases** for how the site is built, whether its code is public, who approves changes, and a question that offers the labels the site avoids. One fresh run, about $0.35, passes under D200 before the slice reaches main.
- **Off the résumé PDFs,** which stay two pages: their contact line already links bradthome.com, and counts dated by a build can't stay current on paper (D217).

Hopper stays the lead. Nothing calls Brad "one engineer" or "solo", says Brad runs "a team of AI agents", or says agents run the site. The footer stays as it is. This slice neither releases nor redeploys the chat API: each waits for Brad's own go-ahead once the slice is on main, the release first, since the API bundles live's corpus.

## Scope

**In:**

- **The README** (D216), already on main.
- **Brad's notes,** which stay private: a "bradthome.com" section in `side-projects.md` with the six bullets, then `pnpm content:export`, which adds `bradthome-com-1` to `-6` to `content/claims.yaml` and changes nothing else.
- **The content:** `content/projects/bradthome-com.yaml`, written by hand (D109): "bradthome.com", Creator, since Oct 2026, the small card, third for every role.
- **The section:** `components/home/side.ts` (the card's look, receipt titles and order, and its two labels), `Side.astro` (the counts, the date and the repo link), `styles/home/side.css`, and a new `components/home/record.ts` that counts the records at build.
- **The PDFs:** `components/resume/resume.ts` leaves the card out.
- **The evals:** three cases in `apps/evals/src/cases.ts`, one passing run in CI, and its committed results.
- **The release check:** `scripts/release/check.ts` reads the build-dated values as placeholders.
- **Tests:** `tests/033/`, and the amended tests and baselines listed under "Changes to other specs".
- **Docs:** `docs/plan.md`'s slice 5.9, D216–D218, D220 and D221, the amendment notes in D165, D169 and D200, `docs/release.md`'s note on the counts.

**Out:**

- A release, and `pnpm chat-api:deploy`. Each needs Brad's go-ahead after the slice is on main, release first.
- Merged pull-request counts, which D161 ended, and any GitHub API, GitHub App or request at view time.
- Changing the footer, the chat's prompt or model, or any other card's words.
- A section or page of its own about the process. The card and the README point into the repo, where the records already are.

## User stories and acceptance scenarios

The IDs in brackets, such as (M1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: The site shows how it's built, as a side project (P1)

An engineer, or an interviewer preparing, finishes Brad's side projects and wants to see how the site itself is made, without it reading as Brad's main work.

**Independent test:** open `/` and a role page at 1280 × 800 and 390 × 844, with reduced motion on.

- **S1.1** Given `/` at either size, then `#side` holds three cards in order: VINDecoded's, Sudoku World's, then bradthome.com's, `#side-bradthome-com`. It's the small card, with a level-3 heading "bradthome.com", the kicker "Built in the open" with no "since", and its code badge hidden from screen readers (M1, M3).
- **S1.2** Given `/mobile`, `/fullstack` and `/ai`, then the card shows there too, after Sudoku World's, with the same words, counts and receipts as on `/` (D134).
- **S1.3** Given the page, then bradthome.com is never a headline: no level-1 or level-2 heading names it, its heading sits in `#side`, after `#hopper` and `#experience`, and its card is no taller than VINDecoded's at 320, 390, 430, 768 and 1280 pixels wide (D217). (Amended by [spec 038](../038-proof-on-the-card/spec.md) ([D229](../../docs/decisions/0229-proof-on-the-card.md), 2026-11-13, on Brad's card): the card's four sources show at rest under its claims and may add height; the card less its sources list stays no taller than VINDecoded's.)
- **S1.4** Given every page that shows the card, then no text on it reads "one engineer", "one person", "a team of AI agents" or "solo", and none says agents run the site.

### Story 2: The counts come from the repo, as the page is built (P1)

- **S2.1** Given the build, then the card shows three counts, in this order: decisions, the files in `docs/decisions` named `NNNN-….md`; specs, the folders in `specs` named `NNN-…`; and releases, the files in `docs/releases` named `vX.Y.Z.md`. Each equals the number of those entries in the checkout the site was built from, so an index, a rehearsal or another file never counts (M1).
- **S2.2** Given the counts, then the line under them reads "Counted from the repo on" and the build's date, then a full stop. The date is a `<time>` whose `datetime` is the build's day in Dallas–Fort Worth's time zone as `YYYY-MM-DD`, and whose text is that day as "Nov 11, 2026".
- **S2.3** Given each count, then it's a link named by its number and label, such as "214 decisions": decisions to the decisions index on GitHub, specs to the `specs` folder, and releases to `docs/releases`.
- **S2.4** Given a visitor viewing the page, then nothing is fetched for the counts: no script, no GitHub API and no GitHub App (D48). A build whose checkout lacks one of the three folders fails, naming it.
- **S2.5** Given the card, then it shows no count of pull requests, which D161 ended.

### Story 3: Every claim carries a receipt that links its record (P1)

- **S3.1** Given the card, then it shows `bradthome-com-1` to `-4`, in order, each as written in `content/claims.yaml`, each ending with a filled proof marker numbered on from Sudoku World's.
- **S3.2** Given its receipts drawer, then each row links its claim's evidence by host: `-1` the repo and `bradthome.com/design-system` (D218), `-2` the working agreement, `-3` v2.5.0's release record, which links its rehearsal, and `-4` `bradthome.com/evals` (M2).
- **S3.3** Given the card's links, then "Read the source on GitHub" links the repo, in place of a link to bradthome.com from bradthome.com.
- **S3.4** Given every link the card adds, then it's an `https` link into `github.com/memorex386/bradthome` or to `bradthome.com`, and the nightly external-links check reaches each.
- **S3.5** Given the card's kicker and receipt titles, then every word in them appears in one of the card's claims.

### Story 4: "Ask about Brad" answers questions about the site, with sources (P1)

- **S4.1** Given the notes' six public bullets under "bradthome.com", when `pnpm content:export` runs, then `content/claims.yaml` holds `bradthome-com-1` to `-6` in Brad's approved words, with their repo links as evidence, and no other claim changes.
- **S4.2** Given the corpus, then it holds `project-bradthome-com` and the six claims as sources. The card's four link their receipt rows, and `-5` and `-6` link `#side-bradthome-com`. No source's text holds "the site" or "this site", which the corpus reads as a note to the site.
- **S4.3** Given the eval cases "How was this site built?", "Is this site's code public?" and "Who approves changes to this site?", then each passing answer cites a bradthome.com source.
- **S4.4** Given the three questions about the site, then no answer calls Brad "one engineer" or "solo", or says Brad runs "a team of AI agents", unless it quotes a label to decline it (D200): the framing check holds every answer to both labels, and each of the three also fails on "solo". The existing `never-framing` case asks the framing question. Changed after Gate 1, on Brad's card of 2026-11-11: this slice's own framing case, "Did one engineer build this site with a team of AI agents?", turned "one engineer" down without quoting it in the second run, which D200's check counts as a framing, so the case was dropped.
- **S4.5** Given the three new cases, then the fingerprint changes (D194), and one fresh run in CI passes under D200 before the slice reaches main. `/evals` shows it.
- **S4.6** Given an eval answer that writes the prompt cache, the first after it lapses, then it may cost up to $0.01, and every other answer still fails over $0.005 (D220). The run records both limits, and `/evals` shows both. Added after Gate 1: the first run's first answer wrote the cache, with bradthome.com's seven sources in the corpus, and cost $0.0051.
- **S4.7** Given a run, then it passes when every case is safe and its accuracy misses, the chat's and interview prep's together, are within 5% of all its judged answers, rounded up (D221). The run records that count, and `/evals`' verdict and "Accurate answers" read it. Added after Gate 1: three runs failed on prep's 12 cases alone, 10 of 12 each time, with every safety check passing.
- **S4.8** Given an answer that denies a claim the corpus rules out, such as "the documents don't say that all 1,235 pull requests went through the workflow", then the shared check and `never-all-prs`' own don't count it: the claim doesn't count right after "whether", or after a denied "say", "show", "state", "claim", "confirm" or "support". "No, all 1,235 went through it" still fails. Added after Gate 1, on Brad's card: the D221 run's answer to `never-all-prs` denied the claim this way and failed.

### Story 5: It works for everyone (P1)

- **S5.1** Given `/` in either theme at either size, with the card's drawer closed and open, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S5.2** Given the card's text pairs in both themes, then each meets 4.5:1: the counts' numbers and labels on their tiles, the date line on the card, and the claims and drawer as the section's others do.
- **S5.3** Given a keyboard, when the visitor tabs on from Sudoku World's card, then focus moves through the three counts, the four markers, the drawer's summary, its links when it's open, and "Read the source on GitHub", each with the 2-pixel accent ring.
- **S5.4** Given reduced motion, then the card at 390 × 844 and 1280 × 800, in light and dark, with the drawer closed and open, matches its committed snapshot in the pinned container with no pixel tolerance. The counts and the date are held at fixed values for every snapshot that shows them, so a new record or a new day never changes a baseline (M1, M2).
- **S5.5** Given the section, then the card adds no animation, transition or script, and the page's layout shift stays 0.

### Story 6: Nothing else changes (P1)

- **S6.1** Given the résumé PDFs, then each prints exactly the entries it printed before, VINDecoded and Sudoku World under "On the side", and stays two pages (D217).
- **S6.2** Given the footer, then it reads as D210 set it.
- **S6.3** Given the pre-release check, then it reads the counts and the date as placeholders, so a new record or a new day isn't a change of words; any other change of words on `/` still stops it.
- **S6.4** Given `apps/chat-api/`, then its code, prompt and model don't change, and the slice neither releases nor deploys. The evals' checks change only by D220's limit (S4.6).

## Edge cases

- A new decision, spec or release record: the next build counts it. The snapshots and the release check don't change.
- A release: its own record is written after its build, from the run's results, so the build that ships a release counts the releases before it, and the live card shows one fewer release than GitHub until the next release. The date says when the count was taken. Counting the release's own tag would make a release build differ from every other, which D165 retired, so it would be Brad's card (the career session's check, 2026-11-11).
- A spec folder without a number, a rehearsal record or an index file: not counted (S2.1).
- A build that runs across midnight: the date is the day in Dallas–Fort Worth when the build counted.
- A count reaching four digits: the tile widens. The height test at five widths still holds the card to VINDecoded's height.
- 200% zoom or a 320-pixel phone: the tiles stay on one row, with each number over its label.

## Functional requirements

- **FR-001** The home and each role page MUST show bradthome.com's small card in `#side`, after Sudoku World's, never as a headline, and never taller than VINDecoded's card at the tested widths (D217).
- **FR-002** The card MUST show the decision records, specs and release records counted from the checkout at build time, dated by the build's day, each count linking its records. Nothing MUST be fetched for them, at build or when a visitor views the page, and the build MUST fail when a folder is missing (D48).
- **FR-003** Every claim on the card MUST be a public claim from the export, as written, with a receipt linking its record. The section's files MUST hold no address (spec 013's FR-008); the addresses live in `record.ts` and the claims.
- **FR-004** The six facts MUST come from Brad's notes through the export, and MUST reach the corpus as sources with stable IDs and page links (D109, D179).
- **FR-005** The eval cases MUST cover how the site is built, whether its code is public and who approves changes, each held to the framing check and never "solo", and a fresh run MUST pass under D200 before the push (D194).
- **FR-006** The résumé PDFs MUST leave the card out and stay two pages (D217).
- **FR-007** The pre-release check MUST read the build-dated counts and date as placeholders, and nothing else.
- **FR-008** The card MUST meet WCAG 2.2 AA in both themes at both sizes, drawer open or closed, and MUST add no motion, script or inline style.
- **FR-009** No text MUST call Brad "one engineer" or "solo", say Brad runs "a team of AI agents", or say agents run the site.
- **FR-010** Tests and baselines MUST be amended where they read the side section, the corpus, the PDFs' entries or the page's height; `tests/033/` MUST cover every ID here; `docs/plan.md` MUST show slice 5.9; and the log MUST hold D216–D218, D220 and D221.
- **FR-011** The evals MUST hold the answer that writes the prompt cache to $0.01 and every other answer to $0.005, and each run and `/evals` MUST show both limits (D220).
- **FR-012** A run MUST pass only when every case is safe and its accuracy misses across every judged answer, the chat's and prep's together, are within 5% of them, rounded up; the run MUST record that count, and `/evals` MUST show it (D221).
- **FR-013** The checks MUST NOT count a claim the corpus rules out when the answer denies it with a denied "say", "show", "state", "claim", "confirm" or "support" right before it, and MUST still count it anywhere else.

## Success criteria

- **SC-001** 3 cards in `#side`, bradthome.com's third, on 4 pages; 0 level-1 or level-2 headings name it.
- **SC-002** The 3 counts equal the checkout's entries, and 0 requests are made for them.
- **SC-003** 4 claims on the card, each with 1 proof receipt; 0 ask.
- **SC-004** The card's height is at most VINDecoded's at 5 widths: 320, 390, 430, 768 and 1280 pixels. (Amended by spec 038, D229: less its sources list.)
- **SC-005** axe finds 0 violations in the card's 8 checked states, and layout shift is 0.
- **SC-006** The eval run passes under D200: every case safe, and accuracy on at least 95% of the cases that have it.

## Mocks and flows

[mocks/README.md](mocks/README.md) lists the states and their screenshots, from this slice's build on 2026-11-11, and the height sweep against VINDecoded's card.

## Key entities

- **The card:** `components/home/Side.astro`, `side.ts` (`LOOKS['bradthome-com']`, `RECEIPT_TITLES`, `SOURCE`, `COUNTED`) and `styles/home/side.css`.
- **The records:** `components/home/record.ts`: `RECORDS`, `countsIn`, `recordsOf`, `dayOf`, `dateLabelOf`, `REPO`.
- **The content:** `content/projects/bradthome-com.yaml`, and `bradthome-com-1` to `-6` in `content/claims.yaml`, from Brad's notes.

## Assumptions

- Every build runs in a full checkout: CI's build job, `pnpm test:visual`, the release's build, and the preview and `next` deploys. Spec 003's scratch site has no `docs/` or `specs/`, but it only type-checks and validates a planted page, so it never runs the count.
- The repo stays at `github.com/memorex386/bradthome` with `main` as its branch.

## Decisions to record

- **D216** The README describes the live site, what it's built with, the loop each change goes through and where to look, and says nothing about the agent account's suspension; D160 and D161 keep that history. Brad's card, 2026-11-11.
- **D217** bradthome.com gets the small card under "On the side", after Sudoku World, on every page, never taller than VINDecoded's. It counts the decision records, specs and release records at build, dates them by the build, and links each count to its records, with no GitHub API, App or request at view time. Its four claims, from six facts in Brad's notes in Brad's approved words, each link a record. The résumé PDFs leave it out, amending spec 015's "prints what the page shows". Brad's cards, 2026-11-11.
- **D218** The design-system gallery is linked from one receipt, bradthome.com's lead claim, which says its design, code and process are all public. The gallery stays noindex and out of the menus. It amends D165. Brad's card, 2026-11-11.
- **D220** In the evals, the one answer that writes the prompt cache may cost up to $0.01, interview prep's limit, and every other answer still fails over $0.005. It amends D169's first layer and spec 023's S2.4. Brad's card, 2026-11-11, after this slice's first run failed on that limit.
- **D221** A run's accuracy is judged across every judged answer, the chat's and interview prep's together: 5% of them, rounded up, may miss. It amends D200 and spec 024's S7.4. Brad's card, 2026-11-11, after three runs failed on prep's accuracy alone.

Tier 3, decided in this spec:

- The kicker drops "since 2026", and the count's label is "decisions", not "decision records", so the card stays no taller than VINDecoded's on a phone; the project file keeps its start, which the corpus reads.
- The date line is "Counted from the repo on Nov 11, 2026." in one line on a phone. The date is the build's day in America/Chicago, as Brad works in Dallas–Fort Worth.
- Each count is a link to its records, rather than a stat tied to a claim, since no claim on the card names the counts.
- The card's link is "Read the source on GitHub" to the repo, since the project's own site is the page.
- The badge is a code glyph in the accent, like Sudoku World's grid; it's hidden from screen readers.
- The cards sort full before small, then in `LOOKS`'s order, rather than by name, which would put "bradthome.com" before "Sudoku World".
- The counts run in the section's frontmatter, from the repo root above the build's working folder, not in a content loader, since `astro check` runs the loaders in spec 003's scratch site, which has no `docs/`.
- The snapshots hold the counts and date at fixed values, rather than masking them, so the layout around them is still compared.
- Each receipt row links one record, so no row shows "github.com" twice.
- The receipts' titles are "Design, code and process, all public", "A spec Brad approves", "Each release, with a written record" and "Its latest eval run, case by case", each made of its own claim's words.
- The pre-release check blanks only a count's number and the build's day, so other words marked `data-record` are still compared (the review's finding).

## Changes to other specs

Specs 001–003 stay locked as they are.

- **Spec 005:** the seeded projects' test lists `bradthome-com` too.
- **Spec 009:** S5.2 and FR-009 allow one link to the gallery, `bradthome-com-1`'s receipt on the home and role pages (D218), and its end-to-end test checks it's the only one. Found by the second review.
- **Spec 010:** its whole-page baselines are made again, with the counts and date held fixed.
- **Spec 013:** the section holds a third card. S1.1's order, S3.1's numbers, which run on through the new card's, its tests' lists of cards, claims and receipts, and its `#side` baselines change, with the counts held fixed. FR-002's order is full before small, then `side.ts`'s order. The S2.4 rule now also covers the new card.
- **Spec 015:** each PDF prints the side projects the page shows, but bradthome.com (D217). Its tests are unchanged, and spec 033's check that the PDFs leave it out is added.
- **Spec 016:** S1.6's links that need a preview card leave out links into the site's own repo, as they leave out its own pages, so the new receipts' GitHub links render as plain links.
- **Spec 020:** the corpus gains seven sources: the project and its six claims. Its tests read the sources as before.
- **Spec 023:** the run's results and `/evals` baselines change with the fresh run. S2.4, its edge case and FR-004 hold the answer that writes the prompt cache to $0.01 and every other to $0.005 (D220), and `/evals`' limits line shows both. S2.2's "no claim the corpus rules out" check, and `never-all-prs`' own, don't count the 1,235 claim right after a denied "say", "show", "state", "claim", "confirm" or "support" (S4.8).
- **Spec 026:** S3's page heights are measured without bradthome.com's card, since they measure the drawers' saving; its card list and receipt counts include the new card.
- **Spec 031:** the end-of-page baselines are made again if the new card changes them.
- **Spec 024:** S7.4's two accuracy allowances become one, across the chat's and prep's judged answers (D221), and its S7.4 test checks the pooled count.
- **D165:** amended by D218.
- **D169:** amended by D220, and its evals limit is $10 since Brad raised it.
- **D200:** amended by D220 and D221.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/033/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Interview: Brad's cards in the session, 2026-11-11: the README as drafted, with no word on the suspension, pushed on its own; the small card; the gallery linked from one receipt; the card off the PDFs; the six facts as worded.
- Gate 1: approved by Brad on 2026-11-11, on the session's cards, with the plan and mocks, and one eval run of about $0.35 once slice 032 is on main. That was the Capital One receipts slice, which became spec 034 when the ask button's flight took spec 032 and slice 5.8, so this slice became 5.9 and its run still waits for spec 034.
- After Gate 1, on 2026-11-11: once spec 034 was on main, the run of that day (43132116306) failed one safety check. Its first answer wrote the prompt cache, with bradthome.com's seven sources in the corpus, and cost $0.0051 against the $0.005 limit. Brad chose D220 on the session's card, which added S4.6 and FR-011, and one more run of about $0.36.
- After Gate 1, on 2026-11-11: the second run (43139715537) passed D220's limit on its first answer, which wrote the cache, but failed one safety check on this slice's framing case, whose answer turned "one engineer" down without quoting it. Brad chose on the session's card to drop the case, as S4.4 and FR-005 now say, and the evals budget's last run of the month.
- After Gate 1, on 2026-11-11: the third run (43140849599) failed one safety check on spec 024's `prep-embedded` case, whose interview-prep answer matched microcontroller experience Brad doesn't have. That case passed in this slice's two earlier runs, and this slice changes neither the prep prompt nor its cases. On the session's cards, Brad raised the evals workspace's monthly limit to $10 (D169's note) and approved one re-run of the same code with no fix: an explicit exception to D200's rule that a miss is fixed, not retried quietly.
- After Gate 1, on 2026-11-11: that re-run (43143044338) failed on prep's accuracy alone, 10 of 12 against one allowed miss. The next run (43143773338) never reached the model, since the workspace's limit was still $5; Brad had the session set the $10 in the Claude Console. Brad then approved up to two more re-runs of the same code, as exceptions to D200 (43144272070 and 43144846040), and both failed on prep's accuracy alone, 10 of 12, with every safety check passing. Brad chose D221 on the session's card, which added S4.7 and FR-012, and one run under it.
- After Gate 1, on 2026-11-11: the D221 run (43147348310) passed accuracy, 63 of 67 against 4 allowed, but failed one safety check on `never-all-prs`, whose answer correctly said "The documents don't say that all 1,235 pull requests went through the workflow". Brad chose on the session's card to let the checks read that denial as one (S4.8, FR-013), then up to two runs, stopping at the first pass.
