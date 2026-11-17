# Spec 040: The job history in date order, with RealPage as a card

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                                |
| Status          | Approved                                                                                                                                                                                                                                                                            |
| Slice           | 5.13 The job history in date order (Brad's ask of 2026-11-16, after reading live v2.10.0 on a phone)                                                                                                                                                                                |
| Branch          | `040-job-order`                                                                                                                                                                                                                                                                     |
| Gate 1          | Approved by Brad on 2026-11-17, on the session's cards: the card shows the sentence and the tags, not the tech claim; "Worked in Kotlin, Java and RxJava."; "Real-estate apps"; the heading names real-estate apps; and the PDFs keep two pages with tighter margins and gaps       |
| Mocks and flows | [mocks/README.md](mocks/README.md): every state, captured from this slice's own build                                                                                                                                                                                               |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                           |
| Decisions       | D238, from this slice: RealPage's card, in date order, amending [D130](../../docs/decisions/0130-experience-weights-each-job-by-its-display.md). It builds on D129, D134, D142, D211, D228, D229, D230 and D235, and on specs 005, 012, 015, 020, 034 and 038. D142 doesn't change. |

## Summary

On 2026-11-16 Brad read live v2.10.0 on a phone and asked for the job history in order, with RealPage as a bigger card. The Experience section's timeline already lists every job newest first, but the cards under it don't: Bleacher Report's featured card, then BookShout's and Bottle Rocket's, then RealPage (Apr 2018 – Sep 2019) as a one-line row under Bottle Rocket (Oct 2015 – Nov 2017), because RealPage's job file sets `display: line` (D130). In the career session the same day, Brad chose a card for RealPage with its résumé sentence and a Kotlin · Java · RxJava tag row ("Sentence + tech row"), and asked that the résumé PDFs print RealPage's sentence too and stay at two pages ("Add it, keep 2 pages").

This slice makes RealPage a card, so the cards read newest first: Bleacher Report, RealPage, BookShout, Bottle Rocket. RealPage's card shows its public claim `realpage-2` as written, then a tag row of Kotlin, Java and RxJava. The row's words come from a new public claim, `realpage-3`, "Worked in Kotlin, Java and RxJava.", which the card doesn't show as a sentence (Brad's card): it backs the tags and the chat. The enterprise IT years and the degree stay dated lines, and the timeline keeps its rows. The heading names RealPage's work. The PDFs print RealPage's sentence in two pages each. The chat's corpus links RealPage's claims to the card, and the new sparkle and the new fact each get an eval case.

## Scope

**In:**

- The content: `realpage.yaml`'s `display`, and `claims.yaml` from `pnpm content:export`, with `realpage-1`'s note gone from the notes and `realpage-3` added there as a bullet tagged public.
- The section: `components/home/experience.ts` (RealPage's look, its sparkle title and the heading) and `Experience.astro`'s comment.
- The corpus: `corpus/corpus.ts`'s `SITE_NOTES` loses `realpage-1`.
- The résumé PDFs: `styles/resume/print.css`'s page margins and gaps (Brad's card).
- The evals: `apps/evals/src/cases.ts`, and the changed run's `apps/evals/changed.json` (D228).
- Record D238, slice 5.13 in `docs/plan.md`, notes in specs 005, 012, 015, 020 and 038, new tests in `tests/040/`, and the tests and baselines that pin today's weighting, order and counts.

**Out:**

- The timeline's rows, order and dates, Bleacher Report's featured card and mark, and BookShout's and Bottle Rocket's cards.
- `realpage-1`, which only restates the title, as `bottle-rocket-1` does, so the card doesn't show it.
- The chat's prompt, model, API and limits. The chat API bundles the corpus when it's deployed, so its new links reach answers only after a release and a `pnpm chat-api:deploy`, each on Brad's own go-ahead.
- A release. The slice lands on main and `next`; bradthome.com changes only through a release on Brad's go-ahead.

## User stories and acceptance scenarios

