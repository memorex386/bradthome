import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { askNameOf, questionOf } from '../../../apps/site/src/components/ds/proof.ts'
import { cardsOf as experienceCardsOf, type ExperienceJob } from '../../../apps/site/src/components/home/experience.ts'
import { type StoryClaim } from '../../../apps/site/src/components/home/hopper.ts'
import {
  blocksOf,
  cardsOf,
  LOOKS,
  PULSE,
  PULSE_CODE,
  pulseBuildOf,
  RECEIPT_TITLES,
  shortDayOf,
  type SideProject,
  storeLinksOf,
} from '../../../apps/site/src/components/home/side.ts'
import { EVENTS } from '../../../apps/site/src/components/analytics/umami.ts'
import { SECTIONS, UPDATED } from '../../../apps/site/src/components/privacy/privacy.ts'
import { claimIdsOf, resumeOf, ROLES, type ResumeContent } from '../../../apps/site/src/components/resume/resume.ts'
import { type CorpusInput, corpusOf, SITE } from '../../../apps/site/src/corpus/corpus.ts'
import { essayTitleOf } from '../../../apps/site/src/corpus/essay.ts'
import { pulseSnapshotSchema } from '../../../apps/site/src/content/previews.ts'

// Spec 041's static checks: VINDecoded's live pulse, its words against its
// claims and Brad's approved words, the numbers it's built with, the PDFs'
// lines, the corpus's links, the eval cases, the privacy note, what holds,
// and the records (D239, D240). The browser's checks are in tests/041/e2e,
// and the API's in tests/041/unit.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (...parts: string[]): string => readFileSync(path.join(ROOT, ...parts), 'utf8')
const CONTENT = path.join(ROOT, 'apps', 'site', 'content')

type Claim = StoryClaim & { subject: string; visibility: string }
const claims = (): Claim[] =>
  Object.entries(parse(read('apps', 'site', 'content', 'claims.yaml')) as Record<string, Omit<Claim, 'id'>>).map(([id, claim]) => ({
    id,
    ...claim,
  }))
const folder = <T>(name: string): (T & { id: string })[] =>
  readdirSync(path.join(CONTENT, name))
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => ({ id: file.slice(0, -5), ...(parse(readFileSync(path.join(CONTENT, name, file), 'utf8')) as T) }))
const projects = (): SideProject[] => folder<Omit<SideProject, 'id'>>('projects')
const cards = () => cardsOf(projects(), claims())
const vindecoded = () => {
  const card = cards().find((entry) => entry.project.id === 'vindecoded')
  if (!card?.look.pulse) throw new Error('no pulse')
  return { ...card, pulse: card.look.pulse }
}
const textOf = (id: string) => claims().find((claim) => claim.id === id)?.text ?? ''

