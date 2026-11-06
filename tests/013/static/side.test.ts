import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { cardsOf as experienceCardsOf, type ExperienceJob } from '../../../apps/site/src/components/home/experience.ts'
import { type StoryClaim, storyOf } from '../../../apps/site/src/components/home/hopper.ts'
import {
  blocksOf,
  CASE_STUDY,
  cardsOf,
  EYEBROW,
  HEADING,
  hostOf,
  LOOKS,
  RECEIPT_TITLES,
  SITE_RULES,
  type SideProject,
  sinceOf,
  visibleText,
} from '../../../apps/site/src/components/home/side.ts'

// Spec 013's static checks: the side projects' framing, claims and receipts on
// the real content and on planted content, the closing rule, the labels
// against the claims' words, the evidence D133 adds, and the files' rules
// (D132, D133).

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')

const FILES = {
  section: site('src', 'components', 'home', 'Side.astro'),
  claim: site('src', 'components', 'home', 'SideClaim.astro'),
  data: site('src', 'components', 'home', 'side.ts'),
  css: site('src', 'styles', 'home', 'side.css'),
  // Spec 014: the home's page is the shared HomePage.astro.
  page: site('src', 'components', 'home', 'HomePage.astro'),
  claims: site('content', 'claims.yaml'),
  projects: site('content', 'projects'),
  jobs: site('content', 'jobs'),
  plan: path.join(ROOT, 'docs', 'plan.md'),
  log: path.join(ROOT, 'docs', 'decisions', 'README.md'),
}

const RULE = 'Never say the 1,235 PRs all went through the newer workflow.'
const SHOWN = ['vindecoded-2', 'vindecoded-3', 'vindecoded-7', 'sudoku-world-1', 'sudoku-world-2']
const LEFT_OFF = ['vindecoded-1', 'vindecoded-4', 'vindecoded-5', 'vindecoded-6', 'sudoku-world-3']

interface RawClaim extends Omit<StoryClaim, 'id'> {
  subject: string
  visibility: string
}

const allClaims = (): (RawClaim & { id: string })[] =>
  Object.entries(parse(read(FILES.claims)) as Record<string, RawClaim>).map(([id, claim]) => ({ id, ...claim }))
const folder = <T>(dir: string): (T & { id: string })[] =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => ({ id: name.slice(0, -5), ...(parse(read(path.join(dir, name))) as T) }))
const projects = (): SideProject[] => folder<Omit<SideProject, 'id'>>(FILES.projects)
const jobs = (): ExperienceJob[] => folder<Omit<ExperienceJob, 'id'>>(FILES.jobs)
const before = (): number => {
  const claims = allClaims()
  const story = storyOf(claims.filter((claim) => claim.subject === 'hopper'))
  const hopper = story.role.length + story.topics.reduce((sum, topic) => sum + topic.items.length, 0) + story.quotes.length
  const experience = experienceCardsOf(jobs(), claims, hopper + 1)
  return hopper + [...experience.featured, ...experience.cards].reduce((sum, card) => sum + card.items.length, 0)
}
const real = () => cardsOf(projects(), allClaims(), before() + 1)

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+/'.,%]+/)
    .map((word) => word.replace(/^['.,]+|['.,]+$/g, ''))
    .filter(Boolean)
const missing = (text: string, label: string): string[] => {
  const known = new Set(words(text))
  return words(label).filter((word) => !known.has(word))
}

describe('the framing, from the project files', () => {
  test("S1.2 S1.3 SC-002 FR-002 FR-004 VINDecoded's full card comes first, then Sudoku World's small card", () => {
    expect(Object.fromEntries(projects().map((project) => [project.id, project.display]))).toEqual({
      'sudoku-world': 'small',
      vindecoded: 'card',
    })
    const cards = real()
    expect(cards.map((card) => [card.project.id, card.project.display])).toEqual([
      ['vindecoded', 'card'],
      ['sudoku-world', 'small'],
    ])
    expect(cards.map((card) => card.kicker)).toEqual(['Vehicle research · since 2015', 'Game · web, Android and iOS'])
    expect(cards[0]?.look.stats?.map((stat) => [stat.value, stat.label])).toEqual([
      ['1M+', 'Android downloads · 4.5 stars'],
      ['400K+', 'iOS downloads · 4.7 stars'],
    ])
    expect(cards[1]?.look.stats).toBeUndefined()
    expect(cards.map((card) => card.look.caseStudy === true)).toEqual([true, false])
    expect(CASE_STUDY).toEqual({ label: 'Read the case study', href: '/vindecoded-agents' })
    expect(readdirSync(site('src', 'pages'))).toContain('vindecoded-agents.mdx')
  })

  test('S1.4 FR-004 the section never makes VINDecoded the headline, nor calls Brad one engineer or a team of AI agents', () => {
    expect([EYEBROW, HEADING]).toEqual(['On the side', 'What I build on the side'])
    for (const text of [EYEBROW, HEADING]) expect(text).not.toMatch(/VINDecoded|Sudoku/)
    for (const file of [FILES.section, FILES.claim, FILES.data, FILES.page])
      expect(read(file).replace(/\/\/.*$/gm, ''), file).not.toMatch(/one engineer|one person|team of AI agents/i)
  })

  test("S2.3 D132's lean card: the claims shown, and the ones left off", () => {
    expect(real().flatMap((card) => card.items.map((item) => item.id))).toEqual(SHOWN)
    const looked = Object.values(LOOKS).flatMap((look) => look.claims)
    for (const id of LEFT_OFF) expect(looked).not.toContain(id)
    for (const id of looked) expect(id).toMatch(/^(vindecoded|sudoku-world)-\d+$/)
  })

  test('the edge case: a project with no start has no "since"', () => {
    expect(sinceOf({ start: '2015-05' })).toBe('since 2015')
    expect(sinceOf({})).toBeUndefined()
    const planted = projects().map((project) => ({ ...project, start: undefined }))
    expect(cardsOf(planted, allClaims(), 1)[0]?.kicker).toBe('Vehicle research')
  })
})

