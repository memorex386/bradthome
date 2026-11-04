import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
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
    expect(PHASE_3_PAGES).toEqual(['v2.html', 'design-system.html'])
    const dist = mkdtempSync(path.join(tmpdir(), 'bradthome-010-'))
    try {
      mkdirSync(path.join(dist, '_astro'))
      for (const page of ['index.html', 'vindecoded-agents.html', '404.html', 'v2.html', 'design-system.html'])
        writeFileSync(path.join(dist, page), page)
      expect(dropPhase3Pages(dist)).toEqual(['v2.html', 'design-system.html'])
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
        }
      }
    }
    expect(holders).toEqual(['release.yml build pnpm site:build 1'])
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
    expect(read(FILES.agents)).toMatch(/`\/v2`/)
    expect(read(FILES.runbook)).toMatch(/BRADTHOME_RELEASE/)
    expect(read(FILES.runbook)).toMatch(/`\/v2`/)
  })
})
