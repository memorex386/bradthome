import { pathToFileURL } from 'node:url'
import { describe, expect, test } from 'vitest'
import { FILES } from '../helpers/essay.ts'

// site-report's Lighthouse grouping (FR-010, S4.2): with two pages in the
// runs, each missed budget is reported under its own page.

interface Miss {
  metric: string
  value: number
  budget: number
}

interface Assertion {
  level?: string
  auditId?: string
  auditProperty?: string
  actual?: number
  expected?: number
  url?: string
}

interface SiteReport {
  lighthousePage(url: string): string
  lighthouseByPage(results: readonly Assertion[]): Map<string, Miss[]>
}

const load = async (): Promise<SiteReport> => (await import(pathToFileURL(FILES.siteReport).href)) as SiteReport

describe("Lighthouse's pages", () => {
  test("FR-010 S4.2 an LHCI address becomes the page's path, as Hosting serves it", async () => {
    const { lighthousePage } = await load()
    expect(lighthousePage('http://localhost/index.html')).toBe('/')
    expect(lighthousePage('http://localhost/vindecoded-agents.html')).toBe('/vindecoded-agents')
    expect(lighthousePage('')).toBe('/')
  })

  test('FR-010 S4.2 SC-002 misses are grouped by page, and warnings are left out', async () => {
    const { lighthouseByPage } = await load()
    const groups = lighthouseByPage([
      { level: 'error', auditId: 'categories', auditProperty: 'seo', actual: 0.92, expected: 1, url: 'http://localhost/vindecoded-agents.html' },
      { level: 'error', auditId: 'total-blocking-time', actual: 180, expected: 150, url: 'http://localhost/index.html' },
      { level: 'warn', auditId: 'cumulative-layout-shift', actual: 0.06, expected: 0.05, url: 'http://localhost/index.html' },
    ])
    expect([...groups.keys()]).toEqual(['/vindecoded-agents', '/'])
    expect(groups.get('/vindecoded-agents')).toEqual([{ metric: 'seo', value: 0.92, budget: 1 }])
    expect(groups.get('/')).toEqual([{ metric: 'total-blocking-time', value: 180, budget: 150 }])
  })
})
