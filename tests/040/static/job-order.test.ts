import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { caseHash } from '../../../apps/evals/src/run.ts'
import { anchorOf as claimAnchorOf, askNameOf, questionOf } from '../../../apps/site/src/components/ds/proof.ts'
import {
  anchorOf,
  byNewest,
  cardsOf,
  datesOf,
  type ExperienceJob,
  HEADING,
  LOOKS,
  RECEIPT_TITLES,
} from '../../../apps/site/src/components/home/experience.ts'
import { storyOf, type StoryClaim } from '../../../apps/site/src/components/home/hopper.ts'
import { cardsOf as sideCardsOf, type SideProject } from '../../../apps/site/src/components/home/side.ts'
import { EVENTS } from '../../../apps/site/src/components/analytics/umami.ts'
import { MARKS } from '../../../apps/site/src/components/home/marks.ts'
import { claimIdsOf, resumeOf, ROLES, type ResumeContent } from '../../../apps/site/src/components/resume/resume.ts'
import { type CorpusInput, corpusOf, factOf, SITE, SITE_NOTES } from '../../../apps/site/src/corpus/corpus.ts'
import { essayTitleOf } from '../../../apps/site/src/corpus/essay.ts'
import { renderClaims } from '../../../scripts/content/notes.ts'
import { evalsProblems } from '../../../scripts/lib/evals.ts'

// Spec 040's static checks: RealPage's card in date order, its words against
// the claims, the export's file, the PDFs' model and spacing, the corpus's
// links, the eval cases and their changed run, what holds, and the records
// (D238). The browser's checks are in tests/040/e2e.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (...parts: string[]): string => readFileSync(path.join(ROOT, ...parts), 'utf8')
const CONTENT = path.join(ROOT, 'apps', 'site', 'content')

type Claim = StoryClaim & { subject: string; visibility: string }

const claimsFile = (): string => read('apps', 'site', 'content', 'claims.yaml')
const claims = (): Claim[] =>
  Object.entries(parse(claimsFile()) as Record<string, Omit<Claim, 'id'>>).map(([id, claim]) => ({ id, ...claim }))
const folder = <T>(name: string): (T & { id: string })[] =>
  readdirSync(path.join(CONTENT, name))
    .filter((file) => file.endsWith('.yaml'))
    .sort()
    .map((file) => ({ id: file.slice(0, -'.yaml'.length), ...(parse(readFileSync(path.join(CONTENT, name, file), 'utf8')) as T) }))
const jobs = (): ExperienceJob[] => folder<Omit<ExperienceJob, 'id'>>('jobs')
const byId = (): Map<string, Claim> => new Map(claims().map((claim) => [claim.id, claim]))

/** Brad's approved words for the tag row's claim (Gate 1, 2026-11-17). */
const STACK = 'Worked in Kotlin, Java and RxJava.'
const SENTENCE =
  'Led Android development across a suite of real-estate management apps, setting architecture and quality standards and coordinating delivery across mobile products.'

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

function corpus() {
  const essay = read('apps', 'site', 'src', 'pages', 'vindecoded-agents.mdx')
  return corpusOf({
    jobs: jobs(),
    projects: folder('projects'),
    career: folder('career'),
    claims: claims(),
    essay: { title: essayTitleOf(essay), source: essay },
  } as unknown as CorpusInput)
}

function resumeContent(): ResumeContent {
  return {
    jobs: jobs(),
    projects: folder('projects') as unknown as ResumeContent['projects'],
    claims: claims(),
  }
}

