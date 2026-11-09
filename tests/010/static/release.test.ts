import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { pageBudgetMisses, PAGE_BUDGETS } from '../../../scripts/ci/site-report.ts'
import { FILES, read } from '../helpers/hero.ts'

// Spec 010's release flag (D127), retired by spec 019, Lighthouse on the home, v1's sources and the docs.

interface Workflow {
  env?: Record<string, string>
}

describe('the release flag, retired at v2.0 (spec 019)', () => {
  test("S6.1 FR-008 phase 3's flag is gone: only release.yml names BRADTHOME_RELEASE, for spec 022's chat (D190), and the site's build runs no release integration", () => {
    expect(existsSync(path.join(path.dirname(FILES.siteReport), '..', 'site', 'release-pages.ts'))).toBe(false)
    expect(read(FILES.astro)).not.toMatch(/releasePages|release-pages/)
    const named = readdirSync(FILES.workflows).filter((name) => /BRADTHOME_RELEASE/.test(read(path.join(FILES.workflows, name))))
    expect(named).toEqual(['release.yml'])
    for (const file of readdirSync(FILES.workflows).filter((name) => /\.ya?ml$/.test(name))) {
      const workflow = parse(read(path.join(FILES.workflows, file))) as Workflow
      expect(workflow.env ?? {}, file).not.toHaveProperty('BRADTHOME_RELEASE')
    }
  })

  test('S6.1 FR-008 the home is the new home at /, when there is a build to read (D162)', () => {
    const dist = path.join(path.dirname(FILES.astro), 'dist')
    if (!existsSync(path.join(dist, 'index.html'))) return
    expect(existsSync(path.join(dist, 'v2.html'))).toBe(false)
    expect(existsSync(path.join(dist, 'design-system.html'))).toBe(true)
    expect(readFileSync(path.join(dist, 'index.html'), 'utf8')).toMatch(/id="hopper"/)
  })
})

describe('the checks and v1', () => {
  test("FR-009 S2.5 S6.3 SC-001 Lighthouse collects the home, which is the new home since v2.0, and the essay, with spec 003's budgets", () => {
    const config = JSON.parse(read(FILES.lighthouse)) as {
      ci: { collect: { url: string[] }; assert: { assertions: Record<string, unknown> } }
    }
    expect(config.ci.collect.url).toEqual(['http://localhost/index.html', 'http://localhost/vindecoded-agents.html'])
    expect(config.ci.assert.assertions['cumulative-layout-shift']).toEqual([
      'error',
      { maxNumericValue: 0.05, aggregationMethod: 'median' },
    ])
    expect(config.ci.assert.assertions['categories:seo']).toEqual(['error', { minScore: 1, aggregationMethod: 'median' }])
  })

  test("FR-010 S6.2 v1's stylesheet keeps the hero's files out of its Tailwind sources", () => {
    const v1 = read(FILES.v1Tokens)
    for (const glob of ["'./home'", "'../components/home'"]) expect(v1, glob).toContain(`@source not ${glob};`)
  })

  test("FR-012 the plan still records /v2 for slice 3.2, and AGENTS.md and the release runbook name the release flag only for spec 022's chat (spec 019, D190)", () => {
    expect(read(FILES.plan)).toMatch(/\| 3\.2 Hero \|[^\n]*`\/v2`/)
    for (const file of [FILES.agents, FILES.runbook]) {
      for (const line of read(file).split('\n').filter((text) => /BRADTHOME_RELEASE/.test(text))) expect(line, file).toMatch(/0190-a-release-flag-keeps-the-chat-off-live/)
    }
  })
})

describe("Lighthouse's own budget for the home", () => {
  test("S2.5 SC-001 site:lighthouse fails when the home's median Cumulative Layout Shift is above 0", () => {
    expect(PAGE_BUDGETS['/']).toEqual({ 'cumulative-layout-shift': 0 })
    const run = (url: string, cls: number) => ({ requestedUrl: url, audits: { 'cumulative-layout-shift': { numericValue: cls } } })
    const still = [0, 0, 0, 0, 0].map((cls) => run('http://localhost/index.html', cls))
    expect(pageBudgetMisses(still)).toEqual(new Map())
    const shifting = [0, 0.01, 0.02, 0, 0.03].map((cls) => run('http://localhost/index.html', cls))
    expect(pageBudgetMisses(shifting)).toEqual(new Map([['/', [{ metric: 'cumulative-layout-shift', value: 0.01, budget: 0 }]]]))
    const other = [0.03, 0.03, 0.03].map((cls) => run('http://localhost/vindecoded-agents.html', cls))
    expect(pageBudgetMisses([...still, ...other])).toEqual(new Map())
    expect(read(FILES.siteReport)).toMatch(/for \(const \[page, misses\] of pageBudgetMisses\(reports\)\)/)
  })
})
