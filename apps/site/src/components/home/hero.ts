// The hero's words and facts (spec 010). The words are Brad's choice (D124).
// Every tile, detail line and row of the "End to end" card names the public
// claims it rests on, and the words in it that each claim must hold, so a fact
// can't reach the hero without a claim in content/claims.yaml behind it. The
// page fails to build when a claim is missing, and tests/010 and tests/036
// check the words.

/** The roles the eyebrow can name. Slice 3.6's role pages pass theirs. */
export type Role = 'all' | 'mobile' | 'fullstack' | 'ai'

/** A role with a page of its own. */
type RolePage = Exclude<Role, 'all'>

export const EYEBROW: Record<Role, string> = {
  all: 'Senior mobile & full-stack engineer',
  mobile: 'Senior mobile engineer',
  fullstack: 'Senior full-stack engineer',
  ai: 'Senior engineer · Applied AI',
}

export const PLACE = 'Dallas–Fort Worth'

/** The three words, in career order, each with the role it stands for. */
export const WORDS: readonly { text: string; role: RolePage }[] = [
  { text: 'Mobile', role: 'mobile' },
  { text: 'Full-stack', role: 'fullstack' },
  { text: 'Applied AI', role: 'ai' },
]

export const LINES = ['I build Android, iOS and web products end to end.', 'Fast with AI agents, careful with production.'] as const

/** A fact on the hero: what it says, the claims behind it, and the words those claims must hold. */
export interface Fact {
  label: string
  claims: readonly string[]
  terms: readonly string[]
}

/**
 * The tiles are the role switch (spec 036, amending D206 and replacing D205's
 * proof tiles): the question over them, the hint the home shows, the link a
 * role page shows back to the home, and what a tile says it does.
 */
export const PICK = {
  ask: 'What are you hiring for?',
  hint: 'Pick one to tailor the page',
  all: 'Show all roles',
  go: 'Tailor the page',
} as const

/**
 * A role's tile: its name, and either its live years, counted from the month
 * in `since`, or a word for a role with no start month in the record. Its
 * line, and the month its years count from, are words its claims hold; the
 * first claim is the one that carries the start month.
 */
export interface Tile extends Fact {
  role: RolePage
  name: string
  icon: 'phone' | 'stack' | 'sparkle'
  since?: string
  figure?: string
}

export const TILES: readonly Tile[] = [
  {
    role: 'mobile',
    name: 'Mobile',
    icon: 'phone',
    since: '2015-05',
    label: 'Android and iOS apps, since May 2015',
    claims: ['years-of-experience-1', 'hopper-mobile-remoteui-and-webviews-3'],
    terms: ['May 2015', 'Android', 'iOS'],
  },
  {
    role: 'fullstack',
    name: 'Full-stack',
    icon: 'stack',
    since: '2016-09',
    label: 'web front ends and backend services, since Sep 2016',
    claims: ['years-of-experience-2', 'hopper-mobile-remoteui-and-webviews-3'],
    terms: ['Sep 2016', 'web front end', 'backend services'],
  },
  {
    role: 'ai',
    name: 'Applied AI',
    icon: 'sparkle',
    figure: 'Founding',
    label: "engineer on Hopper's Fintech AI team",
    claims: ['hopper-role-and-dates-2'],
    terms: ['Founding engineer', 'Fintech AI team', 'hopper'],
  },
]

/** The picked tile's detail (spec 036): what it means for a team, where its years come from, its receipts and its question. */
export interface Detail {
  /** "For your team": what the role's years mean for the next employer. */
  team: Fact
  /** "Where the years come from": the jobs on the timeline, oldest first, by their files' names. */
  jobs: readonly string[]
  /** The side project on its own dashed line, from the month its role began there. */
  side?: { id: string; since: string; label: string }
  /** A role with no start month has no timeline: where its work comes from, in words. */
  where?: Fact
  /** Three receipts from the role's public claims, by ID, shown in their own words. */
  receipts: readonly string[]
  /** What "Ask about this" puts in the chat's box, as an "Ask me" receipt does (D213). */
  ask: string
}

