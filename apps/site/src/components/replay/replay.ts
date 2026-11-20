// The offer agent's replay (spec 047): every word it shows, and the steps it
// plays. Each is fixed text written into the build, never generated, and each
// is a public word Brad approved at Gate 1. It's an illustration drawn from
// Brad's account, not a screenshot or a real trace: the flight, prices,
// risks, terms and data are sample values, and the trace's names are generic
// ones written here. One source serves the home's player, which loads only
// as the replay nears the screen, and the page that shows the finished frames
// as plain HTML.

/** The two ways the replay can go: the traveler accepts the first offer, or declines it. */
export type Path = 'accepts' | 'declines'
export const PATHS: readonly Path[] = ['accepts', 'declines']

/** A trace line's kind, which colors its badge and the legend. */
export type Kind = 'prefetch' | 'retrieve' | 'tool' | 'prompt' | 'model' | 'guard' | 'event' | 'ops' | 'user'

/** One step of the replay, in the order it plays. */
export type Step =
  | { sec: string }
  | { tr: readonly [Kind, string, string?] }
  | { dots: true }
  | { ai: string }
  | { offer: Offer }
  | { pills: readonly string[] }
  | { type: string }
  | { pick: readonly [Offer, boolean] }
  | { summary: readonly [boolean, boolean] }

/** The first offer, for disruption, and the second, to cancel for any reason. */
export type Offer = 'a' | 'b'

/** The words around the replay. */
export const TITLE = 'The offer agent, illustrated'
export const LABEL =
  "An illustration drawn from Brad's account, not a screenshot or a real trace. The flight, prices, risks, terms and data are sample values."
export const READ = 'Read the conversation'
export const PAGE = '/offer-agent'
export const CONTROLS = {
  pause: 'Pause',
  play: 'Play',
  restart: 'Restart',
  group: 'What the traveler does with the first offer',
  accepts: 'Accepts first',
  declines: 'Declines first',
} as const

/** The page's two frames, one per path. */
export const PATH_HEADINGS: Readonly<Record<Path, string>> = {
  accepts: 'When the traveler accepts the first offer',
  declines: 'When the traveler declines the first offer',
}

/** The phone's fixed parts. */
export const PHONE = {
  route: 'DFW → SEA · Fri, Dec 18',
  departs: 'Departs 8:30 PM CT · 1 traveler',
  who: 'Trip assistant',
  traveler: 'Traveler',
  placeholder: 'Ask about your options…',
  pills: 'Suggested questions',
  chosen: 'chosen',
} as const

/** The trace's fixed parts. */
export const TRACE = {
  title: 'Under the hood',
  note: 'Illustrative trace, in step with the phone',
} as const

/** Each kind's badge, and its name in the legend. */
export const KINDS: Readonly<Record<Kind, { badge: string; legend: string }>> = {
  prefetch: { badge: 'Prefetch', legend: 'Prefetch' },
  retrieve: { badge: 'Retrieve', legend: 'Retrieval' },
  tool: { badge: 'Tool', legend: 'Tool call' },
  prompt: { badge: 'Prompt', legend: 'Prompt' },
  model: { badge: 'Model', legend: 'Model output' },
  guard: { badge: 'Guard', legend: 'Guard' },
  event: { badge: 'Event', legend: 'Telemetry' },
  ops: { badge: 'Ops', legend: 'Ops' },
  user: { badge: 'Traveler', legend: 'Traveler' },
}

/**
 * The offer cards. In their text, `**words**` are bold and `[[words]]` are
 * the money line, in the card's accent.
 */
export interface OfferCard {
  title: string
  lead: string
  bullets: readonly { icon: 'plane' | 'coin' | 'phone' | 'calendar'; text: string }[]
  links: readonly string[]
  yes: string
  no: string
  price: string
}

