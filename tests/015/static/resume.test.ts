import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { TOPIC_ORDER, type RolePage } from '../../../apps/site/src/components/home/roles.ts'
import {
  afterTitle,
  claimIdsOf,
  CONTACT,
  FILES,
  HOME_RESUME,
  pdfHrefOf,
  resumeHrefOf,
  resumeOf,
  ROLES,
  titleOf,
  type Resume,
  type ResumeContent,
} from '../../../apps/site/src/components/resume/resume.ts'
import { clean, differing, JOBS, printArgs, REPRINT } from '../../../scripts/site/resume-pdfs.ts'

// Spec 015's résumés, read from the source: what each role's résumé holds and
// in what order, the contact line, the links to the PDFs, and the build step
// that prints and cleans up. The printed PDFs are tests/015/e2e's.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')

const FILES_IN = {
  hero: site('src', 'components', 'home', 'Hero.astro'),
  heroTs: site('src', 'components', 'home', 'hero.ts'),
  page: site('src', 'pages', 'resume', '[role].astro'),
  entry: site('src', 'components', 'resume', 'ResumeEntry.astro'),
  css: site('src', 'styles', 'resume', 'print.css'),
  resume: site('src', 'components', 'resume', 'resume.ts'),
  config: site('astro.config.mjs'),
  plan: path.join(ROOT, 'docs', 'plan.md'),
  log: path.join(ROOT, 'docs', 'decisions', 'README.md'),
  agents: path.join(ROOT, 'AGENTS.md'),
}

/** The content, read from the YAML files as the collections read them. */
function content(): ResumeContent {
  const folder = (name: string) =>
    readdirSync(site('content', name))
      .filter((file) => file.endsWith('.yaml'))
      .map((file) => ({ id: file.slice(0, -'.yaml'.length), ...(parse(read(site('content', name, file))) as object) }))
  const claims = Object.entries(parse(read(site('content', 'claims.yaml'))) as Record<string, object>).map(([id, claim]) => ({ id, ...claim }))
  return {
    jobs: folder('jobs') as unknown as ResumeContent['jobs'],
    projects: folder('projects') as unknown as ResumeContent['projects'],
    claims: claims as unknown as ResumeContent['claims'],
  }
}

/** Every string a résumé holds. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

/** The claims a page shows after Hopper's, in its order: the same on every page (specs 012, 013). */
const AFTER_HOPPER = [
  'bleacher-report-1',
  'bleacher-report-2',
  'bleacher-report-3',
  'bookshout-2',
  'bookshout-3',
  'bottle-rocket-2',
  'vindecoded-2',
  'vindecoded-3',
  'vindecoded-7',
  'sudoku-world-1',
  'sudoku-world-2',
  'education-1',
]

/** Hopper's claims for a role: the role lines, then each topic in D134's order, each in claim order. */
function hopperIds(role: RolePage): string[] {
  const hopper = content().claims.filter((claim) => claim.subject === 'hopper')
  const byOrder = (topic: string) =>
    hopper
      .filter((claim) => claim.topic === topic)
      .sort((a, b) => a.order - b.order)
      .map((claim) => claim.id)
  return [...byOrder('Role and dates'), ...TOPIC_ORDER[role].flatMap(byOrder)]
}

const PHONE = /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\+1[\s.-]?\d{3}/

