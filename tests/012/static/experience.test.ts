import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { educationSchema, subjectsIn } from '../../../apps/site/src/content/schema.ts'
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
  TIMELINE_LABEL,
  yearsOf,
} from '../../../apps/site/src/components/home/experience.ts'
import { type StoryClaim, storyOf } from '../../../apps/site/src/components/home/hopper.ts'

// Spec 012's static checks: the Experience section's weighting, timeline and
// receipts on the real content and on planted content, its labels against the
// claims' words, education in the content model, and its files' rules
// (D130, D131).

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')

const FILES = {
  section: site('src', 'components', 'home', 'Experience.astro'),
  data: site('src', 'components', 'home', 'experience.ts'),
  css: site('src', 'styles', 'home', 'experience.css'),
  // Spec 014: /v2's page is the shared HomePage.astro.
  page: site('src', 'components', 'home', 'HomePage.astro'),
  config: site('src', 'content.config.ts'),
  claims: site('content', 'claims.yaml'),
  jobs: site('content', 'jobs'),
  education: site('content', 'education', 'education.yaml'),
  plan: path.join(ROOT, 'docs', 'plan.md'),
  log: path.join(ROOT, 'docs', 'decisions', 'README.md'),
}

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
const hopperCount = (): number => {
  const story = storyOf(allClaims().filter((claim) => claim.subject === 'hopper'))
  return story.role.length + story.topics.reduce((sum, topic) => sum + topic.items.length, 0) + story.quotes.length
}
const real = () => cardsOf(jobs(), allClaims(), hopperCount() + 1)

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
    expect(card?.look.stats).toEqual([
      { value: '10M+', label: "B/R's app installs on Google Play" },
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
    // The heading's own words come from the cards' claims: brands, startup, sports media platform.
    const cards = [...claims.entries()].filter(([id]) => /^(bleacher-report|bookshout|bottle-rocket)-/.test(id)).map(([, text]) => text)
    expect(missing(cards.join(' '), 'brands startup sports media platform android')).toEqual([])
    expect(HEADING).toBe('Android for brands, a startup and a sports media platform')
    expect(EYEBROW).toBe('Experience · Before Hopper')
    expect(EDUCATION_LABEL).toBe('Education')
  })

  test('S3.4 the build fails on a job with no look, a missing claim, or no education', () => {
    const claims = allClaims()
    const extra: ExperienceJob = { id: 'new-job', company: 'New', title: 'T', start: '2026-01', end: 'present', display: 'card' }
    expect(() => cardsOf([...jobs(), extra], claims, 13)).toThrow('no look for new-job')
    expect(() =>
      cardsOf(
        jobs(),
        claims.filter((claim) => claim.id !== 'bookshout-3'),
        13,
      ),
    ).toThrow('needs the public claim bookshout-3')
    const section = read(FILES.section)
    expect(section).toMatch(/if \(jobs\.length === 0\) throw new Error/)
    expect(section).toMatch(/if \(!education \|\| !degree\) throw new Error/)
  })
})

describe('the receipts', () => {
  test('S4.1 SC-004 FR-006 six claims, numbered 13 to 18 on from the Hopper story, one proof', () => {
    expect(hopperCount()).toBe(12)
    const { featured, cards } = real()
    const items = [...featured, ...cards].flatMap((card) => card.items)
    expect(items.map((item) => [item.id, item.n])).toEqual([
      ['bleacher-report-1', 13],
      ['bleacher-report-2', 14],
      ['bleacher-report-3', 15],
      ['bookshout-2', 16],
      ['bookshout-3', 17],
      ['bottle-rocket-2', 18],
    ])
    const byId = new Map(allClaims().map((claim) => [claim.id, claim]))
    for (const item of items) {
      expect(item.text).toBe(byId.get(item.id)?.text)
      expect(item.title).toBe(RECEIPT_TITLES[item.id])
    }
    expect(items.filter((item) => item.kind === 'proof').map((item) => item.id)).toEqual(['bleacher-report-3'])
  })

  test('S4.2 S4.3 the 10M+ claim keeps its caveat and its Play link; a planted link makes any claim proof', () => {
    const claim = allClaims().find((entry) => entry.id === 'bleacher-report-3')
    expect(claim?.text).toContain("not Brad's work alone")
    expect(claim?.evidence).toEqual(['https://play.google.com/store/apps/details?id=com.bleacherreport.android.teamstream'])
    const planted = allClaims().map((entry) => (entry.id === 'bookshout-2' ? { ...entry, evidence: ['https://example.com/a'] } : entry))
    const item = cardsOf(jobs(), planted, 13).cards[0]?.items[0]
    expect(item).toMatchObject({ id: 'bookshout-2', kind: 'proof', evidence: ['https://example.com/a'] })
    expect(read(FILES.section).match(/<HopperClaim item=\{item\} \/>/g)).toHaveLength(2)
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

  test('FR-001 /v2 shows the section after the Hopper story, and the header links it', () => {
    const page = read(FILES.page)
    expect(page).toMatch(/import Experience from '\.\/Experience\.astro'/)
    expect(page).toMatch(/<Hopper role=\{role\} \/>\s*<Experience \/>/)
    expect(page).toMatch(/\{ label: 'Experience', href: '#experience' \}/)
    expect(read(FILES.section)).toMatch(/<section id="experience" class="experience" aria-labelledby="experience-heading">/)
  })

  test('S6.1 a release build leaves out /v2, and only /v2 shows the section', async () => {
    const { PHASE_3_PAGES } = await import('../../../scripts/site/release-pages.ts')
    expect(PHASE_3_PAGES).toContain('v2.html')
    const pages = site('src', 'pages')
    // Spec 014: the sections sit on the shared HomePage.astro, which /v2 and the role pages render, all phase 3 pages.
    const home = site('src', 'components', 'home')
    expect(readdirSync(home).filter((name) => read(path.join(home, name)).includes('Experience.astro'))).toEqual(['HomePage.astro'])
    expect(readdirSync(pages).filter((name) => read(path.join(pages, name)).includes('Experience.astro'))).toEqual([])
    expect(readdirSync(pages).filter((name) => read(path.join(pages, name)).includes('HomePage.astro')).sort()).toEqual(['[role].astro', 'v2.astro'])
    expect(PHASE_3_PAGES).toEqual(expect.arrayContaining(['v2.html', 'mobile.html', 'fullstack.html', 'ai.html']))
  })

  test("FR-011 the plan shows slice 3.4's state and the decision log holds D130 and D131", () => {
    expect(read(FILES.plan)).toMatch(/\| 3\.4 Experience \|[^\n]*spec 012[^\n]*D130[^\n]*D131/)
    expect(read(FILES.log)).toContain('[0130](0130-experience-weights-each-job-by-its-display.md)')
    expect(read(FILES.log)).toContain('[0131](0131-education-joins-the-content-model.md)')
  })
})
