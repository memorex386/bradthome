import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { cardsOf as experienceCardsOf, type ExperienceJob } from '../../../apps/site/src/components/home/experience.ts'
import { type StoryClaim, storyOf } from '../../../apps/site/src/components/home/hopper.ts'
import { RECORDS, REPO } from '../../../apps/site/src/components/home/record.ts'
import {
  cardsOf,
  COUNTED,
  EYEBROW,
  HEADING,
  LOOKS,
  onPaper,
  RECEIPT_TITLES,
  type SideProject,
  SOURCE,
} from '../../../apps/site/src/components/home/side.ts'
import { claimIdsOf, resumeOf, ROLES, type ResumeContent } from '../../../apps/site/src/components/resume/resume.ts'
import type { Claim } from '../../../apps/site/src/content/schema.ts'
import { renderClaims } from '../../../scripts/content/notes.ts'

// Spec 033's static checks: bradthome.com's card from the content, its words,
// order and receipts, every link it adds, the six claims Brad approved, the
// PDFs that leave it out, and the files' rules (D216–D218).

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')
const code = (file: string): string => read(file).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$|\{\s*\/\*[\s\S]*?\*\/\s*\}/gm, '')

const FILES = {
  section: site('src', 'components', 'home', 'Side.astro'),
  data: site('src', 'components', 'home', 'side.ts'),
  record: site('src', 'components', 'home', 'record.ts'),
  css: site('src', 'styles', 'home', 'side.css'),
  footer: site('src', 'components', 'ds', 'Footer.astro'),
  resume: site('src', 'components', 'resume', 'resume.ts'),
  project: site('content', 'projects', 'bradthome-com.yaml'),
  claims: site('content', 'claims.yaml'),
  readme: path.join(ROOT, 'README.md'),
}

/** Brad's six facts, as approved on the session's card (S4.1), with their sources. */
const APPROVED = {
  'bradthome-com-1': {
    text: 'A résumé you can explore, built in the open: its design, code and process are all public.',
    evidence: ['https://github.com/memorex386/bradthome', 'https://bradthome.com/design-system'],
  },
  'bradthome-com-2': {
    text: 'Each feature starts as a spec Brad approves. Tests come from its scenarios before the code, a reviewer in a fresh context checks the change, and nothing reaches main until Brad says push.',
    evidence: ['https://github.com/memorex386/bradthome/blob/main/docs/working-agreement.md'],
  },
  'bradthome-com-3': {
    text: 'Each release goes out from a tag Brad approves, with a rollback ready and a written record.',
    evidence: ['https://github.com/memorex386/bradthome/blob/main/docs/releases/v2.5.0.md'],
  },
  'bradthome-com-4': {
    text: "Ask about Brad answers only from Brad's public facts, with a source for each answer, and its latest eval run is public, case by case.",
    evidence: ['https://bradthome.com/evals'],
  },
  'bradthome-com-5': {
    text: "Brad's decisions about bradthome.com are written down as records, each with the options considered and why one was chosen.",
    evidence: ['https://github.com/memorex386/bradthome/blob/main/docs/decisions/README.md'],
  },
  'bradthome-com-6': {
    text: "Built with Astro, React, Tailwind CSS and TypeScript, and served by Firebase Hosting. Ask about Brad's API runs on Cloud Run with Hono, and Claude Haiku 5.5 answers.",
    evidence: ['https://github.com/memorex386/bradthome'],
  },
} as const
const ON_CARD = ['bradthome-com-1', 'bradthome-com-2', 'bradthome-com-3', 'bradthome-com-4']

/** The labels the site avoids, and agents running the site (FR-009). */
const AVOIDED = /one engineer|one person|team of AI agents|\bsolo\b|agents? (?:run|runs|ran) (?:the |this )?site/i

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
const projects = (): SideProject[] => folder<Omit<SideProject, 'id'>>(site('content', 'projects'))
const jobs = (): ExperienceJob[] => folder<Omit<ExperienceJob, 'id'>>(site('content', 'jobs'))
const before = (): number => {
  const claims = allClaims()
  const story = storyOf(claims.filter((claim) => claim.subject === 'hopper'))
  const hopper = story.role.length + story.topics.reduce((sum, topic) => sum + topic.items.length, 0) + story.quotes.length
  const experience = experienceCardsOf(jobs(), claims, hopper + 1)
  return hopper + [...experience.featured, ...experience.cards].reduce((sum, card) => sum + card.items.length, 0)
}
const cards = () => cardsOf(projects(), allClaims(), before() + 1)
const card = () => {
  const found = cards().find((entry) => entry.project.id === 'bradthome-com')
  if (!found) throw new Error("no bradthome.com card")
  return found
}
const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+/'.,%]+/)
    .map((word) => word.replace(/^['.,]+|['.,]+$/g, ''))
    .filter(Boolean)