describe('the jobs read in date order, with RealPage as a card (story 1)', () => {
  test('S1.1 S1.5 SC-001 FR-001 the featured card, then RealPage, BookShout and Bottle Rocket, newest first, then one job line', () => {
    expect(parse(read('apps', 'site', 'content', 'jobs', 'realpage.yaml'))).toMatchObject({
      display: 'card',
      start: '2018-04',
      end: '2019-09',
    })
    const { featured, cards } = cardsOf(jobs(), claims())
    expect(featured.map((card) => card.job.id)).toEqual(['bleacher-report'])
    expect(cards.map((card) => card.job.id)).toEqual(['realpage', 'bookshout', 'bottle-rocket'])
    expect(cards.map((card) => datesOf(card.job))).toEqual(['Apr 2018 – Sep 2019', 'Nov 2017 – Mar 2018', 'Oct 2015 – Nov 2017'])
    expect(
      byNewest(jobs())
        .filter((job) => job.display === 'line')
        .map((job) => job.id),
    ).toEqual(['enterprise-it'])
  })

  test('S1.5 FR-001 the cards take their places from their start months alone', () => {
    // RealPage planted as if it began between Bottle Rocket and BookShout: it moves there, and nothing else does.
    const planted = jobs().map((job) => (job.id === 'realpage' ? { ...job, start: '2016-06', end: '2017-06' } : job))
    expect(cardsOf(planted, claims()).cards.map((card) => card.job.id)).toEqual(['bookshout', 'realpage', 'bottle-rocket'])
    // A job's weight is its display: RealPage as a line again leaves two cards.
    const line = jobs().map((job) => (job.id === 'realpage' ? { ...job, display: 'line' as const } : job))
    expect(cardsOf(line, claims()).cards.map((card) => card.job.id)).toEqual(['bookshout', 'bottle-rocket'])
  })

  test('S1.2 FR-002 RealPage’s card: the kicker, its one claim with its title and anchor, and its tag list', () => {
    expect(LOOKS.realpage).toEqual({
      kicker: 'Real-estate apps',
      claims: ['realpage-2'],
      tags: { label: 'Tags', items: ['Kotlin', 'Java', 'RxJava'] },
    })
    const card = cardsOf(jobs(), claims()).cards[0]
    expect(card?.job).toMatchObject({ id: 'realpage', company: 'RealPage', title: 'Lead Android Developer' })
    expect(card?.items).toStrictEqual([{ id: 'realpage-2', text: SENTENCE, evidence: [], title: 'Led Android across real-estate apps' }])
    expect(card?.stats).toEqual([])
    expect(claimAnchorOf('realpage-2')).toBe('receipt-realpage-2')
    expect(askNameOf(RECEIPT_TITLES['realpage-2'] ?? '')).toBe('Ask about this: Led Android across real-estate apps')
  })

  test('S1.4 FR-003 the heading names every card’s work, each word in a claim of the cards’ jobs', () => {
    expect(HEADING).toBe('Android for brands, a startup, real-estate apps and a sports media platform')
    const cardsText = claims()
      .filter((claim) => ['bleacher-report', 'realpage', 'bookshout', 'bottle-rocket'].includes(claim.subject))
      .map((claim) => claim.text)
      .join(' ')
    expect(missing(cardsText, HEADING)).toEqual([])
    // "real-estate" is RealPage's own: the other cards' claims hold "apps", but not "real" or "estate".
    const others = claims()
      .filter((claim) => ['bleacher-report', 'bookshout', 'bottle-rocket'].includes(claim.subject))
      .map((claim) => claim.text)
      .join(' ')
    expect(missing(others, HEADING)).toEqual(['real', 'estate'])
  })

  test('S1.6 the timeline keeps its rows, dates and links, and RealPage’s bar takes a card’s fill', () => {
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
    expect(rows.map((job) => anchorOf(job.id))).toEqual([
      '#hopper',
      '#experience-bleacher-report',
      '#experience-realpage',
      '#experience-bookshout',
      '#experience-bottle-rocket',
      '#experience-enterprise-it',
    ])
    // The row's class is its job's display, and a card's bar is the second ink (spec 012's S2.3).
    expect(read('apps', 'site', 'src', 'components', 'home', 'Experience.astro')).toContain(
      "class:list={['experience__row', `experience__row--${job.display}`]}",
    )
    expect(read('apps', 'site', 'src', 'styles', 'home', 'experience.css')).toMatch(
      /\.experience__row--card \.experience__span \{\s*fill: var\(--color-ink-2\);/,
    )
  })

  test('S1.3 FR-008 the home and the role pages render the one section, which takes no role, so its order is the same on each', () => {
    const page = read('apps', 'site', 'src', 'components', 'home', 'HomePage.astro')
    expect(page.match(/<Experience \/>/g)).toHaveLength(1)
    expect(read('apps', 'site', 'src', 'components', 'home', 'Experience.astro')).not.toMatch(/Astro\.props/)
  })

  // Amended by spec 041 (D239): VINDecoded's stack and AI features join the home's cards, so 33 in all.
  test('SC-002 seven claims on the Experience cards, and 33 claims, each with a title and a case, on the home’s cards in all', () => {
    const work = cardsOf(jobs(), claims())
    const experience = [...work.featured, ...work.cards].flatMap((card) => card.items)
    expect(experience).toHaveLength(7)
    const story = storyOf(claims().filter((claim) => claim.subject === 'hopper'))
    const side = sideCardsOf(folder<Omit<SideProject, 'id'>>('projects'), claims()).flatMap((card) => card.items)
    const all = [...story.role, ...story.topics.flatMap((topic) => topic.items), ...story.quotes, ...experience, ...side]
    expect(all).toHaveLength(33)
    expect(new Set(all.map((item) => askNameOf(item.title))).size).toBe(33)
    const cases = CASES.filter((c) => c.id.startsWith('facts-receipt-'))
    expect(cases).toHaveLength(33)
    expect(cases.map((c) => c.id).sort()).toEqual(all.map((item) => `facts-receipt-${item.id}`).sort())
  })
})

describe('every word is a public claim’s (story 2)', () => {
  test('S2.1 FR-004 realpage-1 is the title alone, with no note, so the corpus cuts nothing from it', () => {
    expect(byId().get('realpage-1')).toMatchObject({
      subject: 'realpage',
      order: 1,
      text: 'Lead Android Developer.',
      evidence: [],
      visibility: 'public',
    })
    expect(Object.keys(SITE_NOTES)).not.toContain('realpage-1')
    expect(factOf('realpage-1', 'Lead Android Developer.')).toBe('Lead Android Developer.')
    expect(corpus().sources.find((source) => source.id === 'realpage-1')?.text).toBe('Lead Android Developer.')
  })

  test('S2.2 FR-004 realpage-3 holds Brad’s approved words, and claims.yaml is exactly what the export writes', () => {
    expect(byId().get('realpage-3')).toStrictEqual({
      id: 'realpage-3',
      subject: 'realpage',
      order: 3,
      text: STACK,
      evidence: [],
      visibility: 'public',
    })
    expect(
      claims()
        .filter((claim) => claim.subject === 'realpage')
        .map((claim) => claim.id),
    ).toEqual(['realpage-1', 'realpage-2', 'realpage-3'])
    // The export's own renderer, over the file's claims, gives the file back byte for byte, header and order included.
    const file = claimsFile()
    expect(renderClaims(Object.entries(parse(file) as Record<string, never>))).toBe(file)
  })

  test('S2.3 FR-002 the kicker, tags and sparkle title use only RealPage’s claims’ words, but "Tags"', () => {
    const text = claims()
      .filter((claim) => claim.subject === 'realpage')
      .map((claim) => claim.text)
      .join(' ')
    const look = LOOKS.realpage
    expect(missing(text, look?.kicker ?? '')).toEqual([])
    for (const tag of look?.tags?.items ?? []) expect(missing(text, tag), tag).toEqual([])
    expect(look?.tags?.label).toBe('Tags')
    expect(missing(byId().get('realpage-2')?.text ?? '', RECEIPT_TITLES['realpage-2'] ?? '')).toEqual([])
  })

  test('S2.4 FR-002 realpage-3’s sentence shows on no card, its words only as the tags, and RealPage’s card holds only its own claims', () => {
    const shown = Object.values(LOOKS).flatMap((look) => look.claims)
    for (const id of ['realpage-1', 'realpage-3', 'bookshout-1']) expect(shown, id).not.toContain(id)
    expect(LOOKS.realpage?.claims.every((id) => id.startsWith('realpage-'))).toBe(true)
    expect(RECEIPT_TITLES['realpage-3']).toBeUndefined()
    expect(missing(STACK, (LOOKS.realpage?.tags?.items ?? []).join(' '))).toEqual([])
    expect(missing(SENTENCE, (LOOKS.realpage?.tags?.items ?? []).join(' '))).toEqual(['kotlin', 'java', 'rxjava'])
  })
})

describe('the PDFs print RealPage’s sentence in two pages (story 3)', () => {
  test('S3.1 S3.3 FR-005 each résumé prints RealPage’s heading, dates and sentence, newest first, and enterprise IT as a heading alone', () => {
    for (const role of ROLES) {
      const resume = resumeOf(role, resumeContent())
      expect(
        resume.experience.map((entry) => entry.id),
        role,
      ).toEqual(['hopper', 'bleacher-report', 'realpage', 'bookshout', 'bottle-rocket', 'enterprise-it'])
      const realpage = resume.experience.find((entry) => entry.id === 'realpage')
      expect(realpage, role).toStrictEqual({
        id: 'realpage',
        name: 'RealPage',
        role: 'Lead Android Developer',
        headed: [],
        dates: 'Apr 2018 – Sep 2019',
        lead: [],
        groups: [{ bullets: [{ id: 'realpage-2', blocks: [{ kind: 'p', text: SENTENCE }] }] }],
      })
      const enterprise = resume.experience.find((entry) => entry.id === 'enterprise-it')
      expect([...(enterprise?.lead ?? []), ...(enterprise?.groups ?? [])], role).toEqual([])
      const printed = claimIdsOf(resume)
      expect(printed, role).toContain('realpage-2')
      for (const id of ['realpage-1', 'realpage-3']) expect(printed, `${role} ${id}`).not.toContain(id)
    }
  })

  test('S3.2 FR-005 the print’s page margins and gaps tighten as Brad chose, and its type and line height stay', () => {
    const css = read('apps', 'site', 'src', 'styles', 'resume', 'print.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const rule = (selector: string): string => {
      const at = css.search(new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`))
      if (at < 0) throw new Error(`No rule for ${selector}`)
      return css.slice(at, css.indexOf('}', css.indexOf('{', at)))
    }
    expect(rule('@page')).toMatch(/size: letter;\s*margin: 36px 56px 40px;/)
    expect(rule('h2')).toMatch(/margin: 12px 0 6px;/)
    expect(rule('.entry')).toMatch(/margin-bottom: 8px;/)
    expect(rule('html')).toMatch(/font-size: 16px;\s*line-height: 1\.34;/)
    // Every type size keeps the board's (spec 015's FR-008), so the fit came from spacing alone (the review's second pass):
    // the name, the role's line and the jobs' headings, the contact line, the labels, the dates and the footer.
    const sizes: [string, string][] = [
      ['h1', '34px'],
      ['.head__line', '17px'],
      ['.head__contact', '12px'],
      ['h2', '12px'],
      ['.entry__head', '17px'],
      ['.dates', '12px'],
      ['.group__label', '12px'],
    ]
    for (const [selector, size] of sizes) expect(rule(selector), selector).toMatch(new RegExp(`font-size: ${size.replace('.', '\\.')};`))
    expect(css.match(/font-size: [\d.]+px;/g)).toEqual([
      'font-size: 11.5px;',
      'font-size: 11.5px;',
      'font-size: 16px;',
      'font-size: 34px;',
      'font-size: 17px;',
      'font-size: 12px;',
      'font-size: 12px;',
      'font-size: 17px;',
      'font-size: 12px;',
      'font-size: 12px;',
    ])
    expect(css.match(/line-height: [\d.]+;/g)).toEqual(['line-height: 1.34;', 'line-height: 1.1;'])
  })
})

describe('the chat and its evals follow (story 4)', () => {
  test('S4.1 FR-006 the corpus sends realpage-2 to its claim, and realpage-3, realpage-1 and the job to the card', () => {
    const sources = new Map(corpus().sources.map((source) => [source.id, source]))
    expect(sources.get('realpage-2')).toMatchObject({
      kind: 'claim',
      label: 'Résumé · RealPage',
      text: SENTENCE,
      url: `${SITE}/#receipt-realpage-2`,
    })
    expect(sources.get('realpage-3')).toStrictEqual({
      id: 'realpage-3',
      kind: 'claim',
      label: 'Résumé · RealPage',
      text: STACK,
      url: `${SITE}/#experience-realpage`,
      evidence: [],
    })
    expect(sources.get('realpage-1')?.url).toBe(`${SITE}/#experience-realpage`)
    expect(sources.get('job-realpage')).toMatchObject({
      text: 'Lead Android Developer at RealPage, Apr 2018 – Sep 2019.',
      url: `${SITE}/#experience-realpage`,
    })
    // Amended by spec 041 (D239): vindecoded-4 and -5 link their own anchors on VINDecoded's card, so 33.
    expect([...sources.values()].filter((source) => source.url.startsWith(`${SITE}/#receipt-`))).toHaveLength(33)
    expect(sources.size).toBe(73)
  })

  test('S4.3 FR-007 the new sparkle’s case asks its question, the stack’s case cites realpage-3, and facts-realpage accepts it', () => {
    const find = (id: string) => CASES.find((c) => c.id === id)
    expect(find('facts-receipt-realpage-2')).toStrictEqual({
      id: 'facts-receipt-realpage-2',
      suite: 'facts',
      title: '“Ask about this” on “Led Android across real-estate apps”',
      question: questionOf(SENTENCE),
      expect: { states: ['answered'], cites: ['realpage-2'] },
    })
    expect(find('facts-receipt-realpage-2')?.question).toBe(`Tell me more about this: “${SENTENCE}”`)
    const stack = find('facts-realpage-stack')
    expect(stack).toMatchObject({ suite: 'facts', question: 'What did Brad work in at RealPage?' })
    expect(stack?.expect.states).toEqual(['answered'])
    expect(stack?.expect.cites).toEqual(['realpage-3'])
    // The case names all three (the review's second pass pinned them), and "Java" on its own, not only inside "RxJava".
    expect(stack?.expect.includes).toEqual([/Kotlin/, /\bJava\b/, /RxJava/])
    for (const pattern of stack?.expect.includes ?? [])
      expect(pattern.test('Brad worked in Kotlin, Java and RxJava at RealPage.'), String(pattern)).toBe(true)
    expect((stack?.expect.includes ?? []).every((pattern) => pattern.test('Kotlin and RxJava'))).toBe(false)
    expect(find('facts-realpage')?.expect.cites).toEqual(['job-realpage', 'realpage-1', 'realpage-2', 'realpage-3'])
    expect(find('facts-realpage')?.expect.includes).toEqual([/Lead Android/i])
  })

  test('S4.4 SC-005 FR-007 the changed run asked the new and edited cases, and each passed, so the gate holds', () => {
    const changed = JSON.parse(read('apps', 'evals', 'changed.json')) as {
      mode: string
      passed: boolean
      cases: { id: string; pass: boolean; hash: string }[]
    }
    expect(changed.mode).toBe('changed')
    expect(changed.passed).toBe(true)
    for (const id of ['facts-receipt-realpage-2', 'facts-realpage-stack', 'facts-realpage']) {
      const asked = changed.cases.find((c) => c.id === id)
      const code = CASES.find((c) => c.id === id)
      expect(asked?.pass, id).toBe(true)
      expect(asked?.hash, id).toBe(code && caseHash(code))
    }
    expect(evalsProblems((file) => (existsSync(path.join(ROOT, file)) ? read(file) : undefined))).toEqual([])
  })
})

describe('everything else holds (story 5)', () => {
  test('S5.1 SC-004 FR-008 the CSP is main’s, and the section adds no script, inline style or motion of its own', () => {
    const firebase = JSON.parse(read('firebase.json')) as { hosting: { headers: { headers: { key: string; value: string }[] }[] } }
    const csp =
      firebase.hosting.headers.flatMap((rule) => rule.headers).find((header) => header.key === 'Content-Security-Policy')?.value ?? ''
    // SHA-256 of main's Content-Security-Policy at 0baf95b, before this slice.
    expect(createHash('sha256').update(csp).digest('hex')).toBe('19d369dd8dbd732d086d6e688602cf5e2f63f05a4ada1b1e2e74bdf4cb578716')
    for (const file of [
      ['apps', 'site', 'src', 'components', 'home', 'Experience.astro'],
      ['apps', 'site', 'src', 'components', 'home', 'experience.ts'],
      ['apps', 'site', 'src', 'styles', 'resume', 'print.css'],
    ]) {
      const text = read(...file).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
      expect(text, file.join('/')).not.toMatch(/<script|style=|define:vars|@keyframes|animation|transition/)
    }
  })

  test('S5.5 FR-008 the analytics events are main’s three, and Bleacher Report’s is still the only mark in the section', () => {
    expect(EVENTS).toEqual(['work-reached', 'resume-download', 'contact-click'])
    expect(Object.keys(MARKS).sort()).toEqual(['bleacher-report', 'hopper'])
    // Only the featured card's head can carry a mark (D235); the cards', RealPage's now among them, can't.
    const section = read('apps', 'site', 'src', 'components', 'home', 'Experience.astro')
    expect(section.slice(section.indexOf('experience__cards'))).not.toContain('MARKS')
  })

  test('FR-009 the locked tests of specs 001–003 still match their locks', () => {
    const specs = readdirSync(path.join(ROOT, 'specs')).filter((name) => /^00[123]-/.test(name))
    expect(specs).toHaveLength(3)
    for (const spec of specs) {
      const lines = read('specs', spec, 'tests.lock').trim().split('\n')
      expect(lines.length, spec).toBeGreaterThan(30)
      for (const line of lines) {
        const [hash, file] = line.split(/\s+\*?/, 2)
        const bytes = readFileSync(path.join(ROOT, file ?? ''))
        expect(createHash('sha256').update(bytes).digest('hex'), `${spec}: ${file}`).toBe(hash)
      }
    }
  })

  test('FR-010 D238 is recorded and indexed, slice 5.13 is in the plan, and the amended specs point here', () => {
    const decisions = path.join(ROOT, 'docs', 'decisions')
    const file = readdirSync(decisions).find((name) => name.startsWith('0238-'))
    expect(file).toBeDefined()
    const record = read('docs', 'decisions', file ?? '')
    expect(record).toMatch(/^log-id: D238$/m)
    expect(record).toMatch(/^status: accepted$/m)
    expect(record).toContain('0130-experience-weights-each-job-by-its-display.md')
    expect(read('docs', 'decisions', 'README.md')).toContain(`[0238](${file})`)
    expect(read('docs', 'decisions', '0130-experience-weights-each-job-by-its-display.md')).toContain(`(${file})`)
    expect(read('docs', 'plan.md')).toMatch(/\| 5\.13 The job history in date order \|[^\n]*spec 040[^\n]*D238/)
    for (const spec of ['005-content-model', '012-experience', '015-resume-pdfs', '020-corpus', '038-proof-on-the-card'])
      expect(read('specs', spec, 'spec.md'), spec).toMatch(/spec 040/)
  })
})
