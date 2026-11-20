# Spec 047: The offer agent, as a looping replay

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                  |
| Status          | Approved                                                                                                                                                                                                                               |
| Slice           | 5.20 The offer agent, replayed (Brad's picks of 2026-11-20)                                                                                                                                                                           |
| Branch          | `047-offer-agent-replay`                                                                                                                                                                                                              |
| Gate 1          | Approved by Brad on 2026-11-20, on the session's cards: the four claims' words with 12.6%, no dates, the app's offer style with its product names, Brad as the sample traveler, the words as listed, the loop as the charter's exception, the byte caps, the frame's size, the text on its own page and no new PDF line                                       |
| Mocks and flows | [mocks/README.md](mocks/README.md): every state, captured from this slice's own build                                                                                                                                                 |
| Words           | [words.md](words.md): every word the replay and its page show, for Brad's approval                                                                                                                                                    |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                             |
| Decisions       | D254–D257, from this slice: the replay (D254), the claims (D255), the text on its own page (D256) and the PDFs (D257). It builds on D122, D129, D147, D154, D188, D229, D230, D234, D235, D244 and D246 |

## Summary

On 2026-11-20 Brad told the career session about an AI sales agent Brad built most of on Hopper's Fintech AI team. In Hopper's flight booking, where the app showed two static add-on offers, travelers got a conversation instead: it explained each offer against their own flight, answered questions from the terms, and let them accept or decline by tapping or typing, then offered the second, shaped by the first answer, and ended on a summary. No screenshot or recording of it exists, so the career session drew an illustration, and Brad chose to show it as a looping replay.

This slice puts that replay in the Hopper band's Fintech AI card, with four new claims in Brad's approved words. A phone plays the conversation on its own, and beside it an "Under the hood" trace fills in step by step: the data fetched before the first word, retrieval, a tool call, the prompt, what the model returns, the guards and the telemetry. It's labeled as an illustration with sample data, it plays only while it's in view, Pause comes first, and with reduced motion it stands still. The home's HTML holds only its box, so the page keeps its byte and LCP budgets; the whole conversation, both ways it can go, is plain HTML on a page of its own, which is also what a visitor with no script reads.

## Scope

**In:**

- The replay: `components/replay/` (`replay.ts` holds every word and step, `render.ts` the markup, `OfferReplay.astro` the home's box, `ReplayFrame.astro` the frame, `player.ts` the player, `load.client.ts` its loader), `styles/replay.css` (the player's own styles), `styles/replay-page.css`, and the box's styles in `styles/ds/components.css`.
- The band: `Hopper.astro` and `hopper.ts` (the replay's topic, the new claims' sparkle titles and the card's tags).
- The page: `pages/offer-agent.astro`, at `/offer-agent`, with noindex.
- The one module: `PreviewLink.astro` imports the loader.
- The claims: four new Fintech AI claims through `pnpm content:export` (D255), their sparkles (D230) and `#receipt-` anchors (D229), so `/corpus.json` and `/llms.txt` gain them and the chat can answer about the agent; one eval case per claim, run by nobody while evals are off (D244).
- The PDFs: a paper list, so they print the Hopper claims they print today and none of the new ones (D257).
- Records D254–D257, `docs/plan.md`'s slice 5.20, MA-29–MA-32 in spec 009's motion check, new tests in `tests/047/`, and any test that pins today's band, page list or claim count.

**Out:**

- A release, and the chat API's deploy for its corpus: each on Brad's own go-ahead, after the push.
- Interview prep's prompt, the chat's prompt and model, and the role pages' topic order.
- A share card for the new page: it carries noindex and names the home's, as `/privacy` does.

## User stories and acceptance scenarios

The state IDs in brackets are the captures in [mocks/README.md](mocks/README.md).

### Story 1: A recruiter sees the agent work (P1)

A recruiter reading the Hopper band should see what the offer agent did, in a few seconds, without a screenshot that doesn't exist.

**Independent test:** open the home at 1440 × 900 and 375 × 812, scroll to Fintech AI, and watch.

- **S1.1** Given the Fintech AI card, then after its claims, before its tags, it shows the replay: a row of controls, a phone, and the "Under the hood" trace, beside the phone from 60rem and below it narrower (M1–M4).
- **S1.2** Given the replay in view with motion allowed, then the phone plays, in order: the opening, the first offer's card, its three pills, a typed question and its answer, the typed decision, the second offer framed by that decision, its card and pills, the second decision and the summary; and the trace fills in with each step's lines, color-coded by kind, the latest one lit (M1–M4).
- **S1.3** Given the replay at its summary, then after 5 s it starts again from the first step, and so on while it's in view.
- **S1.4** Given "Declines first", then it plays from the start the other way: the first offer declined, the second framed as peace of mind before the trip, and accepted (M3d, M4d). "Accepts first" plays it back the first way, and the pressed button says which is playing.
- **S1.5** Given every frame, then the label shows under it: "An illustration drawn from Brad's account, not a screenshot or a real trace. The flight, prices, risks, terms and data are sample values." with "Read the conversation" linking `/offer-agent`.
- **S1.6** Given any word in the replay, then it's one of [words.md](words.md)'s, fixed in the build; none is generated, and none is a Hopper internal name, a real prompt, an airline's name, "insurance", a pass percentage or a person's name but the sample traveler's.

### Story 2: The visitor stays in control (P1)

The replay moves on its own, so a visitor must be able to stop it, and it must never move for someone who asked for less motion.

**Independent test:** with motion allowed, press Pause, scroll away and back, hide the tab; then load the page with reduced motion.

- **S2.1** Given the controls, then Pause is the first, then Restart, then the two paths, each at least 44 × 44 px with a visible focus ring, in the band's colors (WCAG 2.2.2, 2.5.8).
- **S2.2** Given the replay playing, when Pause is pressed, then it holds where it is and the button says Play; when Play is pressed, it carries on from there.
- **S2.3** Given the replay playing, when it leaves the screen or the tab is hidden, then it holds, and when it's back, it carries on; it never plays while less than 15% of it is on screen.
- **S2.4** Given Restart, then it plays from the first step on the current path, playing even if it was paused.
- **S2.5** Given reduced motion, then the replay shows the finished conversation and trace of the current path, still, with nothing moving and Play as the first button; the paths switch between the two finished frames; Play plays it once, with no rises or smooth scrolls, and ends still on the summary (M5).
- **S2.6** Given motion allowed, then its only motions are MA-29–MA-32: each new message, card or pill row rises 6 px into place over 350 ms; each trace line over 300 ms; the typing dots pulse twice; and each box scrolls smoothly to its latest line. Each runs once, and none runs with reduced motion.

### Story 3: Everyone can read it (P1)

A screen reader user, a keyboard user and a visitor with no script should get the whole conversation, not a stream they can't follow.

**Independent test:** read the home's replay with a screen reader's tree, tab through it, and load the home and `/offer-agent` with script off.

- **S3.1** Given the home, then the phone and the trace are hidden from screen readers and hold nothing focusable, and the label and its link are not hidden.
- **S3.2** Given `/offer-agent`, then it shows "The offer agent, illustrated", the "what it was" claim, the label, and both paths' finished frames under "When the traveler accepts the first offer" and "When the traveler declines the first offer", as plain HTML in reading order, with the traveler's lines and the chosen buttons named for screen readers, and a link back to the Fintech AI card (M7).
- **S3.3** Given the home with no script, then the replay's box shows its empty phone and trace at their full size, the controls are hidden, and the label and its link show (M6). `/offer-agent` is the same with or without script, and loads no player.
- **S3.4** Given the home and `/offer-agent` in both themes, then no automated accessibility check fails at WCAG 2.2 AA.

### Story 4: The claims say what the replay shows (P1)

The replay is an illustration; the claims are the record, in Brad's approved words, with their sparkles and in the chat's corpus.

**Independent test:** read the built Fintech AI card, `/corpus.json` and `/llms.txt`.

- **S4.1** Given the Fintech AI card, then after `hopper-fintech-ai-1` it shows, word for word:
  - `hopper-fintech-ai-2`: "Built most of an AI sales agent for Hopper's flight booking: in place of the static disruption and cancellation offers, a conversation explained each offer against the traveler's own flight, answered questions from the terms, and let them accept or decline by tapping or typing."
  - `hopper-fintech-ai-3`: "Grounded it in the flight, traveler and offer data, fetched before the first word, plus retrieval over delay data, past conversions and the terms, and a news and weather search tool."
  - `hopper-fintech-ai-4`: "Shipped it behind an LLM-as-judge eval gate, with LLM observability, OpenTelemetry tracing, alerts and a kill switch."
  - `hopper-fintech-ai-5`: "In an A/B test against the static offers, it lifted the attach rate by 12.6% and ramped to 100% of app traffic."
- **S4.2** Given each new claim, then it carries the `#receipt-` anchor and the sparkle that asks Ask about Brad about it, named by its title.
- **S4.3** Given `/corpus.json` and `/llms.txt`, then each holds the four claims, and the chat's prompt and model don't change.
- **S4.4** Given `apps/evals`, then each new claim has a case asking about it, and no eval runs in this slice (D244).
- **S4.5** Given `claims.yaml`, then it's written by `pnpm content:export` from the notes' public bullets, never by hand.

### Story 5: Nothing else gets slower or moves (P1)

**Independent test:** build, measure, and run the budgets and the end-to-end checks.

- **S5.1** Given the home's built HTML, then it's 14,000 bytes or less with brotli (D246), and the replay's box adds at most 400 of them.
- **S5.2** Given the home, then until the replay nears the screen, no request for the player or its styles is made, and its stylesheets are main's; as it comes within 600 px, the player's chunk and its own stylesheet load once.
- **S5.3** Given the build, then the player's chunk is at most 6,000 bytes with brotli, its stylesheet at most 2,500, and the one module grows by at most 500.
- **S5.4** Given the home loading and scrolling past the replay, then cumulative layout shift stays 0, and the phone's median LCP stays 2.0 s or less.
- **S5.5** Given the build, then `firebase.json`'s Content-Security-Policy is unchanged.
- **S5.6** Given the résumé PDFs, then they print the Hopper claims they print today and none of the new ones, in two pages each.
- **S5.7** Given 375 × 812, then nothing in the band is wider than the page.

## Edge cases

- The player's chunk or its stylesheet fails to load: the box stays empty, the controls stay hidden, and the label's link still leads to the text. Covered by S3.3.
- A visitor scrolls away mid-typing: the typing holds and carries on from the same letter. Covered by S2.3.
- A visitor switches path while paused: the new path plays from its start, unpaused. Covered by S1.4.
- Reduced motion changes while the page is open: it takes effect at the next path switch or Restart.
- A role page: its Hopper band shows the replay too, in the role's topic order; the budget applies only to the home.
- The export brings more than the four claims: anything else it writes is checked with the career session before it's kept, and nothing else ships in this slice.

## Functional requirements

- **FR-001** The Fintech AI card MUST show the replay after its claims and before its sources and tags, across the card's width, with its box sized in the page's own styles: the controls' row, the phone 21rem wide and 37.25rem tall, and the trace 28rem tall below it, or beside it and as tall as the phone from 60rem.
- **FR-002** Every word the replay and `/offer-agent` show MUST come from `replay.ts`, and MUST be one Brad approved in [words.md](words.md). A test MUST fail on a word that's an airline's name, "insurance", "coverage" or "covered", a percentage of eval cases, the offers' short internal names, any code-like name (snake_case, kebab-case or CamelCase) that isn't one of the replay's own generic names, or a URL; the private-term scan covers Hopper's internal names, which no public file may list.
- **FR-003** The site's one module MUST load the player with a dynamic import only when the replay is within 600 px of the screen, and the player MUST link its stylesheet by URL, so neither is in the home's first load.
- **FR-004** The player MUST play only while 15% or more of the replay is on screen and the tab is shown, MUST hold where it is when paused, scrolled away or hidden, and MUST loop after a 5 s hold at the summary.
- **FR-005** The controls MUST be, in order: Pause (Play while held or still), Restart, and a group of two buttons with `aria-pressed`, "Accepts first" and "Declines first", each at least 44 × 44 px, hidden until the player is ready while keeping their place.
- **FR-006** With reduced motion the player MUST draw the current path's finished frame with no motion and play only when Play is pressed; MA-29–MA-32 MUST sit inside `prefers-reduced-motion: no-preference`, and none MUST be infinite.
- **FR-007** On the home the phone and the trace MUST be `aria-hidden` with nothing focusable inside, and MUST NOT scroll on their own for the user; the label MUST always show, with its link to `/offer-agent`.
- **FR-008** `/offer-agent` MUST show both paths' finished frames as plain HTML from the same words, load no player, carry noindex, and link back to `/#hopper-fintech-ai`.
- **FR-009** The four claims MUST come through `pnpm content:export`, each with its sparkle title in `hopper.ts`, and each MUST have an eval case.
- **FR-010** The résumé PDFs MUST print none of the four new claims, and everything else as today.
- **FR-011** The home's HTML MUST stay at 14,000 bytes or less with brotli, the replay's box adding 400 or fewer; the player's chunk MUST be 6,000 or fewer, its stylesheet 2,500 or fewer, and the one module MUST grow by 500 or fewer, each with brotli at quality 11.
- **FR-012** The CSP, the chat's prompt and model, interview prep's prompt, the role pages' topic order and the analytics events MUST NOT change; no page may load anything from another host for the replay.
- **FR-013** The slice MUST record D254–D257, add slice 5.20 to `docs/plan.md`, name MA-29–MA-32 in this spec and in spec 009's motion check, as specs 025–038 name theirs, and update every test and baseline that pins today's band, claims or pages. Specs 001–003 keep their locks.

## Success criteria

- **SC-001** On a phone and a desktop, a visitor sees the agent's opening and its first offer within 6 s of the replay coming into view, with motion allowed.
- **SC-002** The home's HTML is 14,000 bytes or less with brotli, and its phone LCP over five lab runs is 2.0 s or less.
- **SC-003** Cumulative layout shift 0 on the home while it loads and scrolls past the replay.
- **SC-004** No automated accessibility violation on the home and `/offer-agent`, in both themes.
- **SC-005** The band's growth, reported in the plan: at 1440 × 900 the Fintech AI card grows by the replay's 732 px (716 and its 16 px gap) and the claims' lines; at 375 × 812 by the replay's 1,292 px (1,276 and its gap) and the claims' lines.

## Mocks and flows

[mocks/README.md](mocks/README.md) lists every capture: the opening, the typed question, the decision and the summary at 1440 × 900 and 375 × 812 in both themes, the declines path's decision and summary, the reduced-motion still, the no-script box, and `/offer-agent`. Brad saw them at Gate 1 before the export; they're captured again from the built slice, with the four claims in place.

## Assumptions

- The sample flight, prices, risks, terms and data are made up, and the label says so; the trace's names (`show_offer`, `search_news_weather`, `offer_viewed`) are generic ones written here.
- The band is dark in both themes, so the replay looks the same in both; `/offer-agent` takes the page's own colors around the frames.
- The career session adds the four approved claims to its notes, tagged public, before the export.

## Open questions

None.

## Tier-3 choices, inside this spec

- The sample flight moves to Fri, Dec 18, 2026, since Dec 19, 2026 is a Saturday; the trace's dates follow it.
- The answer to the typed question says "it doesn't apply" and the terms line "applies to", in place of "covered" and "covers", which read as insurance.
- The trace names the offers `disruption` and `cancel_any_reason`, and drops the routes the illustration had (`GET /flight`), so no line reads like a real endpoint; the prompt line says "words legal ruled out" rather than quoting one.
- The traveler's line in the trace takes its own badge and a "Traveler" legend entry.
- The phone and the trace on the home don't scroll by hand: they're hidden from screen readers, and a scroll box with nothing focusable fails keyboard access. The whole text is a link away.
- The player waits on one timer per step, which a pause, a scroll away or a restart cuts short, so a hidden tab's timer throttling can't slow it.
- From the build and the review: the trace lines before the first word hold 300 ms, the dots 600 ms and a message 1.3 s, so the first offer shows at 5.9 s (SC-001); a new line rises with no fade, so an accessibility check never reads its words mid-fade; the type box is one line that scrolls to its newest letter, with the caret as the typed words' edge, so typing shifts nothing; the offers' blue is #276aa3 and the choice not taken goes grey rather than faded, each at 4.5:1 or more; and the player reads reduced motion from its own stylesheet's `--r-still`, since spec 003's locked check bars `matchMedia` from the site's scripts.
- The sparkle titles: "AI sales agent for flight booking", "Grounded in flight, traveler and offer data", "LLM-as-judge eval gate" and "Lifted the attach rate by 12.6%". The card's tags gain "LLM-as-judge" and "OpenTelemetry", each in a claim.

## Not decided here

- When this reaches bradthome.com: a release, on Brad's go-ahead, then `pnpm chat-api:deploy` on its own go-ahead, since the corpus changes. With evals off, that deploy runs no eval check.
