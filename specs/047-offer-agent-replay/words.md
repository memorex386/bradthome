# Spec 047: every word in the replay

Every word the offer agent's replay and its page `/offer-agent` show, generated from `apps/site/src/components/replay/replay.ts`, which the build reads. Each is fixed text, never generated, and each is a public word Brad approves at Gate 1. The flight, prices, risks, terms and data are sample values, and the trace's names are generic ones written here. The four claims are in [spec.md](spec.md)'s S4.1.
## Around the replay

- Label, always shown under it: "An illustration drawn from Brad's account, not a screenshot or a real trace. The flight, prices, risks, terms and data are sample values."
- Its link: "Read the conversation", to `/offer-agent`
- Controls: "Pause" ("Play" while held), "Restart", and a group named "What the traveler does with the first offer": "Accepts first" and "Declines first"
- The page: "The offer agent, illustrated", then the "what it was" claim, the label, and "When the traveler accepts the first offer" and "When the traveler declines the first offer" over the two finished frames, and "Back to Hopper's Fintech AI work"

## The phone

- Its bar: "DFW → SEA · Fri, Dec 18" / "Departs 8:30 PM CT · 1 traveler"
- The agent's name over each message: "Trip assistant"
- The box to type in: "Ask about your options…"
- For screen readers only, on the page: "Traveler:" before the traveler's lines, "chosen:" before the chosen button, and "Suggested questions" on each row of pills

### The first offer's card (blue)

- "Premium Disruption Assistance"
- "If your flight is canceled or delayed 2+ hours (to 10:30 PM or later):"
- "We rebook you on a new flight on any airline (up to $210 per traveler); or"
- "Get a $72.40 refund per traveler and keep your original reservation"
- "Use self-serve tools or speak to an agent"
- "How it works" · "View terms"
- Button: "Add to my trip for $9"; link: "No, thanks"

### The second offer's card (green)

- "Cancel For Any Reason"
- "Plans change. Cancel up to 24 hours before departure, for any reason:"
- "Get 80% of your trip cost back, $289.60 per traveler"
- "No reason needed, no paperwork"
- "Cancel in the app in a couple of taps"
- "How it works" · "View terms"
- Button: "Add to my trip for $38"; link: "No, thanks"

### The summary card

- "Your trip options"
- Each offer's name, then "Added · $9" (or $38) or "Declined"
- "Added to your total": $9 on the accepts path, $38 on the declines path
- Buttons: "Change answers" and "Continue to checkout"

## The conversation and the trace, step by step

The trace's head: "Under the hood" and "Illustrative trace, in step with the phone". Its legend: "Prefetch", "Retrieval", "Tool call", "Prompt", "Model output", "Guard", "Telemetry", "Ops", "Traveler". Each line's badge: "Prefetch", "Retrieve", "Tool", "Prompt", "Model", "Guard", "Event", "Ops", "Traveler".

Lines marked **(accepts)** or **(declines)** differ by path; the rest are the same on both.


**Before the first word**

- Trace · Prefetch: "Flight" — `{"route":"DFW → SEA","departs":"Fri 20:30 CT","travelers":1}`
- Trace · Prefetch: "Traveler" — `{"first_name":"Brad","past_trips":6}`
- Trace · Prefetch: "Offers" — `{"disruption":{"price":9,"delay_h":2,"rebook_cap":210,"refund":72.40},  "cancel_any_reason":{"price":38,"refund_pct":80,"cutoff_h":24}}`
- Trace · Retrieve: "Delay data" — `DFW · evening · December → 2h+ delays more common than mornings`
- Trace · Retrieve: "Past conversions" — `evening flights · disruption offer first → higher attach`
- Trace · Tool: "search_news_weather" — `args {"airport":"DFW","date":"2026-12-18"} → "storms in Friday's forecast"`
- Trace · Prompt: "Prompt assembled" — `role: friendly, non-pushy guide order: 2 sentences → offer → … → summary never: words legal ruled out · airline names in delay talk context: flight, traveler, offers, risk notes, terms`

**Opening**

