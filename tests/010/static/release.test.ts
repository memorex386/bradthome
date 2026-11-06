import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { pageBudgetMisses, PAGE_BUDGETS } from '../../../scripts/ci/site-report.ts'
import { dropPhase3Pages, isRelease, PHASE_3_PAGES } from '../../../scripts/site/release-pages.ts'
import { FILES, read } from '../helpers/hero.ts'

// Spec 010's release flag (D127), Lighthouse on /v2, v1's sources and the docs.

interface Step {
  name?: string
  run?: string
  env?: Record<string, string>
}
interface Workflow {
  env?: Record<string, string>
  jobs?: Record<string, { env?: Record<string, string>; steps?: Step[] }>
}

describe('the release flag', () => {
  test('S6.1 FR-008 a release build drops /v2 and /design-system, and keeps every v1 page', () => {
    // Spec 014 adds the role pages, and spec 018 the privacy note.
    expect(PHASE_3_PAGES).toEqual(['v2.html', 'mobile.html', 'fullstack.html', 'ai.html', 'design-system.html', 'privacy.html'])
    const dist = mkdtempSync(path.join(tmpdir(), 'bradthome-010-'))
    try {
      mkdirSync(path.join(dist, '_astro'))
      for (const page of ['index.html', 'vindecoded-agents.html', '404.html', 'v2.html', 'mobile.html', 'fullstack.html', 'ai.html', 'design-system.html'])
        writeFileSync(path.join(dist, page), page)
      expect(dropPhase3Pages(dist)).toEqual(['v2.html', 'mobile.html', 'fullstack.html', 'ai.html', 'design-system.html'])
      expect(readdirSync(dist).sort()).toEqual(['404.html', '_astro', 'index.html', 'vindecoded-agents.html'])
      expect(dropPhase3Pages(dist)).toEqual([])
    } finally {
      rmSync(dist, { recursive: true, force: true })
    }
  })

  test('S6.1 FR-008 only BRADTHOME_RELEASE=1 makes a build a release build', () => {
    expect(isRelease({ BRADTHOME_RELEASE: '1' })).toBe(true)
    for (const value of [undefined, '', '0', 'true']) expect(isRelease({ BRADTHOME_RELEASE: value }), String(value)).toBe(false)
  })

  test("S6.1 FR-008 the site's build runs the integration, and only the release workflow's build step sets the flag", () => {
    expect(read(FILES.astro)).toMatch(/import \{ releasePages \} from '\.\.\/\.\.\/scripts\/site\/release-pages\.ts'/)
    expect(read(FILES.astro)).toMatch(/integrations: \[[^\]]*\breleasePages\b[^\]]*\]/)
    expect(read(FILES.releasePages)).toMatch(/'astro:build:done'/)
    const holders: string[] = []
    for (const file of readdirSync(FILES.workflows).filter((name) => /\.ya?ml$/.test(name))) {
      const workflow = parse(read(path.join(FILES.workflows, file))) as Workflow
      expect(workflow.env ?? {}, file).not.toHaveProperty('BRADTHOME_RELEASE')
      for (const [id, job] of Object.entries(workflow.jobs ?? {})) {
        expect(job.env ?? {}, `${file} ${id}`).not.toHaveProperty('BRADTHOME_RELEASE')
        for (const step of job.steps ?? []) {
          if (step.env?.BRADTHOME_RELEASE !== undefined) holders.push(`${file} ${id} ${step.run ?? ''} ${step.env.BRADTHOME_RELEASE}`)
          // A run line could set it too, inline or through GITHUB_ENV.
          expect(step.run ?? '', `${file} ${id}`).not.toMatch(/BRADTHOME_RELEASE/)
        }
      }
    }
    expect(holders).toEqual(['release.yml build pnpm site:build 1'])
    const named = readdirSync(FILES.workflows).flatMap((name) =>
      (read(path.join(FILES.workflows, name)).match(/BRADTHOME_RELEASE/g) ?? []).map(() => name),
    )
    expect(named).toEqual(['release.yml'])
  })

  test('S6.1 FR-008 a build without the flag keeps both pages, when there is a build to read', () => {
    const dist = path.join(path.dirname(FILES.astro), 'dist')
    if (!existsSync(path.join(dist, 'index.html')) || isRelease()) return
    expect(existsSync(path.join(dist, 'v2.html'))).toBe(true)
    expect(existsSync(path.join(dist, 'design-system.html'))).toBe(true)
  })
})

describe('the checks and v1', () => {
  test("FR-009 S2.5 S6.3 SC-001 Lighthouse collects /v2 after the home page and the essay, with spec 003's budgets", () => {
    const config = JSON.parse(read(FILES.lighthouse)) as {
      ci: { collect: { url: string[] }; assert: { assertions: Record<string, unknown> } }
    }
    expect(config.ci.collect.url).toEqual([
      'http://localhost/index.html',
      'http://localhost/vindecoded-agents.html',
      'http://localhost/v2.html',
    ])
    expect(config.ci.assert.assertions['cumulative-layout-shift']).toEqual([
      'error',
      { maxNumericValue: 0.05, aggregationMethod: 'median' },
    ])
    expect(config.ci.assert.assertions['categories:seo']).toEqual(['error', { minScore: 1, aggregationMethod: 'median' }])
  })

  test("FR-010 S6.2 v1's stylesheet keeps the hero's files out of its Tailwind sources", () => {
    const v1 = read(FILES.v1Tokens)
    for (const glob of ["'./home'", "'../components/home'", "'../pages/v2.astro'"]) expect(v1, glob).toContain(`@source not ${glob};`)
  })

  test('FR-012 the plan, AGENTS.md and the release runbook name /v2 and the release flag', () => {
    expect(read(FILES.plan)).toMatch(/\| 3\.2 Hero \|[^\n]*`\/v2`/)
    for (const file of [FILES.plan, FILES.agents, FILES.runbook]) {
      expect(read(file), file).toMatch(/`\/v2`/)
      expect(read(file), file).toMatch(/BRADTHOME_RELEASE=1/)
    }
  })
})

describe("Lighthouse's own budget for /v2", () => {
  test("S2.5 SC-001 site:lighthouse fails when /v2's median Cumulative Layout Shift is above 0", () => {
    expect(PAGE_BUDGETS['/v2']).toEqual({ 'cumulative-layout-shift': 0 })
    const run = (url: string, cls: number) => ({ requestedUrl: url, audits: { 'cumulative-layout-shift': { numericValue: cls } } })
    const still = [0, 0, 0, 0, 0].map((cls) => run('http://localhost/v2.html', cls))
    expect(pageBudgetMisses(still)).toEqual(new Map())
    const shifting = [0, 0.01, 0.02, 0, 0.03].map((cls) => run('http://localhost/v2.html', cls))
    expect(pageBudgetMisses(shifting)).toEqual(new Map([['/v2', [{ metric: 'cumulative-layout-shift', value: 0.01, budget: 0 }]]]))
    const other = [0.03, 0.03, 0.03].map((cls) => run('http://localhost/index.html', cls))
    expect(pageBudgetMisses([...still, ...other])).toEqual(new Map())
    expect(read(FILES.siteReport)).toMatch(/for \(const \[page, misses\] of pageBudgetMisses\(reports\)\)/)
  })
})