export const OFFERS: Readonly<Record<Offer, OfferCard>> = {
  a: {
    title: 'Premium Disruption Assistance',
    lead: 'If your flight is **canceled or delayed 2+ hours** (to 10:30 PM or later):',
    bullets: [
      { icon: 'plane', text: '**We rebook you on a new flight** on any airline (up to $210 per traveler); or' },
      { icon: 'coin', text: 'Get a [[$72.40 refund per traveler]] and keep your original reservation' },
      { icon: 'phone', text: 'Use self-serve tools or speak to an agent' },
    ],
    links: ['How it works', 'View terms'],
    yes: 'Add to my trip for $9',
    no: 'No, thanks',
    price: '$9',
  },
  b: {
    title: 'Cancel For Any Reason',
    lead: 'Plans change. Cancel **up to 24 hours before departure**, for any reason:',
    bullets: [
      { icon: 'coin', text: 'Get [[80% of your trip cost back]], $289.60 per traveler' },
      { icon: 'calendar', text: 'No reason needed, no paperwork' },
      { icon: 'phone', text: 'Cancel in the app in a couple of taps' },
    ],
    links: ['How it works', 'View terms'],
    yes: 'Add to my trip for $38',
    no: 'No, thanks',
    price: '$38',
  },
}

/** The summary card's words. */
export const SUMMARY = {
  title: 'Your trip options',
  added: 'Added',
  declined: 'Declined',
  total: 'Added to your total',
  change: 'Change answers',
  go: 'Continue to checkout',
} as const

/** The total the summary shows, from what the traveler added. */
export function totalOf(a: boolean, b: boolean): string {
  return `$${(a ? 9 : 0) + (b ? 38 : 0)}`
}

