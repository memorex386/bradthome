---
status: accepted
date: 2026-11-20
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D254
---

# The offer agent, as a looping replay in the Hopper band

## Context and problem statement

On Hopper's Fintech AI team Brad built most of an AI sales agent that replaced two static add-on offers in flight booking with a conversation. No screenshot, recording or press of it exists. In the career session Brad chose to show it as a looping replay of an illustration: a phone playing the conversation beside an "Under the hood" trace. The charter's third principle, from D35, says motion stays short and never loops. How should the replay show, and does it override that rule?

## Decision drivers

- Visitors should see what the agent did in seconds, and know it's an illustration, not a screenshot or a real trace.
- Every word on the site is public and fixed, and no Hopper internal name, real prompt, airline name or "insurance" appears.
- The home keeps its byte, LCP and layout-shift budgets (D246), and the CSP doesn't change.
- Moving content needs a way to pause it (WCAG 2.2.2), and none of it moves under reduced motion (D122).

## Considered options

The cards' options, in the builder's ranked order:

1. The look: (a) the site's own tokens with drawn icons (recommended), (b) the app's offer style, as the illustration draws it.
2. The motion: (a) loop while in view, with Pause first, holding when scrolled away or the tab is hidden, still under reduced motion (recommended), (b) play once and stop on the summary.
3. The byte allowance: (a) the box 400, the player 6,000, its styles 2,500 and the one module 500, all brotli (recommended), (b) the measured size plus 10%.
4. The size: (a) the phone 21rem by 37.25rem with the trace as tall beside it, or 28rem below it on a phone (recommended), (b) a shorter frame.

## Decision outcome

On Brad's cards in spec 047's session, 2026-11-20: the app's offer style (1b), looping with safeguards (2a), the recommended allowance (3a) and size (4a).

- The replay sits in the Fintech AI card after its claims: Pause, Restart and the two paths ("Accepts first", "Declines first") over the phone and the trace, and the label under it: "An illustration drawn from Brad's account, not a screenshot or a real trace. The flight, prices, risks, terms and data are sample values.", with a link to the whole text (D256).
- The phone draws the app's offer style: a white app with a blue card for disruption and a green one to cancel for any reason, titled with the products' customer-facing names, and icons drawn here. No logo, wordmark or "Provided by" line; the footer's owners line stays (D235).
- Every word is fixed in `replay.ts`, as Brad approved them in spec 047's `words.md`. The sample traveler is Brad, the flight is DFW to SEA on Fri, Dec 18, and the trace's names are generic ones written here. The eval gate has no number.
- The home's HTML holds only the box; the site's one module loads the player and its own stylesheet as their own chunk when the replay nears the screen, as D188 loads the chat. It plays while 15% or more of it is in view and the tab is shown, loops after a 5 s hold, and stands still with the finished frame under reduced motion. Its motions are MA-29–MA-32.
- The charter's third principle gains an exception: an illustration may loop while it's in view, if Pause comes first and it holds out of view and stands still under reduced motion.

### Consequences

- Good, because a visitor sees the agent's opening and first offer within seconds, with the engineering beside it.
- Good, because the home's first load gains 247 bytes, and the player's 6.8 KB load only for those who reach it.
- Bad, because the band grows by 732 px on a desktop and 1,292 px on a phone, plus the claims.
- Bad, because the app's style and product names read closer to Hopper's own screen; the label says it's an illustration.
- Bad, because the charter's motion rule now has an exception to guard.

### Confirmation

Spec 047's tests: the words' rules, both paths' steps, the box's place and sizes, the loader's laziness and the byte caps, Pause, the holds out of view and in a hidden tab, the reduced-motion still, CLS 0, and accessibility in both themes.

## More information

- Evidence: spec 047's plan and mocks, 2026-11-20.
- Decided by: Brad Thome, on the session's cards in spec 047. Amends the charter's third principle ([D35](0035-purposeful-motion.md)).
