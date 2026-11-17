---
status: accepted
date: 2026-11-17
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D238
---

# RealPage gets a card, so the Experience cards read in date order

## Context and problem statement

D130 gave each job the room its job file's `display` sets. RealPage, Lead Android Developer from Apr 2018 to Sep 2019, was one dated line with no description, and its only public sentence, `realpage-2`, showed nowhere on the site. The cards read newest first, but the lines came after them, so on live v2.10.0 RealPage sat under Bottle Rocket (Oct 2015 – Nov 2017), out of date order, while the timeline above and the résumé PDFs (D142) had it in place. Brad read the site on a phone on 2026-11-16 and asked for the job history in order, with RealPage as a bigger card. How should RealPage show, and what does its card hold?

## Decision drivers

- A recruiter reads the jobs in the order they happened, newest first, as the timeline and the PDFs already list them.
- Every sentence on the site is a public claim as written, and every label is made of its claims' words (D129, D130).
- The PDFs print what the page shows and stay at two pages (spec 015's FR-008).
- No link already given out breaks: the timeline and the deployed chat send RealPage's claims to `#experience-realpage`.

## Considered options

The options are listed in the builder's ranked order. Brad chose the shape in the career session on 2026-11-16 ("Sentence + tech row" and "Add it, keep 2 pages"), and the details on spec 040's Gate 1 cards.

1. A card for RealPage, between Bleacher Report's and BookShout's, with `realpage-2` and a Kotlin · Java · RxJava tag row whose words are a new public claim (recommended)
2. The same card, with the tag row's claim shown as its own sentence too, as the brief drafted it
3. RealPage's dated line moved above BookShout's card, with no card

## Decision outcome

Chosen option 1, which Brad approved at spec 040's Gate 1 (2026-11-17). It amends D130 for RealPage.

- `realpage.yaml` sets `display: card`, so the cards read newest first: Bleacher Report (featured), RealPage, BookShout, Bottle Rocket. The enterprise IT years and the degree stay dated lines. The timeline's rows don't change; RealPage's bar takes the cards' fill.
- RealPage's card has the kicker "Real-estate apps", its sentence `realpage-2` as written, with its sparkle titled "Led Android across real-estate apps", and a "Tags" row of Kotlin, Java and RxJava. The card keeps the `experience-realpage` anchor.
- The row's words are a new public claim, `realpage-3`, "Worked in Kotlin, Java and RxJava.", the stack Brad picked for LinkedIn on 2026-11-11, which the career session added to the notes and the export wrote. The card doesn't show it as a sentence, as "Sentence + tech row" reads (Brad's card): it backs the tags and the chat. `realpage-1` is the title alone now, its note to the site gone from the notes and from `SITE_NOTES`.
- The heading names RealPage's work: "Android for brands, a startup, real-estate apps and a sports media platform".
- The PDFs print RealPage's sentence under its heading, as the card shows it. To keep two pages, the page's top and bottom margins go from 40 and 48 px to 36 and 40, the section headings' gaps from 16 and 8 px to 12 and 6, and the jobs' gaps from 10 px to 8, with the type and line height unchanged (Brad's card). Measured in the pinned container, the tightest PDF, mobile's, keeps 13 pt under its last line.
- The corpus links `realpage-2` to `#receipt-realpage-2`, and `realpage-3`, `realpage-1` and the job to `#experience-realpage`. The new sparkle and the stack each have an eval case, and a changed run passed them (D228).
- D142 doesn't change: the PDFs still list every job newest first, and the jobs the page shows as one dated line, now the enterprise IT years alone, print as a heading with no bullets. The PDF's job order and the page's cards now agree.

### Consequences

- Good, because the jobs read in date order on the page, the timeline and the PDFs alike, and RealPage's work shows where it happened.
- Good, because every word on the card is a public claim's, and every link to RealPage still lands on it.
- Bad, because the home is 239 px longer on a desktop and 304 px on a phone.
- Bad, because the PDFs had to tighten their margins and gaps, and the mobile PDF has 13 pt to spare where it had 21.
- Bad, because the chat API bundles the corpus at deploy, so its answers link `realpage-2` to the card, not the sentence, until a release and a redeploy, each on Brad's go-ahead.

### Confirmation

Spec 040's tests check the order on the home and each role page, RealPage's card and its words against the claims, the timeline, the PDFs' pages, words and room, the corpus's links landing on the card, the eval cases and their changed run, and that the CSP, the module, the reveal, layout shift and axe hold. The amended tests of specs 005, 012, 015, 017, 020, 030, 038 and 039 check the same pages.

## Pros and cons of the options

### A card with the sentence and the tags

- Good, because it reads like Bottle Rocket's card, one sentence and a row, and the PDF prints what the card shows.
- Bad, because the tags' words come from a claim the card doesn't show as a sentence, which spec 012's label rule allows but a reader can't see.

### The same card with the tech sentence shown

- Good, because every claim behind the card shows on it, as BookShout's do.
- Bad, because the sentence repeats the tags word for word, and the PDFs would have needed their line height tightened too.

### RealPage's line moved, with no card

- Good, because the order is right with the least change.
- Bad, because Brad asked for a card, and `realpage-2` would still show nowhere.

## More information

- Decided by: Brad Thome, on the career session's cards (2026-11-16) and at spec 040's Gate 1 (2026-11-17).
- Spec: [spec 040](../../specs/040-job-order/spec.md).
- Amends: [D130](0130-experience-weights-each-job-by-its-display.md).
- Builds on [D129](0129-the-hopper-story-ships-from-the-public-resume-claims.md), [D134](0134-role-pages-light-the-hero-and-reorder-the-hopper-story.md), [D142](0142-the-resume-pdfs-list-jobs-newest-first.md), [D211](0211-sections-reveal-their-evidence-once.md), [D228](0228-evals-run-the-cases-a-change-touches.md), [D229](0229-proof-on-the-card.md) and [D230](0230-a-sparkle-on-each-claim-opens-the-chat.md).
