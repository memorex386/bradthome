import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { educationSchema, subjectsIn } from '../../../apps/site/src/content/schema.ts'
import { anchorOf as claimAnchorOf, askNameOf, questionOf, sourcesOf, statLinksOf } from '../../../apps/site/src/components/ds/proof.ts'
import {
  anchorOf,
  barsOf,
  byNewest,
  cardsOf,
  datesOf,
  EDUCATION_LABEL,
  EYEBROW,
  type ExperienceJob,
  HEADING,
  lineDatesOf,
  LOOKS,
  RECEIPT_TITLES,
  statsOf,
  TIMELINE_LABEL,
  yearsOf,
} from '../../../apps/site/src/components/home/experience.ts'
import type { StoryClaim } from '../../../apps/site/src/components/home/hopper.ts'
import { SOURCE_LABELS } from '../../../apps/site/src/components/home/sources.ts'

// Spec 012's static checks: the Experience section's weighting, timeline and
// claims on the real content and on planted content, its labels against the
// claims' words, education in the content model, and its files' rules
// (D130, D131). Amended by spec 038 (D229, D230): the claims are no longer
// numbered on from the Hopper story; each keeps its receipt's anchor and its
// title, which names its sparkle, and the 10M+ stat links its claim's source.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')

const FILES = {
  section: site('src', 'components', 'home', 'Experience.astro'),
  data: site('src', 'components', 'home', 'experience.ts'),
  css: site('src', 'styles', 'home', 'experience.css'),
  // Spec 014: the home's page is the shared HomePage.astro.
  page: site('src', 'components', 'home', 'HomePage.astro'),
  config: site('src', 'content.config.ts'),
  claims: site('content', 'claims.yaml'),
  jobs: site('content', 'jobs'),
  education: site('content', 'education', 'education.yaml'),
  plan: path.join(ROOT, 'docs', 'plan.md'),
  log: path.join(ROOT, 'docs', 'decisions', 'README.md'),
}

/** The Bleacher Report app's Google Play listing, the 10M+ claim's one source. */
const PLAY = 'https://play.google.com/store/apps/details?id=com.bleacherreport.android.teamstream'

interface RawClaim extends Omit<StoryClaim, 'id'> {
  subject: string
  visibility: string
}

const allClaims = (): (RawClaim & { id: string })[] =>
  Object.entries(parse(read(FILES.claims)) as Record<string, RawClaim>).map(([id, claim]) => ({ id, ...claim }))
const jobs = (): ExperienceJob[] =>
  readdirSync(FILES.jobs)
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => ({ id: name.slice(0, -5), ...(parse(read(path.join(FILES.jobs, name))) as Omit<ExperienceJob, 'id'>) }))
// Amended by spec 038 (D229): the cards no longer take the first receipt's number.
const real = () => cardsOf(jobs(), allClaims())

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+/']+/)
    .map((word) => word.replace(/^'+|'+$/g, ''))
    .filter(Boolean)
const missing = (text: string, label: string): string[] => {
  const known = new Set(words(text))
  return words(label).filter((word) => !known.has(word))
}