describe('the words', () => {
  test('S2.2 FR-005 SC-001 vindecoded-7 shows with its date and wording, and never its closing rule', () => {
    const claim = allClaims().find((entry) => entry.id === 'vindecoded-7')
    expect(claim?.text.trimEnd().endsWith(RULE)).toBe(true)
    expect(SITE_RULES).toEqual({ 'vindecoded-7': RULE })
    const shown = real()[0]?.items.find((item) => item.id === 'vindecoded-7')?.text ?? ''
    expect(shown).not.toContain('Never say')
    expect(shown).toBe(claim?.text.trimEnd().slice(0, -RULE.length).trimEnd())
    const blocks = blocksOf(shown)
    expect(blocks[0]).toEqual({ kind: 'p', text: "The case study's counts, measured on 10/28:" })
    expect(blocks[1]).toMatchObject({ kind: 'ul' })
    expect(blocks[1]?.kind === 'ul' && blocks[1].items[0]).toBe(
      '1,235 merged PRs from June 13 to Oct 28, 2026, 83% of them from agent branches',
    )
    expect(blocks).toHaveLength(2)
  })

  test('S2.1 every other claim shows as written, and blocksOf splits a lead and a list', () => {
    const byId = new Map(allClaims().map((claim) => [claim.id, claim.text]))
    for (const item of real().flatMap((card) => card.items))
      if (item.id !== 'vindecoded-7') expect(item.text, item.id).toBe(byId.get(item.id))
    expect(blocksOf('One line.')).toEqual([{ kind: 'p', text: 'One line.' }])
    expect(blocksOf('Lead:\n- a\n- b\n\nAfter.')).toEqual([
      { kind: 'p', text: 'Lead:' },
      { kind: 'ul', items: ['a', 'b'] },
      { kind: 'p', text: 'After.' },
    ])
    expect(visibleText('vindecoded-2', 'Any text.')).toBe('Any text.')
  })

  test('S2.4 FR-003 each kicker, stat label and receipt title is made of its claims\' words, but for "since" and the start year', () => {
    const byId = new Map(allClaims().map((claim) => [claim.id, claim.text]))
    for (const card of real()) {
      const text = card.look.claims.map((id) => byId.get(id) ?? '').join(' ')
      expect(missing(text, card.look.kicker), card.project.id).toEqual([])
      for (const stat of card.look.stats ?? []) {
        expect(missing(byId.get(stat.claim) ?? '', `${stat.value} ${stat.label}`), stat.label).toEqual([])
      }
    }
    for (const [id, title] of Object.entries(RECEIPT_TITLES)) expect(missing(byId.get(id) ?? '', title), id).toEqual([])
    for (const id of SHOWN) expect(RECEIPT_TITLES[id], id).toBeDefined()
    expect(hostOf('https://vindecoded.com')).toBe('vindecoded.com')
    expect(hostOf('https://www.sudokuworld.app/x')).toBe('sudokuworld.app')
  })

  test('S2.5 the build fails on a missing look, a missing claim, a stat whose claim is off its card, or a moved rule', () => {
    const claims = allClaims()
    expect(() =>
      cardsOf([...projects(), { id: 'new', name: 'New', role: 'x', display: 'small', url: 'https://example.com' }], claims, 1),
    ).toThrow('no look for new')
    expect(() =>
      cardsOf(
        projects(),
        claims.filter((claim) => claim.id !== 'vindecoded-3'),
        1,
      ),
    ).toThrow('vindecoded-3')
    const moved = claims.map((claim) =>
      claim.id === 'vindecoded-7' ? { ...claim, text: claim.text.replace(RULE, 'Another rule.') } : claim,
    )
    expect(() => cardsOf(projects(), moved, 1)).toThrow('rule for the site')
    const look = LOOKS.vindecoded
    if (!look) throw new Error('no look')
    const saved = look.claims
    ;(look as { claims: readonly string[] }).claims = ['vindecoded-2', 'vindecoded-7']
    try {
      expect(() => cardsOf(projects(), claims, 1)).toThrow('vindecoded-3')
    } finally {
      ;(look as { claims: readonly string[] }).claims = saved
    }
  })
})

