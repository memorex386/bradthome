import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { PORT, READY } from '../../../scripts/site/serve.ts'
import { repoPath } from '../helpers/serve.ts'

// Spec 043: Lighthouse CI starts the repo's server and loads the home and the
// essay from it, with the LCP budget back at 2.0 s (FR-004, D245).

interface Config {
  ci: {
    collect: {
      staticDistDir?: string
      startServerCommand?: string
      startServerReadyPattern?: string
      url: string[]
      numberOfRuns: number
      settings: { formFactor?: string; screenEmulation?: { mobile?: boolean } }
    }
    assert: { assertions: Record<string, [string, Record<string, unknown>]> }
  }
}

const config = (): Config => JSON.parse(readFileSync(repoPath('lighthouserc.json'), 'utf8')) as Config

describe("spec 043's Lighthouse config", () => {
  test("S1.5 FR-004 Lighthouse CI starts the repo's server, waits for its ready line, and loads the home and the essay from it", () => {
    const { collect } = config().ci
    expect(collect.staticDistDir).toBeUndefined()
    expect(collect.startServerCommand).toBe('node scripts/site/serve.ts')
    expect(READY).toMatch(new RegExp(collect.startServerReadyPattern ?? '^$'))
    expect(collect.url).toEqual([`http://127.0.0.1:${PORT}/index.html`, `http://127.0.0.1:${PORT}/vindecoded-agents.html`])
  })

  test('S2.1 FR-004 the LCP budget is a median of 2,000 ms again, with five phone runs and the other budgets as spec 003 sets them', () => {
    const { collect, assert } = config().ci
    expect(collect.numberOfRuns).toBe(5)
    expect(collect.settings.formFactor).toBe('mobile')
    expect(collect.settings.screenEmulation?.mobile).toBe(true)
    expect(assert.assertions['largest-contentful-paint']).toEqual(['error', { maxNumericValue: 2000, aggregationMethod: 'median' }])
    expect(assert.assertions['cumulative-layout-shift']).toEqual(['error', { maxNumericValue: 0.05, aggregationMethod: 'median' }])
    expect(assert.assertions['total-blocking-time']).toEqual(['error', { maxNumericValue: 150, aggregationMethod: 'median' }])
    expect(assert.assertions['categories:performance']).toEqual(['error', { minScore: 0.95, aggregationMethod: 'median' }])
  })
})
