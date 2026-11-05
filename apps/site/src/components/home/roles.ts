// The role pages (spec 014): /mobile, /fullstack and /ai are the new home
// page reordered for one kind of role (D6). Each shows the same words and
// facts as /v2. What changes is Brad's choice (D134): the hero's eyebrow, the
// hero's highlight on the role's word and its "End to end" rows, and the
// order of the Hopper story's topics. Only the home page is indexable; each
// role page carries noindex and a canonical link to itself (D135).

import type { Role } from './hero.ts'

/** A role with a page of its own. */
export type RolePage = Exclude<Role, 'all'>

/** The roles, in the switch's order and the hero's career order. */
export const ROLES: readonly RolePage[] = ['mobile', 'fullstack', 'ai']

/** Where the new home lives until v2.0 moves it to "/" (D127). */
export const HOME_HREF = '/v2'

/** The address the site's pages are canonical at. */
export const ORIGIN = 'https://bradthome.com'

/** Each role page: its address, its name in the switch, its title and the word the hero's note uses. */
export const PAGES: Readonly<Record<RolePage, { href: string; label: string; title: string; noun: string }>> = {
  mobile: { href: '/mobile', label: 'Mobile', title: 'Brad Thome · Mobile engineer', noun: 'mobile' },
  fullstack: { href: '/fullstack', label: 'Full-stack', title: 'Brad Thome · Full-stack engineer', noun: 'full-stack' },
  ai: { href: '/ai', label: 'Applied AI', title: 'Brad Thome · Applied AI', noun: 'applied AI' },
}

/** The switch's label and its choice for every role. */
export const SWITCH = { label: 'Hiring for', all: 'Any role' } as const

/** The "End to end" card's note on a role page; the home's stays "Where I work" (spec 010). */
export const noteOf = (role: RolePage): string => `Lit for ${PAGES[role].noun}`

/**
 * The Hopper story's topics on each role page, by the topic names in
 * content/claims.yaml (D134). The home keeps the claims' own order. A topic
 * not named here shows after these, in claim order, so a new topic from a
 * later export still shows; a name here with no claims fails the build.
 */
export const TOPIC_ORDER: Readonly<Record<RolePage, readonly string[]>> = {
  mobile: [
    'Mobile: RemoteUI and WebViews',
    'Disruption Assistance',
    'Partner platform',
    'Fintech AI',
    'Agent and experimentation workflow',
  ],
  fullstack: [
    'Disruption Assistance',
    'Partner platform',
    'Mobile: RemoteUI and WebViews',
    'Agent and experimentation workflow',
    'Fintech AI',
  ],
  ai: ['Fintech AI', 'Agent and experimentation workflow', 'Partner platform', 'Disruption Assistance', 'Mobile: RemoteUI and WebViews'],
}

/** The topic order a page uses: none on the home, so the claims' order stands. */
export const topicOrderOf = (role: Role): readonly string[] | undefined => (role === 'all' ? undefined : TOPIC_ORDER[role])

/** The href of a role's page, or the home's. */
export const hrefOf = (role: Role): string => (role === 'all' ? HOME_HREF : PAGES[role].href)

/** The switch's links, with the page you're on marked current. */
export function switchOf(current: Role): { label: string; href: string; current: boolean }[] {
  return (['all', ...ROLES] as const).map((role) => ({
    label: role === 'all' ? SWITCH.all : PAGES[role].label,
    href: hrefOf(role),
    current: role === current,
  }))
}

/** The address the switch shows beside it: where the home will live, or the role's page there. */
export const addressOf = (role: Role): string => (role === 'all' ? 'bradthome.com' : `bradthome.com${PAGES[role].href}`)

/** A page's canonical URL: the home's is "/", where it lives from v2.0. */
export const canonicalOf = (role: Role): string => (role === 'all' ? `${ORIGIN}/` : `${ORIGIN}${PAGES[role].href}`)
