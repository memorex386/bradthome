# Plan 047: The offer agent, as a looping replay

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1 on 2026-11-20. The "Show it" captures in [mocks/README.md](mocks/README.md) are this plan's first build, so the approach below is what they show.

## Approach

| Part | Where | How |
| --- | --- | --- |
| The words and steps | `components/replay/replay.ts` | Every word as a constant, and `stepsOf(path)` gives the steps in order for "accepts" or "declines": a trace section, a trace line (kind, title, detail), the typing dots, an agent message, an offer card, a row of pills, a typed line, a pick on a card, and the summary. `wordsOf()` lists every word on both paths, for the tests. |
| The markup | `components/replay/render.ts` | Pure functions turn a step into an HTML string, escaping every word, so the player and the page draw the same thing. `finishedOf(path)` gives a path's whole conversation and trace with its picks. The offers' icons are drawn here as inline SVG, in the app's offer style: a blue disc with a plane and a clock badge, and a green one with a canceled ticket and a check badge. No logo, wordmark or "Provided by" line. |
| The home's box | `OfferReplay.astro`, `ReplayFrame.astro`, `styles/ds/components.css` | A `<figure data-replay>` in the Fintech AI card, after the claims: the controls' row (hidden by `visibility` until the player is ready, so it holds its place), two empty boxes for the phone and the trace, `aria-hidden`, and the label with its link as the `figcaption`. The box's sizes live in the design system's stylesheet, so they're there before any script: the phone 21rem by 37.25rem, the trace 28rem tall below it, or beside it at the phone's height from 60rem. An empty phone shows its white screen. 1,876 bytes of markup before slimming; 1,051 now, +247 with brotli. |
| The player | `components/replay/player.ts`, `styles/replay.css` | Plain DOM. It links its stylesheet by URL (`?url`), so Astro never adds it to the page's styles, and waits for it before drawing the phone's bar, chat and type box and the trace's head, log and legend into the boxes. Each step appends its markup and scrolls its box to the end; a typed line goes into the box letter by letter, then into the chat. Holds per step as the illustration's, with a 5 s hold before the loop. One timer per hold, cut short by a pause, a scroll away (an `IntersectionObserver` at 15%), a hidden tab or a restart; the time left carries on. With reduced motion it draws `finishedOf(path)` and plays only on Play, once. |
| The loader | `components/replay/load.client.ts`, `PreviewLink.astro` | In the one module: an `IntersectionObserver` with a 600 px margin on `[data-replay]` imports the player once and starts it, as `ask.client.ts` loads the chat's window (D188). No `<script>` tag and no `client:` directive is added, so spec 003's static check holds. |
| The page | `pages/offer-agent.astro`, `styles/replay-page.css` | On the design system's layout with the header and footer, noindex: the title, the "what it was" claim, the label, and per path a heading and the finished frame as plain HTML at its full height. Its traveler's lines and the chosen buttons carry visually hidden names. It imports `replay.css` statically, and loads no player. |
| The claims | `content/claims.yaml` (through the export), `hopper.ts` | The career session adds the four approved claims under Fintech AI in its notes, tagged public; `pnpm content:export` writes `hopper-fintech-ai-2` to `-5`. `RECEIPT_TITLES` gains their titles, and the topic's tags gain "LLM-as-judge" and "OpenTelemetry". The corpus and `llms.txt` read the claims, so they change with no code. |
| The PDFs | `components/resume/resume.ts`, `hopper.ts` | `OFF_PAPER` lists the four new claims, and the résumé's Hopper groups skip them, as spec 041's paper list does for the side cards. |
| The evals | `apps/evals/` | One facts case per new claim, asking about it and requiring an answer that cites it, as D230's cases do. Nothing runs (D244). |
| Motion | `styles/replay.css`, the motion table | MA-29 a message, card or pill row rises 6 px and fades in over 350 ms; MA-30 a trace line over 300 ms; MA-31 the typing dots pulse twice over 600 ms; MA-32 each box scrolls smoothly. All inside `prefers-reduced-motion: no-preference`, none infinite. The replay's loop is the player's, not CSS's, and it stops out of view. |

## Measured on this build

On a local build served as Firebase serves it, 2026-11-20:

| What | Main | Here | Budget |
| --- | --- | --- | --- |
| Home HTML, brotli | 13,095 | 13,342 (+247) | 14,000; the box +400 at most |
| Home HTML with the four claims, simulated | | about 13,680 | 14,000 |
| Player chunk, brotli | | 4,896 (13,495 raw) | 6,000 |
| Player's stylesheet, brotli | | 1,925 (7,243 raw) | 2,500 |
| The replay's box at 1440 × 900 | | 716 px, +16 px gap; the band 3,599 px before the claims | |
| The replay's box at 375 × 812 | | 1,276 px, +16 px gap; the band 6,288 px before the claims | |

The finished frame as plain HTML on the home would have taken it to about 15,400–15,600 bytes, past the first round trip, where spec 043 measured the phone LCP at 2.03–2.04 s; that's why the text and the no-script frame are on their own page (D256).

## Alternatives considered

- **The finished frame in the home's HTML, as the brief first asked:** about 2,400 bytes with brotli over D246's budget, so the LCP budget would go too. Brad chose the page (D256).
- **The player's styles in the page's stylesheet:** simpler, but 1.9 KB more render-blocking CSS on every home load, for a box most visitors reach later. A static import from the player made Astro link the stylesheet into the home, so the player links it by URL.
- **React or Motion:** the player is a list of steps and timers; plain DOM is 4.9 KB with brotli, and React would add about 50.
- **The phone and the trace scrolling by hand on the home:** a scroll box needs to be focusable for keyboards, and these are hidden from screen readers; the page holds the whole text instead.

## Risks

- **The home's byte budget is nearly spent.** With the claims, about 320 bytes are left for the next slice. The budget test names the size.
- **Timing in tests.** The end-to-end tests wait on what's drawn, not on clocks, and read the reduced-motion and paused states, so a slow runner can't flake them.
- **The export.** It writes every public bullet in the notes. If the notes hold other changes, the diff is checked with the career session before anything else ships.
- **Motion tests elsewhere.** Specs 009, 025 and 028 read the running animations; the replay's are scoped to its box, and their checks either look away from it or list MA-29–MA-32.

## Tasks

1. Gate 1: Brad approves the spec, the plan, the words and the cards; record D254–D257.
2. Report the approved claims to the career session; it adds them to its notes, tagged public.
3. Tests first, in `tests/047/`: the words' rules (FR-002), the steps on both paths, the markup's escaping, the box's place and sizes, the loader's laziness and sizes (FR-003, FR-011), the player's pause, view and hidden-tab holds, the reduced-motion still, the no-script box, the page, accessibility in both themes, CLS 0, the claims and their sparkles, the PDFs' Hopper lines, the corpus and the eval cases. Then any test that pins the band, the claims or the pages.
4. Export the claims; add their titles, tags and `OFF_PAPER`; add the eval cases.
5. Build what the tests ask beyond the first build; update `docs/plan.md`, the motion table and the records.
6. Run every check, the full suite, `pnpm test:visual` and Lighthouse; review with the pinned reviewer; fix or answer each finding.
7. Gate 2: Brad watches a recording and says push; push to main, watch `ci`, `next` and "Push on main", and list the open code-scanning alerts.