describe('the weighting, from the job files', () => {
  test('S1.2 S1.3 SC-003 FR-002 Bleacher Report is featured, BookShout then Bottle Rocket are cards, and RealPage and enterprise IT are lines', () => {
    const all = jobs()
    const display = Object.fromEntries(all.map((job) => [job.id, job.display]))
    expect(display).toEqual({
      'bleacher-report': 'featured',
      bookshout: 'card',
      'bottle-rocket': 'card',
      'enterprise-it': 'line',
      hopper: 'story',
      realpage: 'line',
    })
    const { featured, cards } = real()
    expect(featured.map((card) => card.job.id)).toEqual(['bleacher-report'])
    expect(cards.map((card) => card.job.id)).toEqual(['bookshout', 'bottle-rocket'])
    expect(
      byNewest(all)
        .filter((job) => job.display === 'line')
        .map((job) => job.id),
    ).toEqual(['realpage', 'enterprise-it'])
  })

  test('S1.2 FR-003 the featured card: its kicker, stats and three claims in order', () => {
    const [card] = real().featured
    expect(card?.look.kicker).toBe('Sports media')
    expect(card && datesOf(card.job)).toBe('Sep 2019 – Apr 2022')
    // Amended by spec 038 (D229): the 10M+ stat names its claim and the host of the source it links, its Play listing.
    expect(card?.look.stats).toEqual([
      { value: '10M+', label: "B/R's app installs on Google Play", claim: 'bleacher-report-3', source: 'play.google.com' },
      { value: 'Promoted', label: 'Senior Android Developer, Dec 2020' },
    ])
    expect(card?.stats).toStrictEqual([
      { value: '10M+', label: "B/R's app installs on Google Play", href: PLAY },
      { value: 'Promoted', label: 'Senior Android Developer, Dec 2020' },
    ])
    expect(card?.items.map((item) => item.id)).toEqual(['bleacher-report-1', 'bleacher-report-2', 'bleacher-report-3'])
  })

  test('S1.3 FR-003 the cards: BookShout the startup bet, Bottle Rocket its range of brands', () => {
    const [bookshout, bottle] = real().cards
    expect(bookshout?.look).toMatchObject({
      kicker: 'Startup bet',
      claims: ['bookshout-2', 'bookshout-3'],
      tags: { label: 'Tags', items: ['Kotlin', 'Architecture Components', 'RxJava 2'] },
    })
    expect(bottle?.look).toMatchObject({
      kicker: 'Brands',
      claims: ['bottle-rocket-2'],
      tags: { label: 'Brands', items: ['Coca-Cola Freestyle', 'AskPETMD', 'Starwood SPG', 'Chewy'] },
    })
    // Spec 038: neither card has a stat.
    expect([bookshout?.stats, bottle?.stats]).toEqual([[], []])
  })

  test('S1.4 a line shows its dates: months for RealPage, and years for enterprise IT, whose summary gives only years', () => {
    const byId = Object.fromEntries(jobs().map((job) => [job.id, job]))
    expect(lineDatesOf(byId.realpage as ExperienceJob)).toBe('Apr 2018 – Sep 2019')
    expect(lineDatesOf(byId['enterprise-it'] as ExperienceJob)).toBe('2008 – 2015')
    expect(byId['enterprise-it']?.summary).toBe('enterprise IT, 2008–2015')
    expect(yearsOf({ start: '2020-01', end: 'present' })).toBe('2020 – Present')
  })
})

describe('the timeline', () => {
  test('S2.1 SC-002 FR-005 every job, newest first, with dates from its job file', () => {
    const rows = byNewest(jobs())
    expect(rows.map((job) => job.company)).toEqual([
      'Hopper',
      'Bleacher Report',
      'RealPage',
      'BookShout',
      'Bottle Rocket',
      'Harley-Davidson and Infosys',
    ])
    expect(rows.map(datesOf)).toEqual([
      'Apr 2022 – Oct 2026',
      'Sep 2019 – Apr 2022',
      'Apr 2018 – Sep 2019',
      'Nov 2017 – Mar 2018',
      'Oct 2015 – Nov 2017',
      'Nov 2008 – Oct 2015',
    ])
    expect(TIMELINE_LABEL).toBe('Timeline, newest first')
  })

  test("S2.2 FR-005 Hopper's row links #hopper, and every other row its job's place in the section", () => {
    expect(anchorOf('hopper')).toBe('#hopper')
    for (const job of jobs().filter((entry) => entry.id !== 'hopper')) expect(anchorOf(job.id)).toBe(`#experience-${job.id}`)
    expect(read(FILES.section)).toMatch(/id=\{`experience-\$\{job\.id\}`\}/)
  })

  test('S2.3 each bar is its months as a share of the years from the first job to the end of the last', () => {
    const bars = barsOf(jobs())
    // 2008-01 to 2027-01: 228 months.
    expect(bars.get('enterprise-it')).toEqual({ x: Math.round((10 / 228) * 10000) / 100, width: Math.round((84 / 228) * 10000) / 100 })
    expect(bars.get('hopper')).toEqual({ x: Math.round((171 / 228) * 10000) / 100, width: Math.round((55 / 228) * 10000) / 100 })
    for (const bar of bars.values()) {
      expect(bar.x).toBeGreaterThanOrEqual(0)
      expect(bar.x + bar.width).toBeLessThanOrEqual(100.01)
    }
    const present = barsOf([
      { id: 'a', company: 'A', title: 'T', start: '2020-01', end: '2021-06', display: 'card' },
      { id: 'b', company: 'B', title: 'T', start: '2027-03', end: 'present', display: 'card' },
    ])
    // 2020-01 to 2028-01: 96 months. The present job runs to the end, even when it starts after every dated end.
    expect(present.get('b')).toEqual({ x: Math.round((86 / 96) * 10000) / 100, width: Math.round((10 / 96) * 10000) / 100 })
    expect(present.get('a')?.x).toBe(0)
    expect(read(FILES.section)).toMatch(/<svg class="experience__bar"[^>]*aria-hidden="true"/)
    for (const kind of ['story', 'featured', 'card'])
      expect(read(FILES.css)).toMatch(new RegExp(`\\.experience__row--${kind} \\.experience__span`))
  })
})