describe('what each résumé holds', () => {
  const resumes = new Map<RolePage, Resume>(ROLES.map((role) => [role, resumeOf(role, content())]))

  test("S2.1 S1.3 SC-003 FR-001 each résumé holds exactly its page's claims, Hopper's topics in D134's order", () => {
    for (const role of ROLES) expect(claimIdsOf(resumes.get(role)!), role).toEqual([...hopperIds(role), ...AFTER_HOPPER])
  })

  test("S2.1 FR-002 each claim prints as the page shows it, and the sections read Experience, On the side, Education", () => {
    const claims = new Map(content().claims.map((claim) => [claim.id, claim.text]))
    for (const role of ROLES) {
      const resume = resumes.get(role)!
      const entries = [...resume.experience, ...resume.side]
      for (const entry of entries) {
        for (const bullet of [...entry.lead, ...entry.groups.flatMap((group) => group.bullets)]) {
          const printed = bullet.blocks.flatMap((block) => (block.kind === 'p' ? [block.text] : block.items)).join(' ')
          // A claim that restates the job's title prints what follows it (S2.5).
          const source = afterTitle(claims.get(bullet.id) ?? '', entry.role.split(' · ')[0] ?? '').text.replace(/^- /gm, '')
          expect(source.replace(/\s+/g, ''), bullet.id).toContain(printed.replace(/\s+/g, ''))
        }
      }
      expect(resume.side.map((entry) => entry.id)).toEqual(['vindecoded', 'sudoku-world'])
    }
    const page = read(FILES_IN.page)
    expect(page.indexOf('HEADINGS.experience')).toBeLessThan(page.indexOf('HEADINGS.side'))
    expect(page.indexOf('HEADINGS.side')).toBeLessThan(page.indexOf('HEADINGS.education'))
  })

  test("S2.2 FR-002 no rule for the site and no claim the page treats as a note prints", () => {
    for (const role of ROLES) {
      const all = strings(resumes.get(role)).join('\n')
      expect(all).not.toContain('Never say')
      expect(all).not.toContain('The site shows only')
      expect(all).not.toContain('risk-taker')
      expect(all).not.toContain('Named in the Hopper bullets')
      expect(claimIdsOf(resumes.get(role)!)).not.toEqual(expect.arrayContaining(['hopper-stack-1']))
      for (const id of ['hopper-stack-1', 'realpage-1', 'realpage-2', 'bookshout-1', 'sudoku-world-3', 'vindecoded-4'])
        expect(claimIdsOf(resumes.get(role)!), `${role} ${id}`).not.toContain(id)
    }
  })

  test('S1.2 S2.3 FR-003 the contact line is Brad\'s choice (D137), and no résumé or source holds a phone number', () => {
    expect(CONTACT).toEqual([
      { label: 'Dallas–Fort Worth' },
      { label: 'brad@bradthome.com', href: 'mailto:brad@bradthome.com' },
      { label: 'bradthome.com', href: 'https://bradthome.com' },
      { label: 'linkedin.com/in/brad-thome', href: 'https://www.linkedin.com/in/brad-thome/' },
      { label: 'github.com/memorex386', href: 'https://github.com/memorex386' },
    ])
    for (const role of ROLES) {
      const resume = resumes.get(role)!
      expect(resume.contact).toBe(CONTACT)
      expect(resume.name).toBe('Brad Thome')
      expect(strings(resume).join('\n'), role).not.toMatch(PHONE)
    }
    for (const file of [FILES_IN.page, FILES_IN.entry, FILES_IN.css, FILES_IN.resume]) expect(read(file), file).not.toMatch(PHONE)
    expect(read(FILES_IN.resume)).not.toMatch(/\btel:/)
  })

  test('S1.3 every job prints newest first by start date, the page\'s dated lines as headings alone (D142, #45)', () => {
    for (const role of ROLES) {
      const experience = resumes.get(role)!.experience
      expect(experience.map((entry) => entry.id), role).toEqual(['hopper', 'bleacher-report', 'realpage', 'bookshout', 'bottle-rocket', 'enterprise-it'])
      for (const id of ['realpage', 'enterprise-it']) {
        const entry = experience.find((item) => item.id === id)!
        expect([...entry.lead, ...entry.groups], id).toEqual([])
      }
      expect(experience.find((item) => item.id === 'enterprise-it')?.dates).toBe('2008 – 2015')
    }
  })

  test('S2.5 a claim that restates the job\'s title doesn\'t print the title again (#45)', () => {
    for (const role of ROLES) {
      const [hopper, bleacher] = resumes.get(role)!.experience
      expect(hopper?.role, role).toBe('Senior Software Engineer · Remote')
      expect(hopper?.headed, role).toEqual(['hopper-role-and-dates-1'])
      expect(hopper?.lead.flatMap((bullet) => bullet.blocks), role).toEqual([{ kind: 'p', text: 'Founding engineer on the Fintech AI team.' }])
      expect(bleacher?.role, role).toBe('Senior Android Developer')
      expect(bleacher?.groups[0]?.bullets[0]?.blocks, role).toEqual([{ kind: 'p', text: 'Promoted from Android Developer in Dec 2020.' }])
      const printed = [...(hopper?.lead ?? []), ...(bleacher?.groups ?? []).flatMap((group) => group.bullets)].flatMap((bullet) => bullet.blocks.flatMap((block) => (block.kind === 'p' ? [block.text] : block.items)))
      for (const text of printed) expect(text, role).not.toMatch(/^Senior (?:Software Engineer|Android Developer)/)
    }
    expect(afterTitle('Lead Android Developer.', 'Lead Android Developer')).toEqual({ text: 'Lead Android Developer.', restated: false })
    expect(afterTitle('Senior Software Engineer, remote.', 'Senior Software Engineer')).toEqual({ text: 'Remote.', restated: true })
  })

  test('S1.4 Hopper reads Apr 2022 – Oct 2026 on every résumé (D138)', () => {
    for (const role of ROLES) {
      const hopper = resumes.get(role)!.experience[0]!
      expect(hopper.name).toBe('Hopper')
      expect(hopper.dates).toBe('Apr 2022 – Oct 2026')
    }
  })

  test('S1.2 S3.2 each résumé names its role and carries its title', () => {
    expect(ROLES.map((role) => resumes.get(role)!.headline)).toEqual(['Senior mobile engineer', 'Senior full-stack engineer', 'Senior engineer · Applied AI'])
    expect(ROLES.map(titleOf)).toEqual(['Brad Thome · Mobile engineer · Résumé', 'Brad Thome · Full-stack engineer · Résumé', 'Brad Thome · Applied AI · Résumé'])
    const page = read(FILES_IN.page)
    expect(page).toMatch(/<html lang="en">/)
    expect(page).toMatch(/<title>\{resume\.title\}<\/title>/)
  })

  test('S2.4 FR-001 a claim the page needs and the content lacks fails the build', () => {
    const base = content()
    for (const missing of ['bleacher-report-2', 'vindecoded-3', 'education-1']) {
      const without = { ...base, claims: base.claims.filter((claim) => claim.id !== missing) }
      expect(() => resumeOf('mobile', without), missing).toThrow()
    }
  })

  test('S1.5 FR-008 the print page keeps the board\'s sizes: Letter, a 16px body, nothing under 11.5px', () => {
    const css = read(FILES_IN.css)
    expect(css).toMatch(/size:\s*letter/)
    expect(css).toMatch(/html\s*\{[^}]*font-size:\s*16px/)
    const sizes = [...css.matchAll(/font-size:\s*([\d.]+)px/g)].map((match) => Number(match[1]))
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11.5)
  })
})

