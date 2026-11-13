import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { sourcesOf } from '../../../apps/site/src/components/ds/proof.ts'
import type { ExperienceJob } from '../../../apps/site/src/components/home/experience.ts'
import type { StoryClaim } from '../../../apps/site/src/components/home/hopper.ts'
import { RECORDS, REPO } from '../../../apps/site/src/components/home/record.ts'
import { SOURCE_LABELS } from '../../../apps/site/src/components/home/sources.ts'
import {
  cardsOf,
  COUNTED,
  EYEBROW,
  HEADING,
  linksOf,
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
// order and sources, every link it adds, the six claims Brad approved, the
// PDFs that leave it out, and the files' rules (D216–D218). Since spec 038
// (D229) the card shows its sources at rest, under its claims, in place of a
// receipts drawer, and nothing on it is numbered.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')
const code = (file: string): string => read(file).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$|\{\s*\/\*[\s\S]*?\*\/\s*\}/gm, '')

const FILES = {
  section: site('src', 'components', 'home', 'Side.astro'),
  data: site('src', 'components', 'home', 'side.ts'),
  record: site('src', 'components', 'home', 'record.ts'),
  sources: site('src', 'components', 'home', 'sources.ts'),
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

/**
 * The records the card lists under its claims, at rest, in claim order, with spec 038's labels (FR-003, D229). The
 * repo, bradthome-com-1's first, is the card's own link, so it isn't listed again; the two on this site go by path.
 */
const LISTED = [
  { href: '/design-system', label: 'The design system', host: 'bradthome.com', outside: false, claim: 'bradthome-com-1' },
  {
    href: 'https://github.com/memorex386/bradthome/blob/main/docs/working-agreement.md',
    label: 'Each feature starts as a spec Brad approves',
    host: 'github.com',
    outside: true,
    claim: 'bradthome-com-2',
  },
  {
    href: 'https://github.com/memorex386/bradthome/blob/main/docs/releases/v2.5.0.md',
    label: "A release's written record",
    host: 'github.com',
    outside: true,
    claim: 'bradthome-com-3',
  },
  { href: '/evals', label: 'The latest eval run, case by case', host: 'bradthome.com', outside: false, claim: 'bradthome-com-4' },
]

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
// Amended by spec 038 (D229): the cards take no first number, since no claim is numbered.
const cards = () => cardsOf(projects(), allClaims())
const card = () => {
  const found = cards().find((entry) => entry.project.id === 'bradthome-com')
  if (!found) throw new Error('no bradthome.com card')
  return found
}
const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+/'.,%]+/)
    .map((word) => word.replace(/^['.,]+|['.,]+$/g, ''))
    .filter(Boolean)

describe('the card, from the content (S1.1, S1.3, FR-001)', () => {
  test('S1.1 FR-001 SC-001 bradthome.com\'s small card comes third, after Sudoku World\'s, with its kicker and no "since"', () => {
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

  test("S1.1 the cards sort full before small, then in side.ts's order, never by name", () => {
    const reversed = [...projects()].reverse()
    expect(cardsOf(reversed, allClaims()).map((entry) => entry.project.id)).toEqual(['vindecoded', 'sudoku-world', 'bradthome-com'])
    expect(Object.keys(LOOKS)).toEqual(['vindecoded', 'sudoku-world', 'bradthome-com'])
  })

  test("S1.3 FR-001 it's never a headline: an h3 in the section, which no eyebrow or level-2 heading names", () => {
    for (const text of [EYEBROW, HEADING]) expect(text).not.toMatch(/bradthome/i)
    const section = code(FILES.section)
    expect(section).toMatch(/<h3 id=\{`side-\$\{project\.id\}-heading`\} class="ds-subheading side__card-title">/)
    expect(section).not.toMatch(/<h[12]\b[^>]*>\s*\{project\.name\}/)
  })

  // Amended by spec 038 (D229): the card's listed sources are labels on it too, kept in sources.ts.
  test('S1.4 FR-009 no claim, label or file calls Brad one engineer, one person or solo, or says agents run the site', () => {
    for (const [id, claim] of Object.entries(APPROVED)) expect(claim.text, id).not.toMatch(AVOIDED)
    for (const text of [
      card().kicker,
      SOURCE,
      COUNTED.before,
      COUNTED.after,
      ...Object.values(RECEIPT_TITLES),
      ...RECORDS.map((record) => record.label),
      ...Object.values(SOURCE_LABELS).flatMap((labels) => Object.values(labels)),
    ])
      expect(text).not.toMatch(AVOIDED)
    for (const file of [FILES.section, FILES.data, FILES.record, FILES.sources, FILES.readme]) expect(code(file), file).not.toMatch(AVOIDED)
  })
})

describe('the claims and their sources (S3.1–S3.5, SC-003)', () => {
  // Amended by spec 038 (D229, D230): the markers and their numbers are gone. Each claim still has a public source,
  // and the title that named its receipt names its sparkle.
  test("S3.1 SC-003 the card shows bradthome-com-1 to -4, in order and as written, each with a public source and its sparkle's title", () => {
    const byId = new Map(allClaims().map((claim) => [claim.id, claim.text]))
    expect(card().items.map((item) => [item.id, item.evidence.length > 0, item.title])).toEqual(
      ON_CARD.map((id) => [id, true, RECEIPT_TITLES[id]]),
    )
    for (const item of card().items) expect(item.text, item.id).toBe(byId.get(item.id))
  })

  // Amended by spec 038 (D229): the drawer's rows are gone. The card shows every record at rest, once: the repo as its
  // own link, and the rest listed under its claims, before that link, each with its label and host.
  test("S3.2 each claim's record shows on the card at rest: the repo as its link, and the gallery (D218), the working agreement, a release record and /evals as its sources", () => {
    expect(Object.fromEntries(card().items.map((item) => [item.id, item.evidence]))).toEqual({
      'bradthome-com-1': APPROVED['bradthome-com-1'].evidence,
      'bradthome-com-2': APPROVED['bradthome-com-2'].evidence,
      'bradthome-com-3': APPROVED['bradthome-com-3'].evidence,
      'bradthome-com-4': APPROVED['bradthome-com-4'].evidence,
    })
    // The card has no stats, and its own link is the repo, so that's what it already links.
    expect(linksOf(card())).toEqual([REPO])
    const listed = sourcesOf(card().items, linksOf(card()), SOURCE_LABELS)
    expect(listed).toEqual(LISTED)
    // Each record shows once: the repo as the card's link, and the rest as its sources.
    expect(card().items.flatMap((item) => item.evidence)).toEqual([
      REPO,
      ...listed.map((source) => (source.outside ? source.href : `https://bradthome.com${source.href}`)),
    ])
    // The section lists what the card doesn't already link, under the claims and before its own link.
    const section = code(FILES.section)
    expect(section).toMatch(
      /<Sources sources=\{sourcesOf\(items, linksOf\(card\), SOURCE_LABELS\)\} id=\{`sources-side-\$\{project\.id\}`\} \/>/,
    )
    const at = (mark: string) => section.indexOf(mark)
    expect(at('<div class="ds-claims">')).toBeGreaterThan(0)
    expect(at('<Sources ')).toBeGreaterThan(at('<div class="ds-claims">'))
    expect(at('<p class="side__links">')).toBeGreaterThan(at('<Sources '))
    // The release record links its rehearsal, as the claim's written record says.
    expect(read(path.join(ROOT, 'docs', 'releases', 'v2.5.0.md'))).toMatch(/\[v2\.5\.0-rehearsal\.md\]\(v2\.5\.0-rehearsal\.md\)/)
  })

  test("S3.3 FR-003 the card links the repo's source, not bradthome.com from bradthome.com, with no address in the section's files", () => {
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

  // Amended by spec 038 (D230): the titles that named the receipts name the sparkles now.
  test("S3.5 the kicker and each sparkle's title are made of their claims' words", () => {
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
    expect(
      onPaper(projects())
        .map((project) => project.id)
        .sort(),
    ).toEqual(['sudoku-world', 'vindecoded'])
    // Amended by spec 038 (D229): the cards take no first number, since no claim is numbered.
    expect(code(FILES.resume)).toMatch(/sideCardsOf\(onPaper\(projects\), claims\)/)
  })
})

describe('the files (S5.5, S6.2, FR-008)', () => {
  test('S5.5 FR-008 the card adds no motion, script or inline style', () => {
    for (const file of [FILES.section, FILES.css]) {
      const text = code(file)
      expect(text, file).not.toMatch(/@keyframes|animation|transition/)
      expect(text, file).not.toMatch(/<script|style=|define:vars/)
    }
    // The counts are taken once per build, at build time (S1.2, S2.2): never on the visitor's page.
    expect(code(FILES.section)).toMatch(/buildRecordsOf\(process\.cwd\(\)\)/)
  })

  test('S6.2 the footer reads as D210 set it', () => {
    const footer = read(FILES.footer)
    expect(footer).toContain('href="https://github.com/memorex386/bradthome"')
    expect(footer).toMatch(/specs, tests and decisions on GitHub/)
  })
})
