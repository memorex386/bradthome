import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { withoutMotionBlocks } from '../../009/helpers/ds.ts'
import { cardOf, type CardView, type PreviewData, type Subject } from '../../../apps/site/src/components/previews/cards.ts'
import { handCardsSchema, type Snapshots, snapshotsSchema } from '../../../apps/site/src/content/previews.ts'

// The cards' words and where they come from (Story 2, SC-001), which links get
// one (S1.6), the release build's drop (S3.3), and the docs (FR-013, FR-014).
// cardOf() runs on the committed data, read here without Astro.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const CONTENT = path.join(ROOT, 'apps/site/content')
const SRC = path.join(ROOT, 'apps/site/src')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')
const yamlIn = <T>(file: string): T => parse(readFileSync(file, 'utf8')) as T

interface Claim {
  text: string
  evidence: string[]
  visibility: string
}
const CLAIMS = yamlIn<Record<string, Claim>>(path.join(CONTENT, 'claims.yaml'))
const SNAPSHOTS = snapshotsSchema.parse(JSON.parse(readFileSync(path.join(CONTENT, 'previews/snapshots.json'), 'utf8')))
const HANDS = handCardsSchema.parse(yamlIn(path.join(CONTENT, 'previews/cards.yaml')))

function subjects(): Record<string, Subject> {
  const found: Record<string, Subject> = {}
  for (const folder of ['jobs', 'projects']) {
    for (const name of readdirSync(path.join(CONTENT, folder))) {
      const data = yamlIn<{ company?: string; name?: string; start?: string; end?: string }>(path.join(CONTENT, folder, name))
      found[name.replace(/\.yaml$/, '')] = { name: data.company ?? data.name ?? '', start: data.start, end: data.end }
    }
  }
  return found
}
const DATA: PreviewData = { snapshots: SNAPSHOTS, hands: HANDS, subjects: subjects() }
const must = (href: string, data = DATA): CardView => {
  const card = cardOf(href, data)
  if (card === undefined) throw new Error(`no card for ${href}`)
  return card
}

// Amended by spec 034 (D219): a third-party article a receipt links is a plain
// link with no card, since the site writes no words about another site's page.
const ARTICLES = [
  'https://yourmileagemayvary.com/2024/07/22/how-to-beat-deltas-meltdown-with-capital-ones-flight-disruption-assistance/',
  'https://hts.hopper.com/news/a-new-milestone-in-our-partnership-with-capital-one',
]

/** The site's own repo. Spec 033: links into it get no card, as the site's own pages get none. */
const OWN_REPO = 'https://github.com/memorex386/bradthome'
const ownRepo = (href: string): boolean => href === OWN_REPO || href.startsWith(`${OWN_REPO}/`)

/** The links on the home that should have a card (S1.6): the header's profiles, the receipts' evidence, the side projects' sites. */
const PREVIEWED = [
  'https://github.com/memorex386',
  'https://www.linkedin.com/in/brad-thome/',
  ...new Set(Object.values(CLAIMS).flatMap((claim) => claim.evidence)),
].filter((href) => new URL(href).hostname !== 'bradthome.com' && !ARTICLES.includes(href) && !ownRepo(href))

const LABELS = /^(GitHub|LinkedIn|Google Play|Rating|Public repositories|Snapshot from (GitHub|the App Store), \w{3} \d{1,2}, \d{4}|Written by hand, \w{3} \d{1,2}, \d{4}|No snapshot yet|Open .+)$/