describe('the card, from the content (S1.1, S1.3, FR-001)', () => {
  test("S1.1 FR-001 SC-001 bradthome.com's small card comes third, after Sudoku World's, with its kicker and no \"since\"", () => {
    expect(parse(read(FILES.project))).toEqual({
      name: 'bradthome.com',
      role: 'Creator',
      start: '2026-10',
      end: 'present',
      display: 'small',
      url: 'https://bradthome.com',
      roles: { mobile: 3, fullstack: 3, ai: 3 },
    })
    expect(cards().map((entry) => entry.project.id)).toEqual(['vindecoded', 'sudoku-world', 'bradthome-com'])
    expect(card().kicker).toBe('Built in the open')
    expect(LOOKS['bradthome-com']).toEqual({
      badge: 'code',
      kicker: 'Built in the open',
      claims: ON_CARD,
      records: true,
      source: true,
      onPaper: false,
      since: false,
    })
  })

  test('S1.1 the cards sort full before small, then in side.ts\'s order, never by name', () => {
    const reversed = [...projects()].reverse()
    expect(cardsOf(reversed, allClaims(), 1).map((entry) => entry.project.id)).toEqual(['vindecoded', 'sudoku-world', 'bradthome-com'])
    expect(Object.keys(LOOKS)).toEqual(['vindecoded', 'sudoku-world', 'bradthome-com'])
  })

  test("S1.3 FR-001 it's never a headline: an h3 in the section, which no eyebrow or level-2 heading names", () => {
    for (const text of [EYEBROW, HEADING]) expect(text).not.toMatch(/bradthome/i)
    const section = code(FILES.section)
    expect(section).toMatch(/<h3 id=\{`side-\$\{project\.id\}-heading`\} class="ds-subheading side__card-title">/)
    expect(section).not.toMatch(/<h[12]\b[^>]*>\s*\{project\.name\}/)
  })

  test('S1.4 FR-009 no claim, label or file calls Brad one engineer, one person or solo, or says agents run the site', () => {
    for (const [id, claim] of Object.entries(APPROVED)) expect(claim.text, id).not.toMatch(AVOIDED)
    for (const text of [card().kicker, SOURCE, COUNTED.before, COUNTED.after, ...Object.values(RECEIPT_TITLES), ...RECORDS.map((record) => record.label)])
      expect(text).not.toMatch(AVOIDED)
    for (const file of [FILES.section, FILES.data, FILES.record, FILES.readme]) expect(code(file), file).not.toMatch(AVOIDED)
  })
})

