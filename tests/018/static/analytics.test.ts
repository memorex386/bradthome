import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { ENDPOINT, EVENTS, HOST, ORIGIN, PLACEHOLDER_ID, REGION, RESUME_ROLES, RETENTION_MONTHS, WEBSITE_ID } from '../../../apps/site/src/components/analytics/umami.ts'
import { LEDE, MOMENTS, QUESTIONS, SECTIONS, TITLE } from '../../../apps/site/src/components/privacy/privacy.ts'
import { FILES } from '../../../apps/site/src/components/resume/resume.ts'
import { dropPhase3Assets, dropPhase3Pages, PHASE_3_PAGES } from '../../../scripts/site/release-pages.ts'

// The analytics' source (S3.3, S4.1, S4.2, S5.1, S5.3, FR-005–FR-007,
// FR-009): Umami named once, the sender in the one module, the note's facts
// from one source, the release list, and the docs.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const SRC = path.join(ROOT, 'apps/site/src')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')

function filesIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    return statSync(full).isDirectory() ? filesIn(full) : [full]
  })
}

const SOURCES = filesIn(SRC)
  .filter((file) => /\.(astro|ts|tsx|css|mdx?)$/.test(file))
  .map((file) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'), text: readFileSync(file, 'utf8') }))

const UMAMI = 'apps/site/src/components/analytics/umami.ts'
const SENDER = 'apps/site/src/components/analytics/analytics.client.ts'
const NOTE = [LEDE, ...SECTIONS.flatMap((section) => [section.heading, ...(section.paragraphs ?? []), ...(section.items ?? [])])].join(' ')

describe('Umami, named once', () => {
  test("S3.3 FR-001 Umami's host and the website ID are written only in umami.ts, and only the sender calls fetch", () => {
    expect(ORIGIN).toBe('https://gateway.umami.is')
    expect(ENDPOINT).toBe('https://gateway.umami.is/api/send')
    expect(HOST).toBe('bradthome.com')
    for (const { file, text } of SOURCES) {
      if (file !== UMAMI) {
        expect(text, file).not.toMatch(/umami\.is/)
        expect(text, file).not.toContain(WEBSITE_ID)
      }
      if (file !== SENDER) expect(text, file).not.toMatch(/\bfetch\s*\(|sendBeacon|XMLHttpRequest/)
    }
  })

  test('S3.3 FR-009 the website ID is a real UUID from Umami, not the placeholder', () => {
    expect(WEBSITE_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(WEBSITE_ID, 'the real ID replaces the placeholder once Brad has the account (the plan\'s setup)').not.toBe(PLACEHOLDER_ID)
  })

  test("S1.4 FR-001 the résumé roles match spec 015's PDF files exactly", () => {
    expect(Object.fromEntries(Object.entries(FILES).map(([role, file]) => [file, role]))).toEqual(RESUME_ROLES)
  })

  test('S3.1 FR-003 the sender touches no cookie, storage, ID or fingerprinting source', () => {
    for (const file of [SENDER, 'apps/site/src/components/analytics/payload.ts', UMAMI]) {
      expect(read(file), file).not.toMatch(/document\.cookie|localStorage|sessionStorage|indexedDB|crypto\.|canvas|userAgent|identify|distinct/i)
    }
  })

  test('FR-001 exactly the three events, each with its one property', () => {
    expect(EVENTS).toEqual(['work-reached', 'resume-download', 'contact-click'])
    const sender = read(SENDER) + read('apps/site/src/components/ds/email.client.ts')
    expect(sender.match(/track\('([\w-]+)'/g)?.sort()).toEqual(["track('contact-click'", "track('contact-click'", "track('resume-download'", "track('work-reached'"])
  })
})

describe('the one module', () => {
  test("S4.2 D155 the sender is imported by PreviewLink.astro's one script, and the copy button reports to it", () => {
    expect(read('apps/site/src/components/previews/PreviewLink.astro')).toContain("import '../analytics/analytics.client.ts'")
    expect(read('apps/site/src/components/ds/email.client.ts')).toMatch(/track\('contact-click', \{ method: 'copy' \}\)/)
  })

  test("S4.1 FR-005 SC-004 D159 firebase.json's policy names one outside host, in connect-src only", () => {
    const config = JSON.parse(read('firebase.json')) as { hosting: { headers: { source: string; headers: { key: string; value: string }[] }[] } }
    const policy = config.hosting.headers.find((rule) => rule.source === '**')?.headers.find((header) => header.key === 'Content-Security-Policy')?.value ?? ''
    expect(policy).toContain("connect-src 'self' https://gateway.umami.is;")
    expect(policy.match(/https?:\/\/[^\s;']+/g)).toEqual(['https://gateway.umami.is'])
  })
})

describe('the privacy note', () => {
  test('S5.2 S5.3 FR-006 the note says what S5.2 lists, from privacy.ts, with the region and retention from umami.ts', () => {
    expect(TITLE).toBe('Privacy')
    expect(NOTE).toMatch(/Umami Cloud/)
    expect(MOMENTS).toHaveLength(EVENTS.length)
    expect(MOMENTS[0]).toMatch(/work section/)
    expect(MOMENTS[1]).toMatch(/résumé PDF/)
    expect(MOMENTS[2]).toMatch(/email link or the Copy button/)
    expect(NOTE).toMatch(/No cookies/)
    expect(NOTE).toMatch(/nothing is stored in your browser/)
    expect(NOTE).toMatch(/doesn’t keep your network address/)
    expect(NOTE).toMatch(/Do Not Track/)
    expect(NOTE).toMatch(/Global Privacy Control/)
    expect(REGION).toBe('US')
    expect(RETENTION_MONTHS).toBe(6)
    expect(NOTE).toContain(`${REGION} region for ${RETENTION_MONTHS} months`)
    expect(NOTE).toMatch(/Only Brad sees the counts/)
    expect(QUESTIONS.email).toBe('brad@bradthome.com')
  })

  test('S5.2 the note makes no legal claim and names no pronoun for Brad', () => {
    expect(NOTE).not.toMatch(/GDPR|CCPA|complian|anonymous|guarantee|shared with|never sold/i)
    expect(NOTE).toMatch(/No ads, and no tracking across other sites/)
    expect(NOTE).not.toMatch(/\b(he|him|his|she|her)\b/i)
  })

  test('S5.1 FR-006 the design system footer links to /privacy, and the page exists', () => {
    expect(read('apps/site/src/components/ds/Footer.astro')).toMatch(/<a class="ds-footer__privacy" href="\/privacy">\s*Privacy\s*<\/a>/)
    expect(existsSync(path.join(SRC, 'pages/privacy.astro'))).toBe(true)
  })

  test("S2.2 FR-007 SC-002 a release build leaves out the privacy note and the module, so nothing left names Umami", () => {
    expect(PHASE_3_PAGES).toContain('privacy.html')
    const dist = mkdtempSync(path.join(tmpdir(), 'bradthome-018-'))
    try {
      mkdirSync(path.join(dist, '_astro'))
      for (const page of ['index.html', 'vindecoded-agents.html', '404.html', ...PHASE_3_PAGES]) writeFileSync(path.join(dist, page), page)
      writeFileSync(path.join(dist, '_astro', 'PreviewLink.astro_astro_type_script_index_0_lang.abc.js'), 'fetch("https://gateway.umami.is/api/send")')
      dropPhase3Pages(dist)
      dropPhase3Assets(dist)
      expect(readdirSync(dist).sort()).toEqual(['404.html', '_astro', 'index.html', 'vindecoded-agents.html'])
      expect(readdirSync(path.join(dist, '_astro'))).toEqual([])
    } finally {
      rmSync(dist, { recursive: true, force: true })
    }
  })
})

describe('the docs', () => {
  test('FR-009 D155–D159 are recorded and indexed, and the plan marks slice 3.10', () => {
    const index = read('docs/decisions/README.md')
    for (const id of ['0155', '0156', '0157', '0158', '0159']) {
      const file = readdirSync(path.join(ROOT, 'docs/decisions')).find((name) => name.startsWith(`${id}-`))
      expect(file, id).toBeDefined()
      expect(read(`docs/decisions/${file}`)).toMatch(/^status: accepted$/m)
      expect(index).toContain(`[${id}](${file})`)
    }
    expect(read('docs/plan.md')).toMatch(/\| 3\.10 Analytics \|[^\n]*spec 018/)
    expect(read('specs/018-analytics/plan.md')).toMatch(/umami\.ts`[^\n]*website ID/)
  })
})