describe('which links get a card', () => {
  test('S1.6 FR-001 every external profile, store and site link on the home has a card, and the site\'s own pages and email have none', () => {
    for (const href of PREVIEWED) expect(cardOf(href, DATA), href).toBeDefined()
    for (const href of ARTICLES) {
      expect(Object.values(CLAIMS).some((claim) => claim.evidence.includes(href)), href).toBe(true)
      expect(cardOf(href, DATA), href).toBeUndefined()
    }
    for (const href of ['https://bradthome.com/vindecoded-agents', 'mailto:brad@bradthome.com', '/resume/brad-thome-full-stack.pdf', '#hopper'].filter((h) => h.startsWith('http')))
      expect(cardOf(href, DATA), href).toBeUndefined()
    // Spec 033: the receipts that link the site's own repo, and its records, render as plain links.
    const repoLinks = Object.values(CLAIMS).flatMap((claim) => claim.evidence).filter(ownRepo)
    expect(repoLinks.length).toBeGreaterThan(0)
    for (const href of [OWN_REPO, ...repoLinks]) expect(cardOf(href, DATA), href).toBeUndefined()
    // Amended by spec 026 (D208): a receipt's source links render once, in the card's drawer, not in each claim.
    const linked = read('apps/site/src/components/ds/Header.astro') + read('apps/site/src/components/ds/Receipts.astro') + read('apps/site/src/components/home/HopperClaim.astro') + read('apps/site/src/components/home/SideClaim.astro') + read('apps/site/src/components/home/Side.astro')
    expect(linked.match(/<PreviewLink /g)?.length).toBe(4)
    expect(read('apps/site/src/components/home/Side.astro')).toMatch(/<a class="ds-link" href=\{CASE_STUDY\.href\}>/)
  })

  test('FR-001 PreviewLink renders a plain link, and its card as a hidden popover right after it, only when a card exists', () => {
    const link = read('apps/site/src/components/previews/PreviewLink.astro')
    expect(link).toMatch(/card === undefined \?/)
    expect(link).toMatch(/data-preview=\{id\}/)
    const card = read('apps/site/src/components/previews/PreviewCard.astro')
    expect(card).toMatch(/popover=\{still \? undefined : 'auto'\}/)
    expect(card).not.toMatch(/<(?:div|p|ul|li|h\d|section)\b/)
  })
})

