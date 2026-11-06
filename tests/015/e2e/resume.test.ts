import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { parse } from 'yaml'
import { afterTitle, claimIdsOf, FILES, resumeOf, ROLES, titleOf, type ResumeContent } from '../../../apps/site/src/components/resume/resume.ts'
import { compact, readPdf, type PdfFacts } from '../helpers/pdf.ts'

// Spec 015's PDFs as the site serves them, in the pinned container: their
// type, pages, text against the content, contact line, links and title, and
// each page's résumé button. veraPDF checks the standards in CI's html job,
// through pnpm site:pdf.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')

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

const PHONE = /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\+1[\s.-]?\d{3}/

const facts = new Map<string, { bytes: Buffer; pdf: PdfFacts; type: string }>()

test.beforeAll(async ({ request }) => {
  for (const role of ROLES) {
    const response = await request.get(`/resume/${FILES[role]}`)
    expect(response.status(), role).toBe(200)
    const bytes = await response.body()
    facts.set(role, { bytes, pdf: await readPdf(new Uint8Array(bytes)), type: response.headers()['content-type'] ?? '' })
  }
})

test('S1.1 S4.1 SC-001 each PDF is served as application/pdf, the same bytes the build wrote', () => {
  for (const role of ROLES) {
    const served = facts.get(role)!
    expect(served.type, role).toMatch(/^application\/pdf/)
    expect(served.bytes.equals(readFileSync(site('dist', 'resume', FILES[role]))), role).toBe(true)
  }
  expect(readdirSync(site('dist', 'resume')).sort()).toEqual(Object.values(FILES).sort())
})

test('S1.5 SC-001 FR-008 each PDF is at most two pages, with no type under 11.5px (8.625pt)', () => {
  for (const role of ROLES) {
    const { pdf } = facts.get(role)!
    expect(pdf.pages, role).toBeGreaterThanOrEqual(1)
    expect(pdf.pages, role).toBeLessThanOrEqual(2)
    expect(pdf.smallest, role).toBeGreaterThanOrEqual(8.6)
  }
})

test("S2.1 S1.3 S3.2 SC-003 each PDF's text extracts, and holds its page's claims in the page's order", () => {
  const source = content()
  const claims = new Map(source.claims.map((claim) => [claim.id, claim]))
  for (const role of ROLES) {
    const text = compact(facts.get(role)!.pdf.text.join(' '))
    let from = 0
    const resume = resumeOf(role, source)
    const titles = new Map(resume.experience.flatMap((entry) => claimIdsOf({ ...resume, experience: [entry], side: [], education: [] }).map((id) => [id, entry.role.split(' · ')[0] ?? ''])))
    const headed = new Set(resume.experience.flatMap((entry) => entry.headed))
    for (const id of claimIdsOf(resume)) {
      // A claim whose one word joins the heading prints there (S2.5): "Senior Software Engineer · Remote".
      if (headed.has(id)) continue
      // A claim's lines, less list dashes and any closing rule for the site, and any job title it restates, each in order.
      const lines = afterTitle(claims.get(id)?.text ?? '', titles.get(id) ?? '').text
        .split('\n')
        .map((line) => line.replace(/^- /, '').trim())
        .filter((line) => line !== '' && !line.startsWith('Never say'))
      for (const line of lines) {
        const at = text.indexOf(compact(line), from)
        expect(at, `${role} ${id}: ${line}`).toBeGreaterThanOrEqual(from)
        from = at + compact(line).length
      }
    }
    const order = ['EXPERIENCE', 'ONTHESIDE', 'EDUCATION'].map((heading) => text.indexOf(heading))
    for (const at of order) expect(at, role).toBeGreaterThanOrEqual(0)
    expect(order, role).toEqual([...order].sort((a, b) => a - b))
    // S1.3, D142: the jobs print newest first by start date, and RealPage, a dated line on the page, prints its heading alone.
    const headings = [
      'Hopper·SeniorSoftwareEngineer',
      'BleacherReport·SeniorAndroidDeveloper',
      'RealPage·LeadAndroidDeveloperApr2018–Sep2019',
      'BookShout·SeniorMobileEngineer',
      'BottleRocket·AndroidDeveloper',
      'Harley-DavidsonandInfosys·EnterpriseIT2008–2015',
    ].map((heading) => text.indexOf(heading))
    for (const at of headings) expect(at, role).toBeGreaterThanOrEqual(0)
    expect(headings, role).toEqual([...headings].sort((a, b) => a - b))
    expect(text, role).toContain('RealPage·LeadAndroidDeveloperApr2018–Sep2019BookShout')
  }
})

test('S1.2 S1.4 S2.2 S2.3 S2.5 FR-003 each PDF opens with the name, role and contact line, reads Hopper Apr 2022 – Oct 2026, and has no phone number or site rule', () => {
  const lines = { mobile: 'Senior mobile engineer', fullstack: 'Senior full-stack engineer', ai: 'Senior engineer · Applied AI' }
  for (const role of ROLES) {
    const text = facts.get(role)!.pdf.text.join(' ')
    const start = compact(text).slice(0, 200)
    for (const part of ['BradThome', compact(lines[role]), 'Dallas–FortWorth', 'brad@bradthome.com', 'bradthome.com', 'linkedin.com/in/brad-thome', 'github.com/memorex386'])
      expect(start, `${role} ${part}`).toContain(part)
    expect(compact(text), role).toContain(compact('Hopper · Senior Software Engineer · Remote Apr 2022 – Oct 2026'))
    // S2.5: each title prints once.
    expect(text.split('Senior Software Engineer').length - 1, role).toBe(1)
    expect(text.split('Senior Android Developer').length - 1, role).toBe(1)
    expect(compact(text), role).toContain(compact('Promoted from Android Developer in Dec 2020.'))
    expect(text, role).not.toMatch(PHONE)
    for (const note of ['Never say', 'The site shows only', 'risk-taker', 'Named in the Hopper bullets']) expect(text, `${role} ${note}`).not.toContain(note)
  }
})

test('S1.2 S3.2 each PDF carries its title and its links as link annotations', () => {
  for (const role of ROLES) {
    const { pdf } = facts.get(role)!
    expect(pdf.title, role).toBe(titleOf(role))
    expect(pdf.links, role).toEqual(
      expect.arrayContaining([
        'mailto:brad@bradthome.com',
        'https://bradthome.com/',
        'https://www.linkedin.com/in/brad-thome/',
        'https://github.com/memorex386',
        'https://vindecoded.com/',
        'https://sudokuworld.app/',
      ]),
    )
  }
})

test("S1.1 FR-007 each page's \"Read the résumé\" opens its PDF, and the home's opens the full-stack PDF", async ({ page, request }) => {
  const pages = [
    ['/mobile', FILES.mobile],
    ['/fullstack', FILES.fullstack],
    ['/ai', FILES.ai],
    ['/', FILES.fullstack],
  ] as const
  for (const [address, file] of pages) {
    await page.goto(address)
    const link = page.getByRole('link', { name: 'Read the résumé' })
    await expect(link, address).toHaveAttribute('href', `/resume/${file}`)
    await expect(link, address).toHaveAttribute('type', 'application/pdf')
    const response = await request.get(`/resume/${file}`)
    expect(response.status(), address).toBe(200)
  }
})