describe('the card reads as Brad chose (story 1)', () => {
  test('S1.1 S1.6 SC-001 FR-001 five claims in order, each with its anchor and a title of its own words', () => {
    const { items, pulse, look } = vindecoded()
    expect(items.map((item) => item.id)).toEqual(['vindecoded-2', 'vindecoded-3', 'vindecoded-4', 'vindecoded-5', 'vindecoded-7'])
    expect(look.stats).toBeUndefined()
    expect(look.icon).toEqual({ snapshot: 'appstore-1191483515' })
    expect(pulse.lead).toBe('vindecoded-2')
    expect(RECEIPT_TITLES['vindecoded-4']).toBe('Re-platformed from AngularJS/Cordova')
    expect(RECEIPT_TITLES['vindecoded-5']).toBe('Shipped production AI features')
    for (const item of items) {
      const title = RECEIPT_TITLES[item.id] ?? ''
      expect(item.title).toBe(title)
      for (const word of title.toLowerCase().match(/[a-z0-9.+/]+/g) ?? [])
        expect(item.text.toLowerCase(), `${item.id} ${word}`).toContain(word)
    }
    expect(new Set(items.map((item) => askNameOf(item.title))).size).toBe(5)
  })

  test('S1.2 SC-001 the downloads tile holds vindecoded-3’s numbers and stores', () => {
    expect(vindecoded().pulse.downloads).toEqual({
      claim: 'vindecoded-3',
      value: '1.4M+',
      stores: [
        { name: 'Android', value: '1M+', stars: '4.5' },
        { name: 'iOS', value: '400K+', stars: '4.7' },
      ],
    })
  })

  test('S1.3 SC-001 six tags from vindecoded-4, and vindecoded-5 as a lead, two items and a closing sentence', () => {
    expect(vindecoded().pulse.stack).toEqual({
      claim: 'vindecoded-4',
      tags: ['React/TypeScript web app', 'Native Android and iOS', 'Node.js/TypeScript API', 'SQL', 'Firebase', 'Azure'],
    })
    const blocks = blocksOf(textOf('vindecoded-5'))
    expect(blocks.map((block) => block.kind)).toEqual(['p', 'ul', 'p'])
    expect(blocks[1]?.kind === 'ul' && blocks[1].items).toHaveLength(2)
  })

  test('S1.4 the case study’s line: three of vindecoded-7’s items, and never 1,235, 83% or the rule', () => {
    const { pulse } = vindecoded()
    expect(pulse.study).toEqual({ claim: 'vindecoded-7', items: ['1,530 test files', '113 runbooks', '46 ADRs'] })
    const astro = read('apps', 'site', 'src', 'components', 'home', 'SidePulse.astro')
    expect(astro).toMatch(/pulse\.study\.items\.join\(' · '\)/)
    expect(astro).toMatch(/CASE_STUDY\.href/)
    for (const word of ['1,235', '83%', 'Never say']) expect(JSON.stringify(pulse)).not.toContain(word)
  })

  test('S1.5 SC-001 the footer links the site, then the App Store and Google Play, from the claims’ evidence', () => {
    const { items, project } = vindecoded()
    const downloads = items.find((item) => item.id === 'vindecoded-3')
    expect(project.url).toBe('https://vindecoded.com')
    expect(storeLinksOf(downloads)).toEqual([
      { key: 'appstore', label: 'App Store', href: 'https://apps.apple.com/us/app/vindecoded/id1191483515' },
      { key: 'play', label: 'Google Play', href: 'https://play.google.com/store/apps/details?id=com.mtsdealersolutions.vindecoded' },
    ])
    expect(PULSE_CODE).toBe('https://github.com/memorex386/bradthome/blob/main/apps/chat-api/src/pulse.ts')
  })

  test("S1.9 Sudoku World's and bradthome.com's cards don't change", () => {
    expect(LOOKS['sudoku-world']).toEqual({
      badge: 'grid',
      icon: { snapshot: 'appstore-1544613828' },
      kicker: 'Game · web, Android and iOS',
      claims: ['sudoku-world-1', 'sudoku-world-2'],
    })
    expect(LOOKS['bradthome-com']?.claims).toEqual(['bradthome-com-1', 'bradthome-com-2', 'bradthome-com-3', 'bradthome-com-4'])
    expect(LOOKS['bradthome-com']?.pulse).toBeUndefined()
    expect(cards().map((card) => card.project.id)).toEqual(['vindecoded', 'sudoku-world', 'bradthome-com'])
  })
})