describe('the words', () => {
  test('S3.2 FR-004 no note to the site, and no claim the weighting leaves off, is shown', () => {
    const shown = Object.values(LOOKS).flatMap((look) => look.claims)
    for (const id of ['bookshout-1', 'realpage-1', 'realpage-2', 'bottle-rocket-1', 'bottle-rocket-3', 'bottle-rocket-4'])
      expect(shown).not.toContain(id)
    for (const id of shown) expect(id).toMatch(/^(bleacher-report|bookshout|bottle-rocket)-\d+$/)
    const claims = allClaims()
    for (const claim of claims) expect(claim.visibility, claim.id).toBe('public')
  })

  // Amended by spec 038 (D230): the receipt titles name the claims' sparkles now, and every claim shown has its own.
  test("S3.3 FR-003 every kicker, stat, tag, tag list and receipt title uses only its claims' words, but D130's 'bet'", () => {
    const claims = new Map(allClaims().map((claim) => [claim.id, claim.text]))
    for (const [id, look] of Object.entries(LOOKS)) {
      // A label may use any public claim of its job, shown or not, such as BookShout's "startup".
      const text = allClaims()
        .filter((claim) => claim.subject === id)
        .map((claim) => claim.text)
        .join(' ')
      const kicker = missing(text, look.kicker)
      expect(kicker, id).toEqual(id === 'bookshout' ? ['bet'] : [])
      for (const stat of look.stats ?? []) expect(missing(text, `${stat.value} ${stat.label}`), `${id}: ${stat.label}`).toEqual([])
      for (const tag of look.tags?.items ?? []) expect(missing(text, tag), `${id}: ${tag}`).toEqual([])
      if (look.tags && look.tags.label !== 'Tags') expect(missing(text, look.tags.label), `${id}: ${look.tags.label}`).toEqual([])
    }
    for (const [id, title] of Object.entries(RECEIPT_TITLES)) expect(missing(claims.get(id) ?? '', title), `${id}: ${title}`).toEqual([])
    for (const id of Object.values(LOOKS).flatMap((look) => look.claims)) expect(RECEIPT_TITLES[id], id).toBeDefined()
    // The heading's own words come from the cards' claims: brands, startup, sports media platform.
    const cards = [...claims.entries()].filter(([id]) => /^(bleacher-report|bookshout|bottle-rocket)-/.test(id)).map(([, text]) => text)
    expect(missing(cards.join(' '), 'brands startup sports media platform android')).toEqual([])
    expect(HEADING).toBe('Android for brands, a startup and a sports media platform')
    expect(EYEBROW).toBe('Experience · Before Hopper')
    expect(EDUCATION_LABEL).toBe('Education')
  })

  // Amended by spec 038 (D229): a stat links only its own claim's source, so a stat whose claim isn't on its card, or
  // whose host its claim's evidence doesn't hold once, stops the build too.
  test('S3.4 the build fails on a job with no look, a missing claim, no education, or a stat that links what its claim doesn’t hold', () => {
    const claims = allClaims()
    const extra: ExperienceJob = { id: 'new-job', company: 'New', title: 'T', start: '2026-01', end: 'present', display: 'card' }
    expect(() => cardsOf([...jobs(), extra], claims)).toThrow('no look for new-job')
    expect(() =>
      cardsOf(
        jobs(),
        claims.filter((claim) => claim.id !== 'bookshout-3'),
      ),
    ).toThrow('needs the public claim bookshout-3')
    const items = real().featured[0]?.items ?? []
    expect(() => statsOf('bleacher-report', [{ value: '10M+', label: 'Installs', claim: 'bookshout-2' }], items)).toThrow(
      'names bookshout-2, which its card doesn',
    )
    expect(() =>
      statsOf('bleacher-report', [{ value: '10M+', label: 'Installs', claim: 'bleacher-report-3', source: 'apps.apple.com' }], items),
    ).toThrow('holds 0 times, not once')
    expect(() => statsOf('bleacher-report', [{ value: '10M+', label: 'Installs', source: 'play.google.com' }], items)).toThrow(
      'without naming its claim',
    )
    const section = read(FILES.section)
    expect(section).toMatch(/if \(jobs\.length === 0\) throw new Error/)
    expect(section).toMatch(/if \(!education \|\| !degree\) throw new Error/)
  })
})