describe('the claims and their receipts (S3.1–S3.5, SC-003)', () => {
  test('S3.1 SC-003 the card shows bradthome-com-1 to -4, as written, numbered on from Sudoku World\'s, every one proof', () => {
    const sudoku = cards().find((entry) => entry.project.id === 'sudoku-world')
    const last = sudoku?.items.at(-1)?.n ?? 0
    const byId = new Map(allClaims().map((claim) => [claim.id, claim.text]))
    expect(card().items.map((item) => [item.id, item.n, item.kind])).toEqual(ON_CARD.map((id, at) => [id, last + 1 + at, 'proof']))
    for (const item of card().items) expect(item.text, item.id).toBe(byId.get(item.id))
  })

  test('S3.2 each receipt links its record: the repo and the gallery (D218), the working agreement, a release record and /evals', () => {
    expect(Object.fromEntries(card().items.map((item) => [item.id, item.evidence]))).toEqual({
      'bradthome-com-1': APPROVED['bradthome-com-1'].evidence,
      'bradthome-com-2': APPROVED['bradthome-com-2'].evidence,
      'bradthome-com-3': APPROVED['bradthome-com-3'].evidence,
      'bradthome-com-4': APPROVED['bradthome-com-4'].evidence,
    })
    // One record per host in each row, so no row shows "github.com" twice.
    for (const item of card().items) expect(new Set(item.evidence.map((href) => new URL(href).host)).size, item.id).toBe(item.evidence.length)
    // The release record links its rehearsal, as the receipt says.
    expect(read(path.join(ROOT, 'docs', 'releases', 'v2.5.0.md'))).toMatch(/\[v2\.5\.0-rehearsal\.md\]\(v2\.5\.0-rehearsal\.md\)/)
  })

  test('S3.3 FR-003 the card links the repo\'s source, not bradthome.com from bradthome.com, with no address in the section\'s files', () => {
    expect(SOURCE).toBe('Read the source on GitHub')
    expect(REPO).toBe('https://github.com/memorex386/bradthome')
    const section = code(FILES.section)
    expect(section).toMatch(/\{look\.source \? \(\s*<a class="ds-link" href=\{REPO\}>\s*\{SOURCE\}\s*<\/a>/)
    for (const file of [FILES.section, FILES.data, FILES.css]) expect(code(file), file).not.toMatch(/https?:\/\//)
  })

  test('S3.4 every link the card adds goes into the repo on GitHub or to bradthome.com, over https', () => {
    const links = [REPO, ...RECORDS.map((record) => record.href), ...card().items.flatMap((item) => item.evidence)]
    expect(links).toHaveLength(9)
    for (const href of links) expect(href).toMatch(/^https:\/\/(?:github\.com\/memorex386\/bradthome(?:\/(?:blob|tree)\/main\/[\w./-]+)?|bradthome\.com\/[\w-]+)$/)
    for (const href of links.filter((link) => link.includes('/main/'))) {
      const file = href.replace(/^https:\/\/github\.com\/memorex386\/bradthome\/(?:blob|tree)\/main\//, '')
      expect(readdirSync(path.join(ROOT, path.dirname(file))), href).toContain(path.basename(file))
    }
    expect(readdirSync(site('src', 'pages'))).toEqual(expect.arrayContaining(['evals.astro', 'design-system.astro']))
  })

  test("S3.5 the kicker and each receipt title are made of their claims' words", () => {
    const byId = new Map(allClaims().map((claim) => [claim.id, claim.text]))
    const all = new Set(words(ON_CARD.map((id) => byId.get(id) ?? '').join(' ')))
    expect(words(card().kicker).filter((word) => !all.has(word))).toEqual([])
    for (const id of ON_CARD) {
      const own = new Set(words(byId.get(id) ?? ''))
      const title = RECEIPT_TITLES[id] ?? ''
      expect(title, id).not.toBe('')
      expect(words(title).filter((word) => !own.has(word)), id).toEqual([])
    }
  })
})

describe('the facts (S4.1)', () => {
  test("S4.1 FR-004 the export holds Brad's six approved facts, public, with their repo links as evidence", () => {
    const ours = allClaims().filter((claim) => claim.subject === 'bradthome-com')
    expect(ours.map((claim) => claim.id)).toEqual(Object.keys(APPROVED))
    for (const claim of ours) {
      const approved = APPROVED[claim.id as keyof typeof APPROVED]
      expect(claim, claim.id).toEqual({
        id: claim.id,
        subject: 'bradthome-com',
        order: Number(claim.id.slice(-1)),
        text: approved.text,
        evidence: approved.evidence,
        visibility: 'public',
      })
      expect(claim.text, claim.id).not.toMatch(/\b(?:the|this) site\b/i)
    }
    // The export wrote them: the file's header is the export's, and no claim but these names bradthome-com.
    expect(read(FILES.claims).startsWith('# Written by pnpm content:export (spec 005)')).toBe(true)
  })

  test("S4.1 claims.yaml is exactly what the export's renderer writes, subjects in order, so no claim was edited by hand", () => {
    // The review's finding: a splice or a hand edit would change the file's text or its order. Whether any
    // other claim changed against main is checked on the rebase, as the plan's T009 says.
    const text = read(FILES.claims)
    const entries = Object.entries(parse(text) as Record<string, Claim>)
    expect(renderClaims(entries)).toBe(text)
    const subjects = entries.map(([, claim]) => claim.subject)
    expect(subjects).toEqual([...subjects].sort())
    for (const subject of new Set(subjects)) {
      const orders = entries.filter(([, claim]) => claim.subject === subject).map(([, claim]) => claim.order)
      expect(orders, subject).toEqual(orders.map((_, at) => at + 1))
    }
  })
})

describe('the PDFs leave it out (S6.1, FR-006)', () => {
  test('S6.1 FR-006 each PDF prints VINDecoded and Sudoku World on the side, and no bradthome.com claim', () => {
    const content: ResumeContent = {
      jobs: jobs() as unknown as ResumeContent['jobs'],
      projects: projects() as unknown as ResumeContent['projects'],
      claims: allClaims() as unknown as ResumeContent['claims'],
    }
    for (const role of ROLES) {
      const resume = resumeOf(role, content)
      expect(resume.side.map((entry) => entry.id), role).toEqual(['vindecoded', 'sudoku-world'])
      expect(claimIdsOf(resume).filter((id) => id.startsWith('bradthome-com')), role).toEqual([])
    }
    expect(onPaper(projects()).map((project) => project.id).sort()).toEqual(['sudoku-world', 'vindecoded'])
    expect(code(FILES.resume)).toMatch(/sideCardsOf\(onPaper\(projects\), claims, 1\)/)
  })
})

describe('the files (S5.5, S6.2, FR-008)', () => {
  test('S5.5 FR-008 the card adds no motion, script or inline style', () => {
    for (const file of [FILES.section, FILES.css]) {
      const text = code(file)
      expect(text, file).not.toMatch(/@keyframes|animation|transition/)
      expect(text, file).not.toMatch(/<script|style=|define:vars/)
    }
    expect(code(FILES.section)).toMatch(/recordsOf\(process\.cwd\(\), new Date\(\)\)/)
  })

  test('S6.2 the footer reads as D210 set it', () => {
    const footer = read(FILES.footer)
    expect(footer).toContain('href="https://github.com/memorex386/bradthome"')
    expect(footer).toMatch(/specs, tests and decisions on GitHub/)
  })
})