describe('the receipts', () => {
  test('S3.1 SC-003 FR-006 five receipts, numbered 19 to 23 on from Experience, four proof', () => {
    expect(before()).toBe(18)
    const items = real().flatMap((card) => card.items)
    expect(items.map((item) => item.n)).toEqual([19, 20, 21, 22, 23])
    expect(items.map((item) => item.kind)).toEqual(['proof', 'proof', 'proof', 'proof', 'ask'])
  })

  test("S3.2 S3.3 FR-007 D133's evidence: each project claim's public pages", () => {
    const evidence = Object.fromEntries(
      allClaims()
        .filter((claim) => claim.subject === 'vindecoded' || claim.subject === 'sudoku-world')
        .map((claim) => [claim.id, claim.evidence]),
    )
    expect(evidence).toEqual({
      'sudoku-world-1': ['https://sudokuworld.app'],
      'sudoku-world-2': [],
      'sudoku-world-3': [
        'https://play.google.com/store/apps/details?id=com.vindecoded.sudoku',
        'https://apps.apple.com/us/app/sudoku-world-friend-challenge/id1544613828',
      ],
      'vindecoded-1': [],
      'vindecoded-2': ['https://vindecoded.com'],
      'vindecoded-3': [
        'https://play.google.com/store/apps/details?id=com.mtsdealersolutions.vindecoded',
        'https://apps.apple.com/us/app/vindecoded/id1191483515',
      ],
      'vindecoded-4': [],
      'vindecoded-5': [],
      'vindecoded-6': ['https://bradthome.com/vindecoded-agents'],
      'vindecoded-7': ['https://bradthome.com/vindecoded-agents'],
    })
    for (const claim of allClaims()) expect(claim.visibility, claim.id).toBe('public')
  })

  test('S3.6 every evidence link the section shows is https', () => {
    for (const item of real().flatMap((card) => card.items)) for (const href of item.evidence) expect(href).toMatch(/^https:\/\//)
    for (const project of projects()) expect(project.url).toMatch(/^https:\/\//)
  })
})

describe('the files', () => {
  test('S1.6 FR-008 the section adds no motion, script, inline style or other host', () => {
    for (const file of [FILES.section, FILES.claim, FILES.data, FILES.css]) {
      const text = read(file).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
      expect(text, file).not.toMatch(/@keyframes|animation|transition/)
      expect(text, file).not.toMatch(/<script|style=|define:vars/)
      expect(text, file).not.toMatch(/https?:\/\//)
    }
  })

  test('FR-001 the home shows the section after Experience, and the header links it', () => {
    const page = read(FILES.page)
    expect(page).toMatch(/import Side from '\.\/Side\.astro'/)
    expect(page).toMatch(/<Experience \/>\s*<Side \/>/)
    expect(page).toMatch(/\{ label: 'On the side', href: '#side' \}/)
    expect(read(FILES.section)).toMatch(/<section id="side" class="side" aria-labelledby="side-heading">/)
  })

  test('S5.1 only the home and the role pages show the section (spec 019)', async () => {
    const pages = site('src', 'pages')
    // Spec 014: the sections sit on the shared HomePage.astro, which the home and the role pages render.
    const home = site('src', 'components', 'home')
    expect(readdirSync(home).filter((name) => read(path.join(home, name)).includes('Side.astro'))).toEqual(['HomePage.astro'])
    expect(readdirSync(pages, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).filter((name) => read(path.join(pages, name)).includes('Side.astro'))).toEqual([])
    expect(readdirSync(pages, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).filter((name) => read(path.join(pages, name)).includes('HomePage.astro')).sort()).toEqual(['[role].astro', 'index.astro'])
  })

  test("FR-011 the plan shows slice 3.5's state and the decision log holds D132 and D133", () => {
    expect(read(FILES.plan)).toMatch(/\| 3\.5 Side projects \|[^\n]*spec 013[^\n]*D132[^\n]*D133/)
    expect(read(FILES.log)).toContain('[0132](0132-vindecoded-is-a-side-project-on-a-lean-card.md)')
    expect(read(FILES.log)).toContain('[0133](0133-the-side-projects-public-pages-are-their-evidence.md)')
  })
})
