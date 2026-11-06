import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { PIP, REQUIREMENTS } from '../../../scripts/site/printer.ts'
import { pdfMessage, PDF_PROFILES, VERAPDF, verapdfFailures } from '../../../scripts/ci/site-report.ts'
import { IMAGE } from '../../../scripts/site/visual.ts'

// Spec 015's printer and its checks, read from the source: WeasyPrint pinned
// by hash, the print script's standards, the build jobs in the pinned
// container, and veraPDF in the html job.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (...parts: string[]): string => readFileSync(path.join(ROOT, ...parts), 'utf8')

interface Step {
  name?: string
  run?: string
  uses?: string
}
interface Job {
  'runs-on'?: string
  container?: { image?: string } | string
  steps?: Step[]
}
const workflow = (file: string): Record<string, Job> => (parse(read('.github', 'workflows', file)) as { jobs: Record<string, Job> }).jobs
const runs = (job: Job | undefined): string[] => (job?.steps ?? []).map((step) => step.run ?? '').filter((run) => run !== '')
const imageOf = (job: Job | undefined): string => (typeof job?.container === 'string' ? job.container : (job?.container?.image ?? ''))

describe('the printer', () => {
  test('S4.5 FR-005 every package WeasyPrint needs is pinned by version and hash', () => {
    const text = readFileSync(REQUIREMENTS, 'utf8')
    const entries = text
      .replace(/\s*\\\r?\n\s*/g, ' ')
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '' && !line.startsWith('#'))
    expect(entries.length).toBeGreaterThanOrEqual(10)
    for (const entry of entries) expect(entry, entry).toMatch(/^[a-z0-9-]+==[\w.]+ --hash=sha256:[0-9a-f]{64}$/)
    expect(entries.some((entry) => entry.startsWith('weasyprint==70.0 '))).toBe(true)
  })

  test('S4.5 FR-005 pip comes from its pinned zipapp, checked by hash, and installs with --require-hashes', () => {
    expect(PIP.url).toBe(`https://bootstrap.pypa.io/pip/zipapp/pip-${PIP.version}.pyz`)
    expect(PIP.sha256).toMatch(/^[0-9a-f]{64}$/)
    const printer = read('scripts', 'site', 'printer.ts')
    expect(printer).toMatch(/'--require-hashes'/)
    expect(printer).toMatch(/'--no-deps'/)
    expect(printer).toMatch(/sha256\(pip\) !== PIP\.sha256/)
  })

  test('S3.1 FR-004 print.py writes PDF/A-2a, adds PDF/UA-1\'s identification, and loads nothing from outside the build', () => {
    const script = read('scripts', 'site', 'resume', 'print.py')
    expect(script).toMatch(/pdf_variant='pdf\/a-2a'/)
    expect(script).toMatch(/pdfuaid/)
    expect(script).toMatch(/set\(f'\{\{\{PDFUAID\}\}\}part', '1'\)/)
    expect(script).toMatch(/allowed_protocols=\('file',\)/)
    expect(script).toMatch(/is_relative_to\(self\._root\)/)
    expect(script).not.toMatch(/dcterms\.(?:created|modified)|datetime|uuid/)
    expect(script).toMatch(/os\.environ\.setdefault\('SOURCE_DATE_EPOCH', '0'\)/)
  })
})

describe('CI', () => {
  test("S4.5 FR-005 ci's, the preview's and next's build jobs run in the pinned container and install the printer before building", () => {
    for (const file of ['ci.yml', 'preview.yml', 'next.yml']) {
      const build = workflow(file).build
      expect(build?.['runs-on'], file).toBe('ubuntu-24.04')
      expect(imageOf(build), file).toBe(IMAGE)
      const steps = runs(build)
      const install = steps.findIndex((run) => /\bpnpm printer:install\b/.test(run))
      const site = steps.findIndex((run) => /\bpnpm site:build\b/.test(run))
      expect(install, file).toBeGreaterThanOrEqual(0)
      expect(install, file).toBeLessThan(site)
    }
  })

  test("S4.3 since v2.0 the release build is ci / build's: the pinned container, the printer and the CSP check, with no flag (spec 019)", () => {
    const build = workflow('release.yml').build
    expect(build?.container).toEqual(workflow('ci.yml').build?.container)
    expect(runs(build)).toEqual(runs(workflow('ci.yml').build))
    expect(read('.github', 'workflows', 'release.yml')).not.toMatch(/BRADTHOME_RELEASE/)
  })

  test("S3.1 S4.5 SC-002 FR-006 the html job runs veraPDF's pinned image against PDF/UA-1 and PDF/A-2a", () => {
    expect(runs(workflow('ci.yml').html).join('\n')).toMatch(/\bpnpm site:pdf\b/)
    const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts
    expect(scripts['site:pdf']).toBe('node scripts/ci/site-report.ts pdf')
    expect(scripts['printer:install']).toBe('node scripts/site/printer.ts')
    expect(VERAPDF.image).toMatch(new RegExp(`^verapdf/cli:v${VERAPDF.version.replaceAll('.', '\\.')}@sha256:[0-9a-f]{64}$`))
    expect(PDF_PROFILES.map((profile) => profile.flag)).toEqual(['ua1', '2a'])
  })

  test("S3.1 FR-006 veraPDF's report reads as failures by file and standard, in the mocks' message shape", () => {
    const output = ['PASS /data/brad-thome-mobile.pdf ua1', 'FAIL /data/brad-thome-applied-ai.pdf ua1', '  FAIL 7.18.5-2', '  FAIL 7.1-8', ''].join('\n')
    const failures = verapdfFailures(output, 'PDF/UA-1')
    expect(failures).toEqual([{ file: 'brad-thome-applied-ai.pdf', standard: 'PDF/UA-1', rules: ['7.18.5-2', '7.1-8'] }])
    const message = pdfMessage(failures)
    expect(message[0]).toBe('✖ pdf  1 check fails')
    expect(message[1]).toBe('  brad-thome-applied-ai.pdf  PDF/UA-1: 7.18.5-2, 7.1-8')
    expect(message.at(-1)).toMatch(/^ {2}Fix: /)
    expect(verapdfFailures('PASS /data/a.pdf 2a\n', 'PDF/A-2a')).toEqual([])
  })

  test('FR-005 pnpm test:visual installs the printer before it builds', () => {
    const visual = read('scripts', 'site', 'visual.ts')
    expect(visual.indexOf("'pnpm printer:install'")).toBeGreaterThan(0)
    expect(visual.indexOf("'pnpm printer:install'")).toBeLessThan(visual.indexOf("'pnpm site:build'"))
  })
})