// Amended by spec 038 (D229, D230): the claims aren't numbered on from the Hopper story, and no card has a drawer.
// Each claim keeps its receipt's anchor and ends with a sparkle named by its title; the one with a public link, the
// 10M+ claim, shows it on its stat, so no Experience card lists sources.
describe('the claims and their proof', () => {
  test('S4.1 SC-004 FR-006 six claims, in order, each with its anchor and its own sparkle, and one with a link, which its stat shows', () => {
    const { featured, cards } = real()
    const items = [...featured, ...cards].flatMap((card) => card.items)
    expect(items.map((item) => item.id)).toEqual([
      'bleacher-report-1',
      'bleacher-report-2',
      'bleacher-report-3',
      'bookshout-2',
      'bookshout-3',
      'bottle-rocket-2',
    ])
    const byId = new Map(allClaims().map((claim) => [claim.id, claim]))
    for (const item of items) {
      const claim = byId.get(item.id)
      expect(item, item.id).toStrictEqual({ id: item.id, text: claim?.text, evidence: claim?.evidence, title: RECEIPT_TITLES[item.id] })
      expect(claimAnchorOf(item.id)).toBe(`receipt-${item.id}`)
    }
    expect(new Set(items.map((item) => askNameOf(item.title))).size).toBe(6)
    expect(new Set(items.map((item) => questionOf(item.text))).size).toBe(6)
    expect(items.filter((item) => item.evidence.length > 0).map((item) => item.id)).toEqual(['bleacher-report-3'])
    for (const card of [...featured, ...cards])
      expect(sourcesOf(card.items, statLinksOf(card.stats), SOURCE_LABELS), card.job.id).toEqual([])
  })

  // Amended by spec 038 (D229): the Play link shows at rest, on the 10M+ stat, and the card doesn't list it again. A
  // planted link on a card with no stat lists under its claims.
  test('S4.2 S4.3 the 10M+ claim keeps its caveat, and its stat links its Play listing; a planted link lists under its card’s claims', () => {
    const claim = allClaims().find((entry) => entry.id === 'bleacher-report-3')
    expect(claim?.text).toContain('a figure for the whole app')
    expect(claim?.evidence).toEqual([PLAY])
    const [card] = real().featured
    expect(card && statLinksOf(card.stats)).toEqual([PLAY])
    const planted = allClaims().map((entry) => (entry.id === 'bookshout-2' ? { ...entry, evidence: ['https://example.com/a'] } : entry))
    const bookshout = cardsOf(jobs(), planted).cards[0]
    expect(bookshout?.items[0]).toMatchObject({ id: 'bookshout-2', evidence: ['https://example.com/a'] })
    expect(sourcesOf(bookshout?.items ?? [], statLinksOf(bookshout?.stats ?? []), { 'bookshout-2': { 'example.com': 'A planted source' } })).toEqual(
      [{ href: 'https://example.com/a', label: 'A planted source', host: 'example.com', outside: true, claim: 'bookshout-2' }],
    )
    const section = read(FILES.section)
    expect(section.match(/<HopperClaim item=\{item\} \/>/g)).toHaveLength(2)
    expect(
      section.match(
        /<Sources sources=\{sourcesOf\(items, statLinksOf\(stats\), SOURCE_LABELS\)\} id=\{`sources-experience-\$\{job\.id\}`\} \/>/g,
      ),
    ).toHaveLength(2)
  })
})

