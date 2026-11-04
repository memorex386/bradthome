import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { jobsOf, type Job, readYaml, runsOf, type Step, stepsOf, type Workflow } from '../../002/helpers/workflows.ts'
import { NEW_JOBS } from '../helpers/ci.ts'
import { CONFIG, CONTAINER, GITHUB, LYCHEE } from '../helpers/paths.ts'

// ci.yml's new jobs (FR-007 to FR-009, FR-013, FR-021, S2.1, C0). Spec 002's
// locked tests check the rules every job and workflow follows (D95); these
// check what each new job runs. The site builds once, in build, and the later
// jobs download its output.

const USES_BUILD = ['e2e', 'lighthouse', 'html', 'links'] as const

const ci = (): Workflow => readYaml<Workflow>(GITHUB.ci)
const scripts = (): Record<string, string> =>
  (JSON.parse(readFileSync(CONFIG.rootPackage, 'utf8')) as { scripts?: Record<string, string> }).scripts ?? {}

function job(id: string): Job {
  const found = jobsOf(ci())[id]
  expect(found, `job ${id}`).toBeDefined()
  return found ?? {}
}

function uses(value: Job, action: string): Step[] {
  return stepsOf(value).filter((step) => step.uses?.startsWith(`actions/${action}@`) === true)
}