The state IDs in brackets are the captures in [mocks/README.md](mocks/README.md).

### Story 1: The jobs read in date order, with RealPage as a card (P1)

A recruiter skimming the Experience section on a phone should read the jobs in the order they happened, newest first, with RealPage's work as visible as the jobs around it.

**Why this priority:** it's Brad's ask.

**Independent test:** open `/` and each role page at 375 × 812 and 1440 × 900, in light and dark, and read the section's order against the job files.

- **S1.1** Given the home, then after the timeline the section shows Bleacher Report's featured card, then the RealPage, BookShout and Bottle Rocket cards, newest first by start month, then the enterprise IT line and the Education line (M1).
- **S1.2** Given RealPage's card, then it is `#experience-realpage`, with a level-3 heading "RealPage · Lead Android Developer", the kicker "Real-estate apps · Apr 2018 – Sep 2019", the claim `realpage-2` as written, ending with its sparkle and carrying its `receipt-` anchor, and a tag list named "RealPage, tags" holding Kotlin, Java and RxJava (Brad's cards) (M3).
- **S1.3** Given `/mobile`, `/fullstack` or `/ai`, then its Experience section shows the same cards, claims and lines in the same order as the home's (D134) (M2).
- **S1.4** Given the section's heading, then it reads "Android for brands, a startup, real-estate apps and a sports media platform" (Brad's card), and every word in it is in a claim of one of the cards (M4).
- **S1.5** Given the job files, then the cards' order comes from their start months alone: a planted card job dated between two others shows between them, and a job's place comes from its `display` (D130, D238).
- **S1.6** Given the timeline, then its rows, order, dates and links don't change: RealPage's row still links `#experience-realpage`, which is now its card, and its bar takes the cards' fill, as spec 012's S2.3 sets for a card.
- **S1.7** Given a phone 375 or 320 pixels wide, then the card stacks like the others, and the page never scrolls sideways.

### Story 2: Every word is a public claim's (P1)

**Why this priority:** the repo and site are public, and every sentence on the page is a public claim as written (D129, D130).

**Independent test:** read the built section's text against `content/claims.yaml`, and the export against the notes.

