// The role pages (spec 014): /mobile, /fullstack and /ai are the new home
// page reordered for one kind of role (D6). Each shows the same words and
// facts as the home. What changes is Brad's choice (D134): the hero's eyebrow, the
// hero's highlight on the role's word and its "End to end" rows, and the
// order of the Hopper story's topics. Only the home page is indexable; each
// role page carries noindex and a canonical link to itself (D135).

import type { Role } from './hero.ts'

/** A role with a page of its own. */
export type RolePage = Exclude<Role, 'all'>

/** The roles, in the switch's order and the hero's career order. */
export const ROLES: readonly RolePage[] = ['mobile', 'fullstack', 'ai']

/** Where the new home lives: "/" from v2.0, after growing at /v2 (D127, D162). */
export const HOME_HREF = '/'

/** The address the site's pages are canonical at. */
export const ORIGIN = 'https://bradthome.com'

/** Each role page: its address, its name in the switch, its title and the word the hero's note uses. */
export const PAGES: Readonly<Record<RolePage, { href: string; label: string; title: string; noun: string }>> = {
  mobile: { href: '/mobile', label: 'Mobile', title: 'Brad Thome · Mobile engineer', noun: 'mobile' },
  fullstack: { href: '/fullstack', label: 'Full-stack', title: 'Brad Thome · Full-stack engineer', noun: 'full-stack' },
  ai: { href: '/ai', label: 'Applied AI', title: 'Brad Thome · Applied AI', noun: 'applied AI' },
}

/**
 * The switch's label. Since spec 025 it sits under the hero's buttons and
 * lists the three roles only; the header's name goes home (D206).
 */
export const SWITCH = { label: 'Tailor this page' } as const

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

/** The switch's links, with the role page you're on marked current; the home marks none. */
export function switchOf(current: Role): { label: string; href: string; current: boolean }[] {
  return ROLES.map((role) => ({ label: PAGES[role].label, href: hrefOf(role), current: role === current }))
}

/** A page's canonical URL: the home's is "/", where it lives from v2.0. */
export const canonicalOf = (role: Role): string => (role === 'all' ? `${ORIGIN}/` : `${ORIGIN}${PAGES[role].href}`)