- Phone · Trip assistant: "Hi Brad, your flight from DFW to SEA departs at 8:30 PM, and evening departures out of DFW run late more often than morning ones, with storms in Friday's forecast. Disruption assistance means a long delay or a cancellation won't strand you. Want me to walk through what happens if you're delayed?"
- Trace · Model: "Text: 2 sentences + a first question" — `grounded in: flight, delay data, forecast`
- Trace · Model: "Widget call: chose the disruption offer first" — `show_offer({"type":"disruption","threshold":"22:30 CT","price":9})`
- Phone · the first offer's card
- Trace · Model: "3 follow-up pills, written on demand" — `["What if it's only 90 minutes late?",  "How fast is rebooking?","How is this different from canceling?"]`
- Phone · pills: "What if it's only 90 minutes late?", "How fast is rebooking?", "How is this different from canceling?"
- Trace · Guard: "Output checks" — `banned words ✓  airline names ✓  prices match offer ✓`
- Trace · Event: "offer_viewed" — `{"offer":"disruption","position":1}`

**A typed question**

- Phone · the traveler types: "What if it's only delayed 90 minutes?"
- Trace · Traveler: "Question, scoped to the offer in view" — `context: disruption`
- Trace · Retrieve: "Terms" — `disruption terms · applies to delays of 2+ hours on the day of travel`
- Phone · Trip assistant: "Then it doesn't apply. It starts at a 2-hour delay, so for your flight that's 10:30 PM or later. If it gets there, you can rebook on any airline or take the $72.40 refund and keep your seat."
- Trace · Model: "Answer + new pills" — `grounded in: terms, offer price`
- Phone · pills: "How fast is rebooking?", "Can I keep my original seat?", "Compare it with canceling"

**Decision**

- Phone · the traveler types: "Yeah, I'll take it" **(accepts)**
- Phone · the traveler types: "I don't think I need that" **(declines)**
- Trace · Model: "Intent from free text" — `accept(disruption)` **(accepts)**
- Trace · Model: "Intent from free text" — `decline(disruption)` **(declines)**
- Phone · the first card shows its button chosen **(accepts)**
- Phone · the first card shows "No, thanks" chosen **(declines)**
- Trace · Event: "offer_accepted" — `{"offer":"disruption","turns":2}` **(accepts)**
- Trace · Event: "offer_declined" — `{"offer":"disruption","turns":2}` **(declines)**

**Second offer**

- Trace · Model: "Framing for the second offer" — `separate product: plans changing before the trip` **(accepts)**
- Trace · Model: "Framing for the second offer" — `after a decline: peace of mind before the trip` **(declines)**
- Phone · Trip assistant: "You're set if the trip goes sideways on the day. One more option, separate from that: if your plans change before you fly, you can cancel for any reason and get most of your money back." **(accepts)**
- Phone · Trip assistant: "No problem. If what you'd really like is peace of mind before the trip, you can cancel for any reason up to a day before and get most of your money back." **(declines)**
- Trace · Model: "Widget call" — `show_offer({"type":"cancel_any_reason","price":38,"refund_pct":80})`
- Phone · the second offer's card
- Phone · pills: "What can I cancel for?", "When do I get my refund?", "Compare the two options"
- Trace · Guard: "Output checks" — `banned words ✓  terms match ✓`
- Phone · the traveler types: "No thanks" **(accepts)**
- Phone · the traveler types: "Yeah, add that" **(declines)**
- Trace · Model: "Intent from free text" — `decline(cancel_any_reason)` **(accepts)**
- Trace · Model: "Intent from free text" — `accept(cancel_any_reason)` **(declines)**
- Phone · the second card shows "No, thanks" chosen **(accepts)**
- Phone · the second card shows its button chosen **(declines)**

**Summary**

- Trace · Model: "Always ends on the summary widget" — `show_summary({"disruption":"accepted","cancel_any_reason":"declined"})` **(accepts)**
- Trace · Model: "Always ends on the summary widget" — `show_summary({"disruption":"declined","cancel_any_reason":"accepted"})` **(declines)**
- Phone · the summary card
- Trace · Event: "flow_completed" — `{"disruption":"accepted","cancel_any_reason":"declined","turns":4}` **(accepts)**
- Trace · Event: "flow_completed" — `{"disruption":"declined","cancel_any_reason":"accepted","turns":4}` **(declines)**
- Trace · Ops: "LLM observability trace" — `OpenTelemetry spans: prefetch, retrieval, tool, model alert if a widget fails to render → kill switch`
- Trace · Ops: "Release gate" — `LLM-as-judge eval cases · a set share must pass to ship`