- **S2.1** Given the export, then `realpage-1` reads "Lead Android Developer.", with no note to the site, `SITE_NOTES` no longer lists it, and its corpus text doesn't change.
- **S2.2** Given the export, then `realpage-3` reads "Worked in Kotlin, Java and RxJava." (Brad's card), from a bullet tagged public under RealPage in the notes, and `claims.yaml` is byte for byte what the export writes.
- **S2.3** Given RealPage's kicker, tags and sparkle title, then every word in each is in one of RealPage's claims, but "Tags", spec 011's fixed name for a card's list.
- **S2.4** Given the section, then no note to the site shows, `realpage-3`'s sentence doesn't show (its words show only as the tags), and no claim of another subject shows on RealPage's card.

### Story 3: The PDFs print RealPage's sentence in two pages (P1)

**Why this priority:** Brad's second card: "Add it, keep 2 pages".

**Independent test:** build in the pinned container and read each PDF.

- **S3.1** Given each PDF, then Experience still lists every job newest first (D142), and RealPage prints its heading and dates, then `realpage-2` as a bullet, as the card shows it; `realpage-3` doesn't print, as the card doesn't show it (M6).
- **S3.2** Given each PDF, then it is two US Letter pages, with no type under 11.5 px, passes veraPDF's PDF/A-2a and PDF/UA-1 profiles, and prints the same bytes twice. To fit, the page's top and bottom margins go from 40 and 48 px to 36 and 40, the section headings' gaps from 16 and 8 px to 12 and 6, and the jobs' gaps from 10 px to 8, with the type and line height unchanged (Brad's card) (M6).
- **S3.3** Given the enterprise IT years, which the page shows as a line, then each PDF still prints them as a heading alone (D142).

### Story 4: The chat and its evals follow (P1)

- **S4.1** Given `/corpus.json` and `/llms.txt`, then `realpage-2` links `#receipt-realpage-2`, `realpage-3` joins as a source linking `#experience-realpage`, where its tags show, `job-realpage` and `realpage-1` still link `#experience-realpage`, and every other source is unchanged. Spec 038's S3.4 pins the new bytes, with the reason.
- **S4.2** Given a link to `#experience-realpage`, which the deployed chat sends for RealPage's claims until the chat API is redeployed, then it lands on RealPage's card (M7).
- **S4.3** Given the eval cases, then the new sparkle has a `facts-receipt-realpage-2` case asking "Tell me more about this: “…”" with its claim's words, which must cite it; a `facts-realpage-stack` case asks what Brad worked in at RealPage and must cite `realpage-3` and name all three; and `facts-realpage` also accepts `realpage-3`.
- **S4.4** Given a push to an `evals/040-job-order` branch, then the changed run asks the cases new or edited since the last full run, and every one passes (D228).

### Story 5: Everything else holds (P1)

- **S5.1** Given the build, then the CSP doesn't change, there's no new script, and the one module is main's 13,010 bytes.
- **S5.2** Given `/` and each role page in both themes at both sizes, then axe finds no WCAG 2.2 AA violation, RealPage's card's text meets 4.5:1 and its sparkle 3:1, and no two 44 px sparkle targets overlap.
- **S5.3** Given motion allowed, then RealPage's card reveals once like the other cards (D211); given reduced motion or no script, then it shows at rest.
- **S5.4** Given the home loading and scrolling to its end, then layout shift is 0.
- **S5.5** Given the home and role pages, then Bleacher Report's mark shows only on its featured card (D235), and the analytics events don't change.
- **S5.6** Given the pinned container with reduced motion, then the section on the home at phone and desktop, in light and dark, RealPage's card landed on by a link to `realpage-2`, and its sparkle focused each match its committed snapshot with no pixel tolerance.

## Edge cases

- The export numbers RealPage's bullets other than the branch has them: the byte-for-byte check against the branch's copy fails, and so do the tests that pin `realpage-2`'s and `realpage-3`'s words, so it's seen before anything lands.
- A later export changes `realpage-2`'s words: its sparkle's question changes, so spec 038's comparison of the cases with the built pages fails until the case and a changed run follow (D230).
- A new card job: it needs a look, or the build fails, and it takes its place by start month.
- A claim's note to the site returns in a later export: `NOTE_WORDS` fails the build until it's listed in `SITE_NOTES` (spec 020).

## Functional requirements

- **FR-001** `realpage.yaml` MUST set `display: card`, and the section's cards MUST read newest first by start month, after the featured card (D238).
- **FR-002** RealPage's look MUST name the kicker "Real-estate apps", the claim `realpage-2` alone, and a "Tags" list of Kotlin, Java and RxJava; the claim MUST have a sparkle title made of its own words, and every label MUST use only RealPage's claims' words but "Tags".
- **FR-003** The section's heading MUST be "Android for brands, a startup, real-estate apps and a sports media platform", made only of the cards' claims' words.
- **FR-004** `realpage-1` and `realpage-3` MUST come through `pnpm content:export` from the notes, `realpage-3` in Brad's approved words, and `SITE_NOTES` MUST NOT list `realpage-1`.
- **FR-005** Each résumé PDF MUST print `realpage-2` under RealPage's heading, stay at two US Letter pages with no type under 11.5 px, pass PDF/A-2a and PDF/UA-1, and print the same bytes twice, with S3.2's margins and gaps and the type sizes and line height unchanged.
- **FR-006** The corpus MUST link `realpage-2` to `#receipt-realpage-2`, and `realpage-3`, `realpage-1` and `job-realpage` to `#experience-realpage`.
- **FR-007** The evals MUST hold `facts-receipt-realpage-2`, citing its claim, and `facts-realpage-stack`, citing `realpage-3`; `facts-realpage` MUST accept `realpage-3` too; and a changed run of the new and edited cases MUST pass (D228).
- **FR-008** The CSP, the scripts, the one module, WCAG 2.2 AA in both themes, reduced motion, the reveal, layout shift 0, the pages with no script, one order across the home and role pages, Bleacher Report's mark and the analytics events MUST NOT change.
- **FR-009** The tests that pin today's weighting, order, counts or corpus bytes MUST follow the new section, in specs 005, 012, 015, 017, 020, 030, 038 and 039, with their baselines made again in the pinned container. Specs 001–003's locked tests MUST NOT change.
- **FR-010** The slice MUST record D238, add slice 5.13 to `docs/plan.md`, and note the amendment in specs 005, 012, 015, 020 and 038.

## Success criteria

- **SC-001** 1 featured card and 3 cards, newest first, then 1 job line and the Education line, on the home and each role page.
- **SC-002** 7 claims on the Experience section's cards, and 31 sparkles, 31 anchors and 31 `facts-receipt-` cases in all.
- **SC-003** 3 of 3 PDFs at two pages, each passing both veraPDF profiles.
- **SC-004** 0 axe violations, layout shift 0, and the one module at 13,010 bytes.
- **SC-005** Every case the changed run asks passes.

## Decisions made while writing this spec

Tier 3, within D129, D130 and D229:

- RealPage's sparkle title is "Led Android across real-estate apps", made of its claim's words.
- RealPage's bar in the timeline takes the cards' second ink, as spec 012's S2.3 sets for every card.
- The card keeps `#experience-realpage`, which the timeline and the deployed chat already link, so no link breaks, and `realpage-3`, which no sentence shows, links it too.
- The new sparkle's case is titled "“Ask about this” on “Led Android across real-estate apps”", as spec 038's are.
- No sparkle asks about `realpage-3`, so `facts-realpage-stack` checks the chat states the stack as the claim does: it asks "What did Brad work in at RealPage?" and must cite `realpage-3` and name Kotlin, Java and RxJava.

## Changes to other specs

Specs 001–003 stay locked as they are, and none of their tests change.

- **Spec 005:** S3.3's seed check reads RealPage as a card.
- **Spec 012:** S1.1, S1.3, S1.4, S3.2, S3.3, S4.1, SC-003 and SC-004 read three cards and one job line, with RealPage's card and claim.
- **Spec 015:** S1.3 and S2.2 read RealPage's bullet.
- **Spec 017, spec 030 and spec 038:** the counts of sparkles, anchors and cases are 31.
- **Spec 020:** the notes' examples use `bookshout-1`, and `realpage-2` links its claim.
- **Spec 038:** S3.4 pins the new corpus bytes, and S4.2 counts RealPage's case as new.
- **Spec 039:** S8.3 pins the same new corpus bytes as spec 038's S3.4.

## Approval

- Gate 1: approved by Brad in the session on 2026-11-17, with the plan and mocks, on six cards: "No: sentence, then tags"; "Worked in Kotlin, Java and RxJava."; "Real-estate apps"; "Add real-estate apps" to the heading; "Tighter margins and gaps" for the PDFs; and "Approve".

- Corrected after Gate 1, on 2026-11-17: FR-009 and the list of changed specs name spec 039 too, whose S8.3 pins the same corpus bytes as spec 038's S3.4. The tests it lists didn't change.

## Changes since approval

- Changed in spec 041 (slice 5.14), on 2026-11-17: the home's cards hold 33 claims, with VINDecoded's stack and AI features ([D239](../../docs/decisions/0239-vindecodeds-card-reads-as-a-live-pulse.md)), and the one module grows by VINDecoded's live numbers, within Brad's 2,304-byte allowance ([D240](../../docs/decisions/0240-live-numbers-from-the-sites-own-api.md)), so SC-002, S4.1 and S5.1's tests read those. Brad approved it with spec 041 at its Gate 1.