describe('the résumé links', () => {
  test('S1.1 FR-007 each role page links its PDF, and /v2 the full-stack PDF (D140, D141)', () => {
    expect(FILES).toEqual({ mobile: 'brad-thome-mobile.pdf', fullstack: 'brad-thome-full-stack.pdf', ai: 'brad-thome-applied-ai.pdf' })
    expect(ROLES.map(resumeHrefOf)).toEqual(['/resume/brad-thome-mobile.pdf', '/resume/brad-thome-full-stack.pdf', '/resume/brad-thome-applied-ai.pdf'])
    expect(HOME_RESUME).toBe('fullstack')
    expect(resumeHrefOf('all')).toBe(pdfHrefOf('fullstack'))
    const hero = read(FILES_IN.hero)
    expect(hero).toMatch(/href=\{resumeHrefOf\(role\)\}/)
    expect(hero).toMatch(/type="application\/pdf"/)
    expect(read(FILES_IN.heroTs)).not.toMatch(/linkedin\.com\/in\/brad-thome\/' \}/)
  })
})

describe('the build step', () => {
  const planted = (): string => {
    const dist = mkdtempSync(path.join(tmpdir(), 'bradthome-015-'))
    mkdirSync(path.join(dist, 'resume', '.reprint'), { recursive: true })
    for (const job of JOBS) {
      writeFileSync(path.join(dist, job.source), '<!doctype html>')
      writeFileSync(path.join(dist, job.output), '%PDF-1.7')
      writeFileSync(path.join(dist, REPRINT, path.basename(job.output)), '%PDF-1.7')
    }
    writeFileSync(path.join(dist, 'v2.html'), '<!doctype html>')
    return dist
  }

  test('S4.1 FR-004 a build keeps the PDFs and removes the print pages and the second print', () => {
    const dist = planted()
    try {
      expect(differing(dist)).toEqual([])
      clean(dist, false)
      expect(readdirSync(path.join(dist, 'resume')).sort()).toEqual(Object.values(FILES).sort())
      expect(existsSync(path.join(dist, 'v2.html'))).toBe(true)
    } finally {
      rmSync(dist, { recursive: true, force: true })
    }
  })

  test('S4.3 SC-001 FR-004 a release build holds no résumé folder', () => {
    const dist = planted()
    try {
      clean(dist, true)
      expect(existsSync(path.join(dist, 'resume'))).toBe(false)
    } finally {
      rmSync(dist, { recursive: true, force: true })
    }
  })

  test('S4.2 SC-004 FR-009 the build prints twice and fails when the bytes differ', () => {
    const dist = planted()
    try {
      writeFileSync(path.join(dist, REPRINT, FILES.ai), '%PDF-1.7 changed')
      expect(differing(dist)).toEqual([`resume/${FILES.ai}`])
    } finally {
      rmSync(dist, { recursive: true, force: true })
    }
    expect(printArgs('/dist')).toEqual([
      expect.stringMatching(/print\.py$/),
      '/dist',
      ...ROLES.flatMap((role) => [`resume/${role}.html`, `resume/${FILES[role]}`]),
    ])
    expect(printArgs('/dist', REPRINT).at(-1)).toBe(`${REPRINT}/${FILES.ai}`)
  })

  test('S4.1 FR-004 Astro runs the step after release-pages, and git holds no PDF', () => {
    expect(read(FILES_IN.config)).toMatch(/integrations:\s*\[[^\]]*releasePages,\s*resumePdfs\]/)
    const tracked = spawnSync('git', ['ls-files', '*.pdf'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim()
    expect(tracked).toBe('')
  })

  test('S4.4 a build in CI without WeasyPrint fails, and one elsewhere warns and leaves the PDFs out', async () => {
    const { printerInstalled } = await import('../../../scripts/site/printer.ts')
    if (printerInstalled()) return
    const { resumePdfs } = await import('../../../scripts/site/resume-pdfs.ts')
    const saved = { CI: process.env.CI, BRADTHOME_RELEASE: process.env.BRADTHOME_RELEASE }
    delete process.env.BRADTHOME_RELEASE
    const warnings: string[] = []
    const logger = { info: () => undefined, warn: (message: string) => warnings.push(message) }
    const dist = planted()
    try {
      process.env.CI = '1'
      expect(() => resumePdfs.hooks['astro:build:done']({ dir: new URL(`file:///${dist.replaceAll('\\', '/')}/`), logger })).toThrow(/pnpm printer:install/)
      process.env.CI = ''
      resumePdfs.hooks['astro:build:done']({ dir: new URL(`file:///${dist.replaceAll('\\', '/')}/`), logger })
      expect(warnings.join('\n')).toMatch(/WeasyPrint is not installed/)
      for (const job of JOBS) expect(existsSync(path.join(dist, job.source))).toBe(false)
    } finally {
      rmSync(dist, { recursive: true, force: true })
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
  })
})

describe('the docs', () => {
  test('FR-010 the plan, AGENTS.md and the decision log show slice 3.7 and D137–D141', () => {
    const plan = read(FILES_IN.plan)
    expect(plan).toMatch(/\| 3\.7 Résumé PDFs \|[^\n]*spec 015/)
    const log = read(FILES_IN.log)
    for (const id of ['0137', '0138', '0139', '0140', '0141']) expect(log, id).toContain(`[${id}](${id}-`)
    expect(read(FILES_IN.agents)).toMatch(/site:pdf|veraPDF/)
  })
})
