import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { EYEBROW, LAYERS, WORDS } from '../../../apps/site/src/components/home/hero.ts'
import { type StoryClaim, storyOf } from '../../../apps/site/src/components/home/hopper.ts'
import {
  addressOf,
  canonicalOf,
  HOME_HREF,
  noteOf,
  PAGES,
  ROLES,
  SWITCH,
  switchOf,
  TOPIC_ORDER,
  topicOrderOf,
} from '../../../apps/site/src/components/home/roles.ts'

// Spec 014's role pages, read from the source: the roles' data, the Hopper
// order on the real claims and on planted ones, the page wiring, the release
// build's list, and the docs. The built pages are tests/014/e2e's.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')

const FILES = {
  roles: site('src', 'components', 'home', 'roles.ts'),
  home: site('src', 'components', 'home', 'HomePage.astro'),
  hero: site('src', 'components', 'home', 'Hero.astro'),
  heroCss: site('src', 'styles', 'home', 'hero.css'),
  hopper: site('src', 'components', 'home', 'Hopper.astro'),
  rolesCss: site('src', 'styles', 'home', 'roles.css'),
  index: site('src', 'pages', 'index.astro'),
  route: site('src', 'pages', '[role].astro'),
  layout: site('src', 'layouts', 'DesignBase.astro'),
  pages: site('src', 'pages'),
  claims: site('content', 'claims.yaml'),
  plan: path.join(ROOT, 'docs', 'plan.md'),
  log: path.join(ROOT, 'docs', 'decisions', 'README.md'),
}

interface RawClaim extends Omit<StoryClaim, 'id'> {
  subject: string
}
const hopperClaims = (): StoryClaim[] =>
  Object.entries(parse(read(FILES.claims)) as Record<string, RawClaim>)
    .filter(([, claim]) => claim.subject === 'hopper')
    .map(([id, claim]) => ({ id, ...claim }))

const ORDERS = {
  mobile: ['Mobile: RemoteUI and WebViews', 'Disruption Assistance', 'Partner platform', 'Fintech AI', 'Agent and experimentation workflow'],
  fullstack: ['Disruption Assistance', 'Partner platform', 'Mobile: RemoteUI and WebViews', 'Agent and experimentation workflow', 'Fintech AI'],
  ai: ['Fintech AI', 'Agent and experimentation workflow', 'Partner platform', 'Disruption Assistance', 'Mobile: RemoteUI and WebViews'],
} as const

describe('the roles', () => {
  test('FR-001 SC-001 three role pages, in the hero words\' order, each with its address, label and title', () => {
    expect(ROLES).toEqual(['mobile', 'fullstack', 'ai'])
    expect(WORDS.map((word) => word.role)).toEqual([...ROLES])
    expect(PAGES).toEqual({
      mobile: { href: '/mobile', label: 'Mobile', title: 'Brad Thome · Mobile engineer', noun: 'mobile' },
      fullstack: { href: '/fullstack', label: 'Full-stack', title: 'Brad Thome · Full-stack engineer', noun: 'full-stack' },
      ai: { href: '/ai', label: 'Applied AI', title: 'Brad Thome · Applied AI', noun: 'applied AI' },
    })
  })

  test('S1.2 FR-002 the eyebrow per role is spec 010\'s, and S1.4 the note names the role', () => {
    expect(EYEBROW).toEqual({
      all: 'Senior mobile & full-stack engineer',
      mobile: 'Senior mobile engineer',
      fullstack: 'Senior full-stack engineer',
      ai: 'Senior engineer · Applied AI',
    })
    expect(ROLES.map(noteOf)).toEqual(['Lit for mobile', 'Lit for full-stack', 'Lit for applied AI'])
    for (const role of ROLES) expect(LAYERS.some((layer) => layer.role === role), role).toBe(true)
  })

  test('S3.1 FR-005 the switch links all four pages and marks the current one, with its address', () => {
    expect(SWITCH).toEqual({ label: 'Hiring for', all: 'Any role' })
    expect(HOME_HREF).toBe('/')
    for (const current of ['all', ...ROLES] as const) {
      expect(switchOf(current)).toEqual([
        { label: 'Any role', href: '/', current: current === 'all' },
        { label: 'Mobile', href: '/mobile', current: current === 'mobile' },
        { label: 'Full-stack', href: '/fullstack', current: current === 'fullstack' },
        { label: 'Applied AI', href: '/ai', current: current === 'ai' },
      ])
    }
    expect(['all', ...ROLES].map((role) => addressOf(role as 'all'))).toEqual([
      'bradthome.com',
      'bradthome.com/mobile',
      'bradthome.com/fullstack',
      'bradthome.com/ai',
    ])
  })

  test('S4.1 S4.2 FR-006 each page\'s canonical URL: the home at "/", each role page at its own address', () => {
    expect(['all', ...ROLES].map((role) => canonicalOf(role as 'all'))).toEqual([
      'https://bradthome.com/',
      'https://bradthome.com/mobile',
      'https://bradthome.com/fullstack',
      'https://bradthome.com/ai',
    ])
  })
})

