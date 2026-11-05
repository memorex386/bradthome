// The Hopper story's words and structure (spec 011). Every sentence in the
// section is a public claim's text, shown as written; this file adds only
// headings and labels. The claims come from content/claims.yaml, grouped by
// their topic in claim order, so a new claim or topic in a later export shows
// with no layout work (D129). A claim with the topic "Quote" shows as a pull
// quote at the end.

/** A claim, as the section reads it from the content model. */
export interface StoryClaim {
  id: string
  topic?: string
  order: number
  text: string
  evidence: readonly string[]
}

/** The section's heading. Its eyebrow comes from the Hopper job's dates. */
export const HEADING = 'Fintech products for Hopper and its partners'

/** The topic whose claims sit under the heading: the role, and the team. */
export const ROLE_TOPIC = 'Role and dates'

/** The topic whose claims show as pull quotes. None is public yet. */
export const QUOTE_TOPIC = 'Quote'

/** A topic whose claim reads as a note on the other claims, so it shows only as their tags. */
export const NOTE_TOPICS: readonly string[] = ['Stack']

/** How a known topic shows. Each tag must appear in one of its topic's claims. */
export interface TopicLook {
  kicker: string
  title: string
  tags: readonly string[]
}

export const TOPICS: Readonly<Record<string, TopicLook>> = {
  'Disruption Assistance': {
    kicker: 'Payments · Partners',
    title: 'Capital One Travel: Disruption Assistance',
    tags: ['Purchase UI', 'Payment integration', 'Terraform', 'GCP', 'Redis'],
  },
  'Partner platform': {
    kicker: 'Partners',
    title: 'The partner platform',
    tags: ['Scala', 'API contracts', 'Partner portals', 'UI SDKs'],
  },
  'Fintech AI': {
    kicker: 'AI',
    title: 'Fintech AI',
    tags: ['Flight-shopping assistant', 'Generative offers'],
  },
  'Agent and experimentation workflow': {
    kicker: 'AI · Delivery',
    title: 'Human-approved agent workflow',
    tags: ['LaunchDarkly', 'Amplitude', 'BigQuery'],
  },
  'Mobile: RemoteUI and WebViews': {
    kicker: 'Mobile',
    title: 'RemoteUI and WebViews',
    tags: ['Android', 'iOS', 'Server-driven UI', 'WebViews'],
  },
}

/**
 * Each receipt's short title, made of words its claim holds. A claim with no
 * title here takes its topic's title, or "Hopper".
 */
export const RECEIPT_TITLES: Readonly<Record<string, string>> = {
  'hopper-role-and-dates-1': 'Senior Software Engineer',
  'hopper-role-and-dates-2': 'Founding engineer, Fintech AI',
  'hopper-disruption-assistance-1': "Capital One Travel's first purchase flow",
  'hopper-disruption-assistance-2': 'Delivered end to end',
  'hopper-disruption-assistance-3': '10+ partner products',
  'hopper-partner-platform-1': 'Partner portals',
  'hopper-partner-platform-2': 'Scala services and API contracts',
  'hopper-partner-platform-3': 'URL-loaded UI SDKs',
  'hopper-fintech-ai-1': 'Flight-shopping assistant and generative offers',
  'hopper-agent-and-experimentation-workflow-1': 'Human-approved experimentation loop',
  'hopper-mobile-remoteui-and-webviews-1': 'RemoteUI',
  'hopper-mobile-remoteui-and-webviews-2': 'WebViews with JavaScript bridges',
}

/** A receipt's fixed words: a label for proof links, and the ask-me note. */
export const RECEIPT = {
  proofLink: 'See the source',
  ask: 'No public link yet.',
  askLink: 'Ask Brad about it',
  askHref: 'mailto:brad@bradthome.com',
} as const

/** A claim as the section shows it: its number in reading order and its receipt. */
export interface Item {
  id: string
  n: number
  text: string
  kind: 'proof' | 'ask'
  evidence: readonly string[]
  title: string
}

export interface Topic {
  name: string
  slug: string
  kicker?: string
  title: string
  tags: readonly string[]
  items: Item[]
}

export interface Story {
  role: Item[]
  topics: Topic[]
  quotes: Item[]
}

export function slugOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Lays the claims out as the section reads: the role first, then each topic
 * in the order of its first claim, then the quotes. Receipts are numbered in
 * that order, from 1. A claim with a link is proof; one without asks.
 */
export function storyOf(claims: readonly StoryClaim[]): Story {
  const sorted = [...claims].sort((a, b) => a.order - b.order)
  const role: StoryClaim[] = []
  const quotes: StoryClaim[] = []
  const grouped = new Map<string, StoryClaim[]>()
  for (const claim of sorted) {
    const topic = claim.topic ?? 'Hopper'
    if (topic === ROLE_TOPIC) role.push(claim)
    else if (topic === QUOTE_TOPIC) quotes.push(claim)
    else if (!NOTE_TOPICS.includes(topic)) grouped.set(topic, [...(grouped.get(topic) ?? []), claim])
  }

  let n = 0
  const item = (claim: StoryClaim, fallback: string): Item => ({
    id: claim.id,
    n: ++n,
    text: claim.text,
    kind: claim.evidence.length > 0 ? 'proof' : 'ask',
    evidence: claim.evidence,
    title: RECEIPT_TITLES[claim.id] ?? fallback,
  })

  return {
    role: role.map((claim) => item(claim, 'Hopper')),
    topics: [...grouped].map(([name, list]) => {
      const look = TOPICS[name]
      const title = look?.title ?? name
      return {
        name,
        slug: slugOf(name),
        kicker: look?.kicker,
        title,
        tags: look?.tags ?? [],
        items: list.map((claim) => item(claim, title)),
      }
    }),
    quotes: quotes.map((claim) => item(claim, 'A colleague')),
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2022-04" as "Apr 2022", and "present" as "Present". */
export function monthOf(value: string): string {
  if (value === 'present') return 'Present'
  const [year, month] = value.split('-')
  return `${MONTHS[Number(month) - 1]} ${year}`
}

/** The eyebrow: "Experience · Hopper · Apr 2022 – Oct 2026". */
export function eyebrowOf(job: { company: string; start: string; end: string }): string {
  return `Experience · ${job.company} · ${monthOf(job.start)} – ${monthOf(job.end)}`
}