/** The replay's steps for one path, in order. */
export function stepsOf(path: Path): Step[] {
  const yes = path === 'accepts'
  const second = !yes
  const state = (on: boolean) => (on ? 'accepted' : 'declined')
  return [
    { sec: 'Before the first word' },
    { tr: ['prefetch', 'Flight', '{"route":"DFW → SEA","departs":"Fri 20:30 CT","travelers":1}'] },
    { tr: ['prefetch', 'Traveler', '{"first_name":"Brad","past_trips":6}'] },
    {
      tr: [
        'prefetch',
        'Offers',
        '{"disruption":{"price":9,"delay_h":2,"rebook_cap":210,"refund":72.40},\n "cancel_any_reason":{"price":38,"refund_pct":80,"cutoff_h":24}}',
      ],
    },
    { tr: ['retrieve', 'Delay data', 'DFW · evening · December → 2h+ delays more common than mornings'] },
    { tr: ['retrieve', 'Past conversions', 'evening flights · disruption offer first → higher attach'] },
    { tr: ['tool', 'search_news_weather', 'args {"airport":"DFW","date":"2026-12-18"}\n→ "storms in Friday\'s forecast"'] },
    {
      tr: [
        'prompt',
        'Prompt assembled',
        'role: friendly, non-pushy guide\norder: 2 sentences → offer → … → summary\nnever: words legal ruled out · airline names in delay talk\ncontext: flight, traveler, offers, risk notes, terms',
      ],
    },
    { sec: 'Opening' },
    { dots: true },
    {
      ai: "Hi Brad, your flight from DFW to SEA departs at 8:30 PM, and evening departures out of DFW run late more often than morning ones, with storms in Friday's forecast. Disruption assistance means a long delay or a cancellation won't strand you. Want me to walk through what happens if you're delayed?",
    },
    { tr: ['model', 'Text: 2 sentences + a first question', 'grounded in: flight, delay data, forecast'] },
    { tr: ['model', 'Widget call: chose the disruption offer first', 'show_offer({"type":"disruption","threshold":"22:30 CT","price":9})'] },
    { offer: 'a' },
    {
      tr: [
        'model',
        '3 follow-up pills, written on demand',
        '["What if it\'s only 90 minutes late?",\n "How fast is rebooking?","How is this different from canceling?"]',
      ],
    },
    { pills: ["What if it's only 90 minutes late?", 'How fast is rebooking?', 'How is this different from canceling?'] },
    { tr: ['guard', 'Output checks', 'banned words ✓  airline names ✓  prices match offer ✓'] },
    { tr: ['event', 'offer_viewed', '{"offer":"disruption","position":1}'] },
    { sec: 'A typed question' },
    { type: "What if it's only delayed 90 minutes?" },
    { tr: ['user', 'Question, scoped to the offer in view', 'context: disruption'] },
    { tr: ['retrieve', 'Terms', 'disruption terms · applies to delays of 2+ hours on the day of travel'] },
    { dots: true },
    {
      ai: "Then it doesn't apply. It starts at a 2-hour delay, so for your flight that's 10:30 PM or later. If it gets there, you can rebook on any airline or take the $72.40 refund and keep your seat.",
    },
    { tr: ['model', 'Answer + new pills', 'grounded in: terms, offer price'] },
    { pills: ['How fast is rebooking?', 'Can I keep my original seat?', 'Compare it with canceling'] },
    { sec: 'Decision' },
    { type: yes ? "Yeah, I'll take it" : "I don't think I need that" },
    { tr: ['model', 'Intent from free text', yes ? 'accept(disruption)' : 'decline(disruption)'] },
    { pick: ['a', yes] },
    { tr: ['event', yes ? 'offer_accepted' : 'offer_declined', '{"offer":"disruption","turns":2}'] },
    { sec: 'Second offer' },
    {
      tr: [
        'model',
        'Framing for the second offer',
        yes ? 'separate product: plans changing before the trip' : 'after a decline: peace of mind before the trip',
      ],
    },
    { dots: true },
    {
      ai: yes
        ? "You're set if the trip goes sideways on the day. One more option, separate from that: if your plans change before you fly, you can cancel for any reason and get most of your money back."
        : "No problem. If what you'd really like is peace of mind before the trip, you can cancel for any reason up to a day before and get most of your money back.",
    },
    { tr: ['model', 'Widget call', 'show_offer({"type":"cancel_any_reason","price":38,"refund_pct":80})'] },
    { offer: 'b' },
    { pills: ['What can I cancel for?', 'When do I get my refund?', 'Compare the two options'] },
    { tr: ['guard', 'Output checks', 'banned words ✓  terms match ✓'] },
    { type: second ? 'Yeah, add that' : 'No thanks' },
    { tr: ['model', 'Intent from free text', second ? 'accept(cancel_any_reason)' : 'decline(cancel_any_reason)'] },
    { pick: ['b', second] },
    { sec: 'Summary' },
    {
      tr: [
        'model',
        'Always ends on the summary widget',
        `show_summary({"disruption":"${state(yes)}","cancel_any_reason":"${state(second)}"})`,
      ],
    },
    { summary: [yes, second] },
    { tr: ['event', 'flow_completed', `{"disruption":"${state(yes)}","cancel_any_reason":"${state(second)}","turns":4}`] },
    { tr: ['ops', 'LLM observability trace', 'OpenTelemetry spans: prefetch, retrieval, tool, model\nalert if a widget fails to render → kill switch'] },
    { tr: ['ops', 'Release gate', 'LLM-as-judge eval cases · a set share must pass to ship'] },
  ]
}

/** Every word the replay can show, on either path: what the tests read for the rules. */
export function wordsOf(): string[] {
  const words: string[] = [TITLE, LABEL, READ, ...Object.values(CONTROLS), ...Object.values(PATH_HEADINGS)]
  words.push(...Object.values(PHONE), ...Object.values(TRACE), ...Object.values(SUMMARY))
  for (const kind of Object.values(KINDS)) words.push(kind.badge, kind.legend)
  for (const offer of Object.values(OFFERS))
    words.push(offer.title, offer.lead, ...offer.bullets.map((bullet) => bullet.text), ...offer.links, offer.yes, offer.no, offer.price)
  for (const path of PATHS)
    for (const step of stepsOf(path)) {
      if ('sec' in step) words.push(step.sec)
      else if ('tr' in step) words.push(...step.tr.slice(1).filter((text): text is string => text !== undefined))
      else if ('ai' in step) words.push(step.ai)
      else if ('pills' in step) words.push(...step.pills)
      else if ('type' in step) words.push(step.type)
    }
  return [...new Set(words)]
}
