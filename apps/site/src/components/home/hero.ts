// The hero's words and facts (spec 010). The words are Brad's choice (D124).
// Every proof tile and every row of the "End to end" card names the public claims
// it rests on, and the words in it that each claim must hold, so a fact can't
// reach the hero without a claim in content/claims.yaml behind it. The page
// fails to build when a claim is missing, and tests/010 checks the words.

/** The roles the eyebrow can name. Slice 3.6's role pages pass theirs. */
export type Role = 'all' | 'mobile' | 'fullstack' | 'ai'

export const EYEBROW: Record<Role, string> = {
  all: 'Senior mobile & full-stack engineer',
  mobile: 'Senior mobile engineer',
  fullstack: 'Senior full-stack engineer',
  ai: 'Senior engineer · Applied AI',
}

export const PLACE = 'Dallas–Fort Worth'

/** The three words, in career order, each with the role it stands for. */
export const WORDS: readonly { text: string; role: Exclude<Role, 'all'> }[] = [
  { text: 'Mobile', role: 'mobile' },
  { text: 'Full-stack', role: 'fullstack' },
  { text: 'Applied AI', role: 'ai' },
]

export const LINES = ['I build Android, iOS and web products end to end.', 'Fast with AI agents, careful with production.'] as const

/**
 * The buttons: the Hopper story (D128, spec 011), and the résumé, whose PDF
 * depends on the page, so Hero.astro takes its href from the résumé's
 * resumeHrefOf() (spec 015, D141).
 */
export const ACTIONS = {
  work: { label: 'See the work at Hopper', href: '#hopper' },
  resume: { label: 'Read the résumé' },
} as const

/** A fact on the hero: what it says, the claims behind it, and the words those claims must hold. */
export interface Fact {
  label: string
  claims: readonly string[]
  terms: readonly string[]
}

/**
 * A proof tile under the buttons (spec 025, D205): a figure and its label,
 * using only words its claims hold, and the Hopper topic it links, by its
 * name in content/claims.yaml. They replace spec 010's highlight chips.
 */
export interface Proof extends Fact {
  figure: string
  topic: string
}

export const PROOF: readonly Proof[] = [
  {
    figure: '5',
    label: "more partners adopted the reusable capability from Capital One Travel's purchase flow",
    claims: ['hopper-disruption-assistance-1'],
    terms: ['5 more partners', 'adopted', 'reusable capability', "Capital One Travel's", 'purchase flow'],
    topic: 'Disruption Assistance',
  },
  {
    figure: '10+',
    label: 'partner products, including Frontier and Spirit',
    claims: ['hopper-disruption-assistance-3'],
    terms: ['10+ partner products', 'including Frontier and Spirit'],
    topic: 'Disruption Assistance',
  },
  {
    figure: 'Founding',
    label: "engineer on Hopper's Fintech AI team",
    claims: ['hopper-role-and-dates-2'],
    terms: ['Founding engineer', 'Fintech AI team', 'hopper'],
    topic: 'Fintech AI',
  },
]

/** A row of the "End to end" card: a layer of the stack, what Brad built there, and where. */
export interface Layer extends Fact {
  name: string
  where: string
  /** The word that lights the row as it lands. */
  role: Exclude<Role, 'all'>
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