export const DETAILS: Readonly<Record<RolePage, Detail>> = {
  mobile: {
    team: {
      label: 'Native Android in Kotlin and Jetpack Compose, and iOS in Swift and SwiftUI, from the architecture to the release.',
      claims: ['hopper-mobile-remoteui-and-webviews-1', 'hopper-mobile-remoteui-and-webviews-3', 'bleacher-report-2'],
      terms: ['Kotlin', 'Jetpack Compose', 'Swift', 'SwiftUI', 'architecture', 'release'],
    },
    jobs: ['bottle-rocket', 'bookshout', 'realpage', 'bleacher-report', 'hopper'],
    side: { id: 'vindecoded', since: '2015-05', label: 'VINDecoded, on the side' },
    receipts: ['hopper-mobile-remoteui-and-webviews-1', 'hopper-mobile-remoteui-and-webviews-4', 'bottle-rocket-2'],
    ask: 'What has Brad built on mobile?',
  },
  fullstack: {
    team: {
      label: 'React and TypeScript up front, Scala and Node services on GCP behind them, from the RFC to the rollout.',
      claims: ['hopper-disruption-assistance-2', 'hopper-partner-platform-2', 'vindecoded-4'],
      terms: ['React', 'TypeScript', 'Scala', 'Node', 'GCP', 'RFC', 'rollout'],
    },
    jobs: ['hopper'],
    side: { id: 'vindecoded', since: '2016-09', label: 'VINDecoded, on the side' },
    receipts: ['hopper-disruption-assistance-2', 'hopper-partner-platform-1', 'hopper-partner-platform-2'],
    ask: 'What has Brad built across the stack?',
  },
  ai: {
    team: {
      label: 'A flight-shopping assistant and generative offers that matched or exceeded static-offer attach rates.',
      claims: ['hopper-fintech-ai-1'],
      terms: ['flight-shopping assistant', 'generative offers', 'matched or exceeded static-offer attach rates'],
    },
    jobs: [],
    where: {
      label: "A founding engineer on Hopper's Fintech AI team, and on the side, VINDecoded's production AI features.",
      claims: ['hopper-role-and-dates-2', 'vindecoded-5'],
      terms: ['Founding engineer', 'Fintech AI team', 'production AI features'],
    },
    receipts: ['hopper-fintech-ai-1', 'hopper-agent-and-experimentation-workflow-1', 'vindecoded-6'],
    ask: 'What AI work has Brad shipped?',
  },
}

/** The detail's labels. */
export const DETAIL = {
  team: 'For your team',
  years: 'Where the years come from',
  where: 'Where it comes from',
  receipts: 'Proof',
  ask: 'Ask about this',
  now: 'now',
} as const

/** What the "See the work" buttons call each role's work. */
const WORK_NOUN: Readonly<Record<RolePage, string>> = { mobile: 'mobile', fullstack: 'full-stack', ai: 'AI' }

/**
 * The buttons (spec 036): the Hopper story, with a down arrow; the page's
 * résumé PDF (spec 015, D141), which names the role on a role page; and
 * Brad's address, the contact component's split look, with a copy button.
 */
export const ACTIONS = {
  work: { href: '#hopper' },
  resume: { label: 'Résumé', tag: 'PDF' },
} as const

/** "See the work at Hopper", or on a role page, "See the mobile work at Hopper". */
export const workLabelOf = (role: Role): string => (role === 'all' ? 'See the work at Hopper' : `See the ${WORK_NOUN[role]} work at Hopper`)

/** "Résumé", or on a role page, "Mobile résumé". */
export const resumeLabelOf = (role: Role): string =>
  role === 'all' ? ACTIONS.resume.label : `${TILES.find((tile) => tile.role === role)?.name ?? ''} résumé`

/** A row of the "End to end" card: a layer of the stack, what Brad built there, and where. */
export interface Layer extends Fact {
  name: string
  where: string
  /** The word that lights the row as it lands. */
  role: RolePage
}

export const LAYERS: readonly Layer[] = [
  {
    name: 'Android',
    label: 'Kotlin, Java, server-driven UI',
    where: 'Hopper, Bleacher Report, Bottle Rocket',
    role: 'mobile',
    claims: ['bottle-rocket-2', 'hopper-mobile-remoteui-and-webviews-1', 'bleacher-report-1'],
    terms: ['Kotlin', 'Java', 'server-driven UI', 'Android'],
  },
  {
    name: 'iOS',
    label: 'Native apps, server-driven UI',
    where: 'Hopper, VINDecoded',
    role: 'mobile',
    claims: ['hopper-mobile-remoteui-and-webviews-1', 'vindecoded-4'],
    terms: ['iOS', 'server-driven UI', 'native'],
  },
  {
    name: 'Web',
    label: 'React, TypeScript, partner portals and SDKs',
    where: 'Hopper, VINDecoded',
    role: 'fullstack',
    claims: ['vindecoded-4', 'hopper-partner-platform-1', 'hopper-partner-platform-3'],
    terms: ['React', 'TypeScript', 'partner portals', 'SDKs'],
  },
  {
    name: 'Services',
    label: 'Scala, Node, GCP, Terraform, Redis',
    where: 'Hopper, VINDecoded',
    role: 'fullstack',
    claims: ['hopper-partner-platform-2', 'vindecoded-4', 'hopper-disruption-assistance-2'],
    terms: ['Scala', 'Node', 'GCP', 'Terraform', 'Redis'],
  },
  {
    name: 'AI',
    label: 'Assistants, generative offers, agent workflows',
    where: 'Hopper Fintech AI, VINDecoded',
    role: 'ai',
    claims: ['hopper-role-and-dates-2', 'hopper-fintech-ai-1', 'vindecoded-6'],
    terms: ['Fintech AI', 'assistant', 'generative offers', 'agent workflows'],
  },
]
