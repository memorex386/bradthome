import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { CONFIG } from '../helpers/paths.ts'

// Lighthouse CI's config (FR-012, S2.5): five runs on the default phone
// profile, with the median of them asserted against each budget as an error.

type Assertion = [string, { minScore?: number; maxNumericValue?: number; aggregationMethod?: string }?]

interface LighthouseConfig {
  ci?: {
    collect?: { numberOfRuns?: number; settings?: { preset?: string; formFactor?: string; screenEmulation?: { mobile?: boolean } } }
    assert?: { assertions?: Record<string, Assertion | string> }
  }
}

const config = (): LighthouseConfig => JSON.parse(readFileSync(CONFIG.lighthouse, 'utf8')) as LighthouseConfig

const BUDGETS: [string, 'minScore' | 'maxNumericValue', number][] = [
  ['categories:performance', 'minScore', 0.95],
  ['categories:accessibility', 'minScore', 1],
  ['categories:best-practices', 'minScore', 1],
  ['categories:seo', 'minScore', 1],
  ['largest-contentful-paint', 'maxNumericValue', 2000],
  ['cumulative-layout-shift', 'maxNumericValue', 0.05],
  ['total-blocking-time', 'maxNumericValue', 150],
]

const assertion = (key: string): Assertion | undefined => {
  const value = config().ci?.assert?.assertions?.[key]
  return Array.isArray(value) ? value : undefined
}

describe("Lighthouse CI's config", () => {
  test('S2.5 FR-012 runs five times on the phone profile', () => {
    const collect = config().ci?.collect
    expect(collect?.numberOfRuns).toBe(5)
    expect(collect?.settings?.preset ?? 'mobile').not.toBe('desktop')
    expect(collect?.settings?.formFactor ?? 'mobile').toBe('mobile')
    expect(collect?.settings?.screenEmulation?.mobile ?? true).toBe(true)
  })

  test("S2.5 FR-012 SC-001 fails when the median misses any of FR-012's budgets", () => {
    for (const [key, kind, budget] of BUDGETS) {
      const [level, options] = assertion(key) ?? []
      expect(level, key).toBe('error')
      expect(options?.[kind], key).toBe(budget)
      expect(options?.aggregationMethod, key).toMatch(/^median(?:-run)?$/)
    }
  })

  test("S2.5 FR-012 SC-001 the budgets sit inside the charter's limits of 2.5 s, 0.1 and 200 ms", () => {
    const value = (key: string): number => assertion(key)?.[1]?.maxNumericValue ?? Number.POSITIVE_INFINITY
    expect(value('largest-contentful-paint')).toBeLessThan(2500)
    expect(value('cumulative-layout-shift')).toBeLessThan(0.1)
    expect(value('total-blocking-time')).toBeLessThan(200)
  })
})