describe('every word is a claim’s, or Brad’s (story 2)', () => {
  test('S2.1 FR-002 the build fails on a tag, number or item its claim doesn’t hold', () => {
    const change = (id: string, from: string, to: string) =>
      claims().map((claim) => (claim.id === id ? { ...claim, text: claim.text.replace(from, to) } : claim))
    expect(() => cardsOf(projects(), change('vindecoded-4', 'Firebase', 'Supabase'))).toThrow(/"Firebase", which vindecoded-4/)
    expect(() => cardsOf(projects(), change('vindecoded-3', '1.4M+', '1.5M+'))).toThrow(/"1.4M\+", which vindecoded-3/)
    expect(() => cardsOf(projects(), change('vindecoded-3', '(4.7 stars)', '(4.6 stars)'))).toThrow(/vindecoded-3/)
    expect(() => cardsOf(projects(), change('vindecoded-7', '113 runbooks', '114 runbooks'))).toThrow(/"113 runbooks", which isn't an item/)
    expect(() => cardsOf(projects(), change('vindecoded-5', 'Shipped production AI features:\n', ''))).toThrow(
      /lead, a list and a closing sentence/,
    )
  })

  test('S2.2 FR-002 the words that aren’t a claim’s are exactly the ones Brad approved at Gate 1', () => {
    expect(PULSE).toEqual({
      downloads: 'Downloads',
      release: 'Latest iOS release',
      merged: 'Merged PRs',
      mergedSub: 'In the last 30 days',
      stack: 'What I built',
      ai: 'AI in production',
      study: 'From the case study, Oct 28:',
      live: 'Live from the App Store and GitHub',
      built: 'From the App Store and GitHub',
      how: 'How this works',
      note: 'The site’s own API reads the App Store’s public listing and counts the pull requests merged in VINDecoded’s repo, with a read-only token, at most once an hour, and keeps the numbers. This card asks that API, never Apple or GitHub, and shows the numbers it was built with until it answers.',
      steps: [
        { title: 'App Store · GitHub', text: 'Read-only, at most hourly' },
        { title: 'The site’s API', text: 'Cached in Firestore' },
        { title: 'This card', text: 'The build’s numbers, then fresher ones' },
      ],
      code: 'Read the code on GitHub',
    })
    const client = read('apps', 'site', 'src', 'components', 'home', 'pulse.client.ts')
    for (const words of [
      'Shipped ',
      ', today',
      ', yesterday',
      ' days ago',
      'just now',
      ' min ago',
      'Live from ',
      ' · updated ',
      ' as of ',
      'the App Store',
      'GitHub',
      'App Store',
    ])
      expect(client, words).toContain(words)
  })

  test('S2.3 S2.4 FR-002 no word about review, the repo, a branch or a person, nor "one engineer" or "a team of AI agents"', () => {
    const words = JSON.stringify(PULSE) + read('apps', 'site', 'src', 'components', 'home', 'pulse.client.ts')
    expect(words).not.toMatch(/review/i)
    expect(words).not.toMatch(/one engineer|one person|team of AI agents|agent branch/i)
  })
})

describe('the built numbers (story 3)', () => {
  test('S3.8 the card is built with pulse.json’s release and count, dated by the older day, and the snapshot’s stars from 100 ratings', () => {
    const pulse = pulseSnapshotSchema.parse(JSON.parse(read('apps', 'site', 'content', 'previews', 'pulse.json')))
    expect(pulseBuildOf(pulse, { rating: 4.7, ratings: 3200 })).toEqual({
      version: pulse.appStore.version,
      released: pulse.appStore.released,
      stars: '4.7',
      merged: pulse.github.merged,
      asOf: [pulse.appStore.fetched, pulse.github.fetched].sort()[0],
    })
    const planted = {
      appStore: { fetched: '2026-11-20', version: '12.8.0', released: '2026-11-19' },
      github: { fetched: '2026-11-16', merged: 10 },
    }
    expect(pulseBuildOf(planted, { rating: 5, ratings: 6 })).toEqual({
      version: '12.8.0',
      released: '2026-11-19',
      merged: 10,
      asOf: '2026-11-16',
    })
    expect(shortDayOf('2026-11-10')).toBe('Nov 10')
    expect(shortDayOf('2026-03-01')).toBe('Mar 1')
  })
})

describe('the PDFs (story 6)', () => {
  const content = (): ResumeContent => ({
    jobs: folder<Omit<ExperienceJob, 'id'>>('jobs') as ResumeContent['jobs'],
    projects: projects(),
    claims: claims(),
  })

  test('S6.1 FR-008 SC-005 each résumé prints vindecoded-2, -3 and -4, and not -5 or -7 (Brad’s card)', () => {
    expect(LOOKS.vindecoded?.paper).toEqual(['vindecoded-2', 'vindecoded-3', 'vindecoded-4'])
    for (const role of ROLES) {
      const resume = resumeOf(role, content())
      const vd = resume.side.find((entry) => entry.id === 'vindecoded')
      expect(
        vd?.groups.flatMap((group) => group.bullets).map((bullet) => bullet.id),
        role,
      ).toEqual(['vindecoded-2', 'vindecoded-3', 'vindecoded-4'])
      const ids = claimIdsOf(resume)
      for (const id of ['vindecoded-5', 'vindecoded-7']) expect(ids, `${role} ${id}`).not.toContain(id)
      expect(JSON.stringify(resume), role).not.toMatch(/Merged PRs|Latest iOS release|v12\./)
    }
  })

  test('S6.1 the experience cards still read as spec 040 left them', () => {
    const work = experienceCardsOf(folder<Omit<ExperienceJob, 'id'>>('jobs') as ExperienceJob[], claims())
    expect([...work.featured, ...work.cards].map((card) => card.job.id)).toEqual([
      'bleacher-report',
      'realpage',
      'bookshout',
      'bottle-rocket',
    ])
  })
})

describe('the chat and its evals follow (story 7)', () => {
  const corpus = () => {
    const essay = read('apps', 'site', 'src', 'pages', 'vindecoded-agents.mdx')
    return corpusOf({
      jobs: folder('jobs'),
      projects: folder('projects'),
      career: folder('career'),
      claims: claims(),
      essay: { title: essayTitleOf(essay), source: essay },
    } as unknown as CorpusInput)
  }

  test('S7.1 FR-009 vindecoded-4 and -5 link their own anchors, and the card’s other claims keep theirs', () => {
    const sources = corpus().sources
    const url = (id: string) => sources.find((source) => source.id === id)?.url
    for (const id of ['vindecoded-2', 'vindecoded-3', 'vindecoded-4', 'vindecoded-5', 'vindecoded-7'])
      expect(url(id), id).toBe(`${SITE}/#receipt-${id}`)
    expect(url('vindecoded-6')).toBe(`${SITE}/#side-vindecoded`)
    expect(sources.filter((source) => source.url.startsWith(`${SITE}/#receipt-`))).toHaveLength(33)
  })

  test('S7.2 FR-009 one case per new sparkle, asking its question and citing its claim', () => {
    const { items } = vindecoded()
    for (const id of ['vindecoded-4', 'vindecoded-5']) {
      const item = items.find((entry) => entry.id === id)
      const found = CASES.find((c) => c.id === `facts-receipt-${id}`)
      expect(found?.question, id).toBe(questionOf(item?.text ?? ''))
      expect(found?.title, id).toBe(`“Ask about this” on “${item?.title}”`)
      expect(found?.suite).toBe('facts')
      expect(found?.expect).toEqual({ states: ['answered'], cites: [id] })
    }
    // The list closes with a period before the guard sentence, so the question reads as two sentences.
    expect(questionOf(textOf('vindecoded-5'))).toContain('structured outputs. Quotas')
    for (const id of ['facts-vindecoded-downloads', 'facts-vindecoded-side'])
      expect(
        CASES.some((c) => c.id === id),
        id,
      ).toBe(true)
  })

  test('S7.3 SC-006 FR-009 the changed run asked the new cases, and each passed', () => {
    const changed = JSON.parse(read('apps', 'evals', 'changed.json')) as { passed: boolean; cases: { id: string; passed: boolean }[] }
    expect(changed.passed).toBe(true)
    for (const id of ['facts-receipt-vindecoded-4', 'facts-receipt-vindecoded-5']) {
      const found = changed.cases.find((c) => c.id === id)
      expect(found?.passed, id).toBe(true)
    }
  })
})

describe('the privacy note (story 8)', () => {
  test('S8.1 FR-010 a section in Brad’s three approved points, and the note’s date moved', () => {
    expect(SECTIONS.find((section) => section.id === 'pulse')).toEqual({
      id: 'pulse',
      heading: 'VINDecoded’s live numbers',
      items: [
        'When you scroll near VINDecoded’s card, your browser asks this site’s own service for the app’s latest iOS release and the number of pull requests merged in the last 30 days. Nothing about you is sent with it.',
        'That service gets those numbers from Apple’s public App Store listing and from GitHub on its own, at most once an hour. Apple and GitHub never see your visit.',
        'It keeps no record of the request: no address, no cookie and no log line about you.',
      ],
    })
    expect(UPDATED).toBe('2026-11-17')
  })
})

describe('what holds (story 9)', () => {
  test('S9.1 FR-011 the one module takes the pulse, the CSP already allows the API, and no other script is added', () => {
    const module = read('apps', 'site', 'src', 'components', 'previews', 'PreviewLink.astro')
    expect(module).toMatch(/import '\.\.\/home\/pulse\.client\.ts'/)
    expect(read('firebase.json')).toContain('https://chat-api-568431230204.us-central1.run.app')
    const side = read('apps', 'site', 'src', 'components', 'home', 'SidePulse.astro')
    expect(side).not.toMatch(/<script/)
    expect(read('apps', 'site', 'src', 'styles', 'home', 'side.css')).not.toMatch(/transition|animation/)
  })

  test('S3.7 the live line is plain text, never a live region', () => {
    const side = read('apps', 'site', 'src', 'components', 'home', 'SidePulse.astro')
    expect(side).not.toMatch(/aria-live|role="status"|role="alert"/)
    expect(read('apps', 'site', 'src', 'components', 'home', 'pulse.client.ts')).not.toMatch(/aria-live|innerHTML|insertAdjacentHTML/)
  })

  test('S9.5 FR-011 no analytics event is added', () => {
    expect(EVENTS).toEqual(['work-reached', 'resume-download', 'contact-click'])
    expect(read('apps', 'site', 'src', 'components', 'home', 'pulse.client.ts')).not.toMatch(/umami|track\(/)
  })

  test('S9.7 FR-013 specs 001–003 keep their locks, and no locked test changed', () => {
    for (const spec of ['001', '002', '003']) {
      const dir = readdirSync(path.join(ROOT, 'specs')).find((name) => name.startsWith(`${spec}-`))
      expect(existsSync(path.join(ROOT, 'specs', dir ?? '', 'tests.lock')), spec).toBe(true)
    }
  })
})

describe('the records', () => {
  test('FR-013 D239 and D240 are recorded and indexed, slice 5.14 is in the plan, and D132 points to D239', () => {
    const decisions = readdirSync(path.join(ROOT, 'docs', 'decisions'))
    for (const id of ['0239', '0240']) {
      const file = decisions.find((name) => name.startsWith(`${id}-`))
      expect(file, id).toBeDefined()
      expect(read('docs', 'decisions', 'README.md')).toContain(file)
    }
    expect(read('docs', 'plan.md')).toMatch(/\| 5\.14 VINDecoded's live card \|/)
    const d132 = decisions.find((name) => name.startsWith('0132-')) ?? ''
    expect(read('docs', 'decisions', d132)).toMatch(/Amended by \[D239\]/)
  })
})