describe('the Hopper order', () => {
  test("S1.3 FR-003 each role's topics follow D134's order after the role lines, and the home keeps the claims' order", () => {
    expect(TOPIC_ORDER).toEqual(ORDERS)
    expect(topicOrderOf('all')).toBeUndefined()
    const home = storyOf(hopperClaims())
    expect(home.topics.map((topic) => topic.name)).toEqual([
      'Disruption Assistance',
      'Partner platform',
      'Fintech AI',
      'Agent and experimentation workflow',
      'Mobile: RemoteUI and WebViews',
    ])
    for (const role of ROLES) {
      const story = storyOf(hopperClaims(), topicOrderOf(role))
      expect(story.topics.map((topic) => topic.name), role).toEqual(ORDERS[role])
      expect(story.role.map((item) => item.id), role).toEqual(home.role.map((item) => item.id))
    }
  })

  test('S2.1 SC-002 FR-004 every order shows the same claims with the same text, numbered in reading order from 1', () => {
    const home = storyOf(hopperClaims())
    const ids = (story: ReturnType<typeof storyOf>) => [...story.role, ...story.topics.flatMap((topic) => topic.items), ...story.quotes]
    const homeItems = ids(home)
    for (const role of ROLES) {
      const items = ids(storyOf(hopperClaims(), topicOrderOf(role)))
      expect(items.map((item) => item.n), role).toEqual(homeItems.map((_, index) => index + 1))
      expect(new Map(items.map((item) => [item.id, item.text])), role).toEqual(new Map(homeItems.map((item) => [item.id, item.text])))
      expect(items.length, role).toBe(homeItems.length)
    }
  })

  test('S2.4 FR-003 an order naming a topic with no claims throws, and a topic it leaves out shows after, in claim order', () => {
    const claims: StoryClaim[] = [
      { id: 'a', topic: 'Role and dates', order: 1, text: 'Role.', evidence: [] },
      { id: 'b', topic: 'One', order: 2, text: 'One.', evidence: [] },
      { id: 'c', topic: 'Two', order: 3, text: 'Two.', evidence: [] },
      { id: 'd', topic: 'Three', order: 4, text: 'Three.', evidence: [] },
    ]
    expect(() => storyOf(claims, ['Two', 'Gone'])).toThrow(/"Gone"/)
    const story = storyOf(claims, ['Three'])
    expect(story.topics.map((topic) => topic.name)).toEqual(['Three', 'One', 'Two'])
    expect(story.topics.map((topic) => topic.items[0]?.n)).toEqual([2, 3, 4])
  })
})