describe('the new jobs', () => {
  test('S2.1 FR-007 C0 ci.yml has the eight new jobs, each on the pinned Ubuntu runner, and the gate needs every one', () => {
    const jobs = jobsOf(ci())
    for (const id of NEW_JOBS) {
      expect(jobs[id], id).toBeDefined()
      expect(jobs[id]?.name ?? id, id).toBe(id)
      expect(jobs[id]?.['runs-on'], id).toBe('ubuntu-24.04')
      // Only the four after build skip, and only on a draft, until it's ready (D100). ci.yml never runs on an edit (D115).
      expect(jobs[id]?.if, id).toBe(USES_BUILD.some((later) => later === id) ? 'github.event.pull_request.draft != true' : undefined)
    }
    const needs = job('gate').needs
    for (const id of NEW_JOBS) expect(Array.isArray(needs) ? needs : [needs], id).toContain(id)
  })

  test('S2.1 FR-007 FR-021 the new jobs hold no write permission and get no secret', () => {
    for (const id of NEW_JOBS) {
      expect(JSON.stringify(job(id).permissions ?? {}), id).not.toMatch(/write/)
      expect(JSON.stringify(job(id)), id).not.toMatch(/\bsecrets\./)
    }
  })

  test('FR-008 C4 lint and format run their package commands, over the site and the scripts', () => {
    expect(runsOf(job('lint'))).toMatch(/\bpnpm (?:run )?lint\b/)
    expect(runsOf(job('format'))).toMatch(/\bpnpm (?:run )?format:check\b/)
    const all = scripts()
    for (const name of ['lint', 'format:check']) {
      expect(all[name], name).toMatch(/apps\/site|site-report/)
    }
    expect(`${all.lint ?? ''} ${all['format:check'] ?? ''}`).not.toMatch(/\btests\//)
  })

  test('FR-008 ESLint uses the Astro plugin, and Prettier writes no semicolons and single quotes', () => {
    const eslint = readFileSync(CONFIG.eslint, 'utf8')
    expect(eslint).toMatch(/eslint-plugin-astro/)
    expect(eslint).toMatch(/typescript-eslint/)
    const prettier = JSON.parse(readFileSync(CONFIG.prettier, 'utf8')) as { semi?: boolean; singleQuote?: boolean; plugins?: string[] }
    expect(prettier.semi).toBe(false)
    expect(prettier.singleQuote).toBe(true)
    expect(prettier.plugins ?? []).toContain('prettier-plugin-astro')
  })

  test('FR-009 C4 site-types runs astro check', () => {
    expect(runsOf(job('site-types'))).toMatch(/\bpnpm (?:run )?site:types\b/)
    expect(scripts()['site:types']).toMatch(/astro check|\bcheck\b/)
  })

  test('S2.1 FR-007 C6 build builds the site once, checks the CSP header is current, and uploads it as the site artifact', () => {
    const runs = runsOf(job('build'))
    expect(runs).toMatch(/\bpnpm (?:run )?site:build\b/)
    expect(runs).toMatch(/\bpnpm (?:run )?csp --check\b/)
    const upload = uses(job('build'), 'upload-artifact')
    expect(upload).toHaveLength(1)
    expect(upload[0]?.with?.name).toBe('site')
    expect(String(upload[0]?.with?.path)).toMatch(/apps\/site\/dist/)
  })

  test('S2.1 FR-007 the later jobs use that build and never build again', () => {
    for (const id of USES_BUILD) {
      const value = job(id)
      const needs = Array.isArray(value.needs) ? value.needs : [value.needs]
      expect(needs, id).toContain('build')
      const download = uses(value, 'download-artifact')
      expect(download, id).toHaveLength(1)
      expect(download[0]?.with?.name, id).toBe('site')
      expect(runsOf(value), id).not.toMatch(/site:build|astro build/)
    }
  })

  test('FR-007 FR-010 FR-021 e2e and lighthouse run in the pinned Playwright container, by digest', () => {
    for (const id of ['e2e', 'lighthouse']) {
      const container = (job(id) as Job & { container?: unknown }).container
      const image = typeof container === 'string' ? container : String((container as { image?: unknown } | undefined)?.image ?? '')
      expect(image, id).toMatch(CONTAINER)
    }
    expect(runsOf(job('e2e'))).toMatch(/\bpnpm (?:run )?test:e2e\b/)
    expect(runsOf(job('lighthouse'))).toMatch(/\bpnpm (?:run )?site:lighthouse\b/)
  })

  test("S2.2 S2.5 S2.6 FR-014 C3 C4 C5 each site check prints its findings through site-report, in the mocks' shape", () => {
    const checks: [string, string][] = [
      ['lint', 'lint'],
      ['format', 'format:check'],
      ['site-types', 'site:types'],
      ['lighthouse', 'site:lighthouse'],
      ['html', 'site:html'],
      ['links', 'site:links'],
    ]
    for (const [id, script] of checks) {
      expect(`${runsOf(job(id))}\n${scripts()[script] ?? ''}`, `${id} runs ${script} through site-report`).toMatch(/\bsite-report\b/)
    }
  })

  test('FR-013 C5 html runs html-validate over every built page', () => {
    expect(runsOf(job('html'))).toMatch(/\bpnpm (?:run )?site:html\b/)
    expect(scripts()['site:html']).toMatch(/html-validate|site-report/)
    const config = JSON.parse(readFileSync(CONFIG.htmlValidate, 'utf8')) as { extends?: string[] }
    expect(config.extends ?? []).toEqual(expect.arrayContaining([expect.stringMatching(/^html-validate:(?:recommended|standard)$/)]))
  })

  test('FR-013 FR-021 C5 links runs the pinned lychee offline over the build, checking anchors too', () => {
    const value = job('links')
    const text = JSON.stringify(value)
    expect(text).toContain(LYCHEE.version)
    expect(text).toContain(LYCHEE.sha256)
    expect(text).toMatch(/sha256sum|shasum -a 256/)
    expect(runsOf(value)).toMatch(/\bpnpm (?:run )?site:links\b/)
    // Offline comes from the command line, not lychee.toml, which the nightly run reads too.
    expect(`${scripts()['site:links'] ?? ''}\n${runsOf(value)}`).toMatch(/--offline\b/)
    const lychee = readFileSync(CONFIG.lychee, 'utf8')
    expect(lychee).not.toMatch(/^\s*offline\s*=/m)
    const settings = [scripts()['site:links'] ?? '', lychee].join('\n')
    expect(settings).toMatch(/--include-fragments\b|^\s*include_fragments\s*=\s*true/m)
    expect(settings).toMatch(/--root-dir\b|^\s*root_dir\s*=/m)
  })
})