describe('education in the content model', () => {
  test('S3.5 FR-007 the file holds the school, degree and year, refuses an unknown field, and a claim can name it', () => {
    const file = parse(read(FILES.education)) as unknown
    expect(educationSchema.parse(file)).toEqual({
      school: 'University of Wisconsin–Milwaukee',
      degree: 'B.B.A., Management Information Systems',
      year: 2010,
    })
    expect(educationSchema.safeParse({ ...(file as object), city: 'x' }).success).toBe(false)
    expect(subjectsIn(site('content')).has('education')).toBe(true)
    const degree = allClaims().filter((claim) => claim.subject === 'education')
    expect(degree.map((claim) => claim.id)).toEqual(['education-1'])
    for (const part of ['B.B.A., Management Information Systems', 'University of Wisconsin–Milwaukee', '2010'])
      expect(degree[0]?.text).toContain(part)
    expect(read(FILES.config)).toMatch(
      /education: defineCollection\(\{ loader: glob\(\{ pattern: '\*\.yaml', base: '\.\/content\/education' \}\), schema: educationSchema \}\)/,
    )
    expect(read(FILES.section)).toMatch(/<dd data-claim=\{degree\.id\}>\{degree\.text\}<\/dd>/)
  })
})

describe('the files', () => {
  test('S1.6 FR-008 the section adds no motion, script, inline style or other host', () => {
    for (const file of [FILES.section, FILES.data, FILES.css]) {
      const text = read(file).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
      expect(text, file).not.toMatch(/@keyframes|animation|transition/)
      expect(text, file).not.toMatch(/<script|style=|define:vars/)
      expect(text, file).not.toMatch(/https?:\/\//)
    }
  })

  test('FR-001 the home shows the section after the Hopper story, and the header links it', () => {
    const page = read(FILES.page)
    expect(page).toMatch(/import Experience from '\.\/Experience\.astro'/)
    expect(page).toMatch(/<Hopper role=\{role\} \/>\s*<Experience \/>/)
    expect(page).toMatch(/\{ label: 'Experience', href: '#experience' \}/)
    expect(read(FILES.section)).toMatch(/<section id="experience" class="experience" aria-labelledby="experience-heading">/)
  })

  test('S6.1 only the home and the role pages show the section (spec 019)', async () => {
    const pages = site('src', 'pages')
    // Spec 014: the sections sit on the shared HomePage.astro, which the home and the role pages render.
    const home = site('src', 'components', 'home')
    expect(readdirSync(home).filter((name) => read(path.join(home, name)).includes('Experience.astro'))).toEqual(['HomePage.astro'])
    expect(readdirSync(pages, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).filter((name) => read(path.join(pages, name)).includes('Experience.astro'))).toEqual([])
    expect(readdirSync(pages, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).filter((name) => read(path.join(pages, name)).includes('HomePage.astro')).sort()).toEqual(['[role].astro', 'index.astro'])
  })

  test("FR-011 the plan shows slice 3.4's state and the decision log holds D130 and D131", () => {
    expect(read(FILES.plan)).toMatch(/\| 3\.4 Experience \|[^\n]*spec 012[^\n]*D130[^\n]*D131/)
    expect(read(FILES.log)).toContain('[0130](0130-experience-weights-each-job-by-its-display.md)')
    expect(read(FILES.log)).toContain('[0131](0131-education-joins-the-content-model.md)')
  })
})