describe('the files', () => {
  test('FR-001 the home and the role route render the same HomePage.astro, which passes the role to the hero and the Hopper story', () => {
    expect(read(FILES.index)).toMatch(/<HomePage role="all" \/>/)
    const route = read(FILES.route)
    expect(route).toMatch(/ROLES\.map\(\(role\) => \(\{ params: \{ role \} \}\)\)/)
    expect(route).toMatch(/<HomePage role=\{role\} \/>/)
    const home = read(FILES.home)
    expect(home).toMatch(/<Hero role=\{role\} \/>\s*<Hopper role=\{role\} \/>\s*<Experience \/>\s*<Side \/>/)
    expect(read(FILES.hopper)).toMatch(/topicOrderOf\(role\)/)
    expect(readdirSync(FILES.pages, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).filter((name) => read(path.join(FILES.pages, name)).includes('HomePage.astro')).sort()).toEqual([
      '[role].astro',
      'index.astro',
    ])
  })

  test('S3.1 FR-005 the switch sits under the header, before the main content', () => {
    const home = read(FILES.home)
    expect(home).toMatch(
      /<Header sections=\{sections\} \/>\s*<div class="ds-wrap home-roles">\s*<RoleSwitch roles=\{switchOf\(role\)\} label=\{SWITCH\.label\} address=\{addressOf\(role\)\} \/>\s*<\/div>\s*<main id="main">/,
    )
  })

  test('S4.1 S4.2 FR-006 only the home goes without noindex, and every page names its canonical URL and title', () => {
    const home = read(FILES.home)
    expect(home).toMatch(/<DesignBase title=\{title\} description=\{description\} noindex=\{role !== 'all'\} canonical=\{canonicalOf\(role\)\}>/)
    expect(home).toMatch(/const title = role === 'all' \? 'Brad Thome' : PAGES\[role\]\.title/)
    const layout = read(FILES.layout)
    expect(layout).toMatch(/\{canonical && \(/)
    expect(layout).toMatch(/<link rel="canonical" href=\{canonical\} \/>/)
  })

  test('S1.4 FR-002 the hero lights the role\'s word and rows only on a role page, from the tokens', () => {
    const hero = read(FILES.hero)
    expect(hero).toMatch(/role !== 'all' && \(word\.role === role \? 'hero__word--on' : 'hero__word--off'\)/)
    expect(hero).toMatch(/layer\.role === role && 'hero__row--lit'/)
    expect(hero).toMatch(/\{role === 'all' \? 'Where I work' : noteOf\(role\)\}/)
    const css = read(FILES.heroCss)
    expect(css).toMatch(/\.hero__word--on \{\s*color: var\(--color-accent\);\s*\}/)
    expect(css).toMatch(/\.hero__word--off,\s*\.hero__word--off \.hero__dot \{\s*color: var\(--color-dim\);\s*\}/)
    expect(css).toMatch(/\.hero__row--lit \{\s*border-color: var\(--color-accent\);\s*background-color: var\(--color-accent-soft\);\s*\}/)
  })

  test("S2.3 D141 the hero's résumé link is the page's PDF, which spec 015 sets, and the page adds no other", () => {
    expect(read(FILES.hero)).toMatch(/href=\{resumeHrefOf\(role\)\}/)
    expect(read(FILES.home)).not.toMatch(/resume/i)
  })

  test('FR-009 the change adds no script, inline style, animation or transition', () => {
    for (const file of [FILES.home, FILES.route, FILES.index, FILES.roles]) {
      expect(read(file), file).not.toMatch(/<script|style=|client:/)
    }
    expect(read(FILES.rolesCss)).not.toMatch(/animation|transition|@keyframes/)
    const css = read(FILES.heroCss)
    const highlight = css.slice(css.indexOf("/* ---- A role page's highlight"), css.indexOf('/* ---- The sequence'))
    expect(highlight).not.toMatch(/animation|transition|@keyframes/)
  })
})

describe('live from v2.0 (spec 019)', () => {
  test('S6.1 SC-001 FR-007 the role pages are built like every page, and the essay and 404 page link none of them', () => {
    for (const v1 of ['vindecoded-agents.mdx', '404.astro']) {
      const text = read(path.join(FILES.pages, v1))
      for (const role of ROLES) expect(text, `${v1} ${role}`).not.toMatch(new RegExp(`href=["']${PAGES[role].href}["']`))
      expect(text, v1).not.toMatch(/components\/home\//)
    }
  })

  test("FR-011 the plan shows slice 3.6's state and the decision log holds D134–D136", () => {
    expect(read(FILES.plan)).toMatch(/\| 3\.6 Role links \|[^\n]*spec 014[^\n]*D134[^\n]*D135[^\n]*D136/)
    const log = read(FILES.log)
    expect(log).toContain('[0134](0134-role-pages-light-the-hero-and-reorder-the-hopper-story.md)')
    expect(log).toContain('[0135](0135-only-the-home-page-is-indexable.md)')
    expect(log).toContain('[0136](0136-role-pages-keep-the-linkedin-resume-link-until-slice-3-7.md)')
  })
})