describe('every word has a source', () => {
  test('S2.1 SC-001 FR-004 the GitHub card shows only the snapshot and its labels', () => {
    const github = SNAPSHOTS.github
    if (github?.source !== 'github') throw new Error('no GitHub snapshot')
    const card = must('https://github.com/memorex386')
    expect(card).toMatchObject({ kind: 'snapshot', title: github.name, subtitle: github.login, line: github.bio, host: 'github.com', image: `/previews/${github.image}` })
    expect('repos' in card).toBe(false)
    expect(card.rows).toEqual([{ name: 'Public repositories', detail: String(github.publicRepos) }])
    expect(card.provenance).toBe(`Snapshot from GitHub, ${new Date(`${github.fetched}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`)
  })

  test('S2.2 S2.3 SC-001 FR-006 an App Store card shows its snapshot, with a rating only from 100 ratings', () => {
    const vin = must(SNAPSHOTS['appstore-1191483515']?.href ?? '')
    const app = SNAPSHOTS['appstore-1191483515']
    if (app?.source !== 'appstore') throw new Error('no App Store snapshot')
    expect(vin).toMatchObject({ title: app.name, subtitle: `${app.seller} · ${app.genre}`, line: app.summary, host: 'apps.apple.com' })
    expect(vin.rows).toEqual([{ name: 'Rating', detail: `${app.rating?.toFixed(1)} stars · ${app.ratings?.toLocaleString('en-US')}+ ratings` }])
    expect(must(SNAPSHOTS['appstore-1544613828']?.href ?? '').rows).toEqual([])
    const planted: Snapshots = { 'appstore-1': { source: 'appstore', id: '1', href: 'https://apps.apple.com/us/app/x/id1', fetched: '2026-11-05', name: 'X', seller: 'S', genre: 'G', rating: 4.24, ratings: 100 } }
    expect(must('https://apps.apple.com/us/app/x/id1', { ...DATA, snapshots: planted }).rows[0]?.detail).toBe('4.2 stars · 100+ ratings')
    expect(must('https://apps.apple.com/us/app/x/id1', { ...DATA, snapshots: { 'appstore-1': { ...planted['appstore-1'], ratings: 99 } as Snapshots[string] } }).rows).toEqual([])
  })

  test('S2.4 SC-001 FR-005 each hand-written card takes its title from its file, its line from a public claim, and its rows from job and project files', () => {
    for (const [key, hand] of Object.entries(HANDS)) {
      const card = must(hand.href)
      expect(card.kind, key).toBe('hand')
      expect(card.title, key).toBe(hand.about === undefined ? 'Brad Thome' : DATA.subjects[hand.about]?.name)
      if (hand.line) {
        const claim = CLAIMS[hand.line.claim]
        expect(claim?.visibility, key).toBe('public')
        expect(claim?.text, key).toContain(hand.line.text)
        expect(card.line, key).toBe(hand.line.text)
      }
      for (const [index, id] of (hand.rows ?? []).entries()) expect(card.rows[index]?.name, key).toBe(DATA.subjects[id]?.name)
      expect(card.provenance, key).toMatch(/^Written by hand, \w{3} \d{1,2}, \d{4}$/)
    }
    expect(must('https://www.linkedin.com/in/brad-thome/').rows).toEqual([
      { name: 'Hopper', detail: '2022–2026' },
      { name: 'VINDecoded', detail: '2015–present' },
    ])
    expect(() => cardOf('https://www.linkedin.com/in/brad-thome/', { ...DATA, subjects: {} })).toThrow(/no job or project file/)
  })

  test('S2.5 FR-007 a link whose snapshot is missing shows the missing state, never an empty card', () => {
    const card = must('https://github.com/memorex386', { ...DATA, snapshots: {} })
    expect(card).toMatchObject({ kind: 'missing', title: 'github.com', host: 'github.com', provenance: 'No snapshot yet' })
    expect(card.line).toMatch(/no snapshot from GitHub yet\. The link opens the page itself\./)
  })

  test('SC-001 every word on every previewed card is a snapshot field, a hand-written card\'s sourced words, a file, or a label', () => {
    const sources = new Set<string>()
    for (const snapshot of Object.values(SNAPSHOTS)) {
      for (const value of Object.values(snapshot)) if (typeof value === 'string') sources.add(value)
      if (snapshot.source === 'appstore') sources.add(`${snapshot.seller} · ${snapshot.genre}`)
    }
    for (const hand of Object.values(HANDS)) [hand.title, hand.line?.text ?? ''].forEach((v) => sources.add(v))
    for (const subject of Object.values(DATA.subjects)) sources.add(subject.name)
    for (const href of PREVIEWED) {
      const card = must(href)
      const words = [card.title, card.subtitle, card.line, ...card.rows.map((row) => row.name), card.provenance, card.openLabel]
      for (const word of words.filter((w): w is string => w !== undefined)) {
        const host = /^(?:[\w-]+\.)+[a-z]+(?:\/[\w-]+)*$/.test(word)
        expect(sources.has(word) || LABELS.test(word) || host || word === `${card.host} preview`, `${href}: ${word}`).toBe(true)
      }
    }
  })
})

describe('no outside request, and the release build', () => {
  test('S3.2 FR-008 FR-002 images are self-hosted and hashed, the script is one file never inlined, and the CSP keeps self only', () => {
    for (const snapshot of Object.values(SNAPSHOTS)) expect(snapshot.image).toMatch(/^[a-z0-9-]+-[0-9a-f]{12}\.webp$/)
    expect(read('apps/site/astro.config.mjs')).toMatch(/assetsInlineLimit: \(file\) => \(\/previews\\\.client\|PreviewLink\\\.astro\/\.test\(file\) \? false : undefined\)/)
    const policy = (JSON.parse(read('firebase.json')) as { hosting: { headers: { headers: { key: string; value: string }[] }[] } }).hosting.headers
      .flatMap((entry) => entry.headers)
      .find((header) => header.key === 'Content-Security-Policy')?.value
    expect(policy).toMatch(/default-src 'self'/)
    expect(policy).not.toMatch(/github|apple|mzstatic|linkedin|google/)
    // The previews' script is a file from 'self', so script-src gains no hash.
    const scriptSrc = (value: string | undefined): string[] => (/script-src ([^;]*)/.exec(value ?? '')?.[1] ?? '').trim().split(' ').sort()
    expect(scriptSrc(policy)).toEqual(scriptSrc(read('specs/016-link-previews/evidence/script-src.txt')))
    const client = read('apps/site/src/components/previews/previews.client.ts')
    expect(client).not.toMatch(/fetch\(|XMLHttpRequest|import\(|new Image|setAttribute\('style'/)
  })

  test("S3.3 FR-009 since v2.0 a release build keeps the previews' images and script, like every build: nothing drops them (spec 019)", () => {
    expect(existsSync(path.join(ROOT, 'scripts', 'site', 'release-pages.ts'))).toBe(false)
    expect(read('apps/site/astro.config.mjs')).not.toMatch(/release-pages|dropPhase3/)
  })

  test('S1.5 FR-002 the script only adds to plain links: it wires nothing without popover support, and the theme stays in CSS', () => {
    const client = read('apps/site/src/components/previews/previews.client.ts')
    expect(client).toMatch(/if \(supportsPopover\)/)
    expect(client).toMatch(/event\.preventDefault\(\)/)
    expect(client).not.toMatch(/matchMedia|localStorage/)
    const css = readFileSync(path.join(SRC, 'styles/previews.css'), 'utf8')
    // Spec 027's MA-18 is the one motion, and only inside the no-preference block (D209).
    expect(withoutMotionBlocks(css).still).not.toMatch(/transition|animation|@starting-style/)
    // With no popover support a card stays hidden, and :popover-open has a rule of its own.
    expect(css).toMatch(/\.lp-card \{\n {2}display: none;/)
    expect(css).toMatch(/\n\.lp-card:popover-open \{\n {2}display: flex;\n\}/)
  })
})

describe('the docs and the amended specs', () => {
  test('FR-013 specs 002 and 003 say what changed, with D148 and D149, and specs 009–014 allow the one module', () => {
    expect(read('specs/003-skeleton-and-pipeline/spec.md')).toMatch(/\*\*FR-002\*\*[^\n]*link previews' one first-party module[^\n]*D148/)
    expect(read('specs/002-ci-and-rulesets/spec.md')).toMatch(/\*\*FR-015\*\*[^\n]*previews workflow[^\n]*D149/)
    for (const spec of ['009-design-system', '010-hero', '011-hopper', '012-experience', '013-side-projects', '014-role-links'])
      expect(read(`specs/${spec}/spec.md`), spec).toMatch(/Changed in spec 016[^\n]*D147/)
  })

  test('FR-014 the decisions, the plan and AGENTS.md record the slice', () => {
    const log = read('docs/decisions/README.md')
    for (const id of ['0143', '0144', '0145', '0146', '0147', '0148', '0149']) {
      expect(log, id).toContain(`[${id}](${id}-`)
      expect(readdirSync(path.join(ROOT, 'docs/decisions')).some((name) => name.startsWith(`${id}-`)), id).toBe(true)
    }
    expect(read('docs/plan.md')).toMatch(/\| 3\.8 Link previews \|[^\n]*spec 016/)
    const agents = read('AGENTS.md')
    // Amended by spec 037 (D228): AGENTS.md counts the evals workflow among them too.
    expect(agents).toMatch(/Eight workflows sit outside the gate/)
    expect(agents).toMatch(/\*\*previews\*\*/)
    expect(agents).toMatch(/pnpm previews:refresh/)
  })
})
