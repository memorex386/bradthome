import { describe, expect, test } from 'vitest'
import { loadSiteReport } from '../helpers/modules.ts'

// Each failing job's message (FR-014, C1–C6): what failed, where, and how to
// fix it, in the shape of spec 001's messages. A header line names the job and
// the count, the places follow, indented, and the fix comes last. The mocks'
// numbers are made up, so the counts here follow the findings given.

const FIX = /^ {2}Fix: \S/

describe('C1: an accessibility violation', () => {
  test("S2.3 FR-014 C1 names the rule, the WCAG criterion, the element and the state, in the mock's words", async () => {
    const { a11yMessage } = await loadSiteReport()
    const lines = a11yMessage([
      { state: 'P2 home, phone, dark', rule: 'color-contrast', wcag: '1.4.3', target: 'a[href="https://github.com/…"]', detail: '3.9:1, needs 4.5:1' },
    ])
    expect(lines.slice(0, 4)).toEqual([
      '✖ e2e  1 accessibility violation',
      '  P2 home, phone, dark',
      '    color-contrast (WCAG 2.2 AA, 1.4.3)',
      '    a[href="https://github.com/…"]  3.9:1, needs 4.5:1',
    ])
    expect(lines.at(-1)).toMatch(/^ {2}Fix: pnpm test:e2e\b/)
  })

  test('S2.3 FR-014 C1 counts every violation, and lists each state once with its own violations', async () => {
    const { a11yMessage } = await loadSiteReport()
    const lines = a11yMessage([
      { state: 'P1 home, phone, light', rule: 'target-size', wcag: '2.5.8', target: 'a', detail: '20×20 px, needs 24×24 px' },
      { state: 'P1 home, phone, light', rule: 'link-name', wcag: '2.4.4', target: 'a.icon', detail: 'no text' },
      { state: 'P4 home, desktop, dark', rule: 'color-contrast', wcag: '1.4.3', target: 'p', detail: '4.1:1, needs 4.5:1' },
    ])
    expect(lines[0]).toBe('✖ e2e  3 accessibility violations')
    expect(lines.filter((line) => line === '  P1 home, phone, light')).toHaveLength(1)
    expect(lines).toContain('    target-size (WCAG 2.2 AA, 2.5.8)')
    expect(lines.indexOf('  P4 home, desktop, dark')).toBeGreaterThan(lines.indexOf('    a.icon  no text'))
    expect(lines.at(-1)).toMatch(FIX)
  })
})

describe('C2: a visual snapshot differs', () => {
  test("S2.4 FR-014 C2 names the state, the pixels that differ and the diff image, in the mock's words", async () => {
    const { snapshotMessage } = await loadSiteReport()
    expect(snapshotMessage([{ state: 'P3 home, desktop, light', pixels: 1284, diff: 'P3-diff.png' }])).toEqual([
      '✖ e2e  1 snapshot differs',
      '  P3 home, desktop, light',
      '    1,284 pixels differ (no tolerance)',
      "    diff: the run's artifacts, P3-diff.png",
      '  Fix: if the change is intended, run pnpm test:visual --update in the container,',
      '  and commit the new baseline with the spec.',
    ])
  })

  test('S2.4 FR-014 C2 one pixel is enough, and two snapshots are both named', async () => {
    const { snapshotMessage } = await loadSiteReport()
    const lines = snapshotMessage([
      { state: 'P1 home, phone, light', pixels: 1, diff: 'P1-diff.png' },
      { state: 'P2 home, phone, dark', pixels: 2, diff: 'P2-diff.png' },
    ])
    expect(lines[0]).toBe('✖ e2e  2 snapshots differ')
    expect(lines).toContain('    1 pixel differs (no tolerance)')
    expect(lines).toContain('    2 pixels differ (no tolerance)')
    expect(lines).toContain("    diff: the run's artifacts, P2-diff.png")
  })
})

describe('C3: a Lighthouse budget is missed', () => {
  test("S2.5 FR-014 C3 names each metric, its median and its budget, in the mock's words", async () => {
    const { lighthouseMessage } = await loadSiteReport()
    expect(
      lighthouseMessage('/', 5, [
        { metric: 'largest-contentful-paint', value: 2300, budget: 2000 },
        { metric: 'performance', value: 0.91, budget: 0.95 },
      ]),
    ).toEqual([
      '✖ lighthouse  2 budgets missed (median of 5 runs)',
      '  / on a phone profile',
      '    largest-contentful-paint  2.3 s, budget 2.0 s',
      '    performance               91, budget 95',
      "  Fix: the report is in the run's artifacts.",
    ])
  })

  test('S2.5 FR-014 C3 shows layout shift as a number and blocking time in milliseconds', async () => {
    const { lighthouseMessage } = await loadSiteReport()
    const lines = lighthouseMessage('/', 5, [
      { metric: 'cumulative-layout-shift', value: 0.08, budget: 0.05 },
      { metric: 'total-blocking-time', value: 180, budget: 150 },
    ])
    expect(lines[0]).toBe('✖ lighthouse  2 budgets missed (median of 5 runs)')
    expect(lines).toContainEqual(expect.stringMatching(/^ {4}cumulative-layout-shift {2,}0\.08, budget 0\.05$/))
    expect(lines).toContainEqual(expect.stringMatching(/^ {4}total-blocking-time {2,}180 ms, budget 150 ms$/))
  })

  test('S2.5 FR-014 C3 one miss reads in the singular', async () => {
    const { lighthouseMessage } = await loadSiteReport()
    const lines = lighthouseMessage('/', 5, [{ metric: 'seo', value: 0.92, budget: 1 }])
    expect(lines[0]).toBe('✖ lighthouse  1 budget missed (median of 5 runs)')
    expect(lines).toContain('    seo  92, budget 100')
  })
})

describe('C4: lint, format or site types fail', () => {
  test("S2.2 FR-014 C4 lint names the file, line, column and rule, in the mock's words", async () => {
    const { lintMessage } = await loadSiteReport()
    expect(
      lintMessage([
        { file: 'apps/site/src/pages/index.astro', line: 12, column: 5, rule: 'astro/no-unused-css-selector', message: '.hero' },
        { file: 'scripts/site/csp.ts', line: 3, column: 7, rule: '@typescript-eslint/no-unused-vars', message: "'x' is assigned a value but never used." },
      ]),
    ).toEqual([
      '✖ lint  2 problems',
      '  apps/site/src/pages/index.astro:12:5',
      '    astro/no-unused-css-selector  .hero',
      '  scripts/site/csp.ts:3:7',
      "    @typescript-eslint/no-unused-vars  'x' is assigned a value but never used.",
      "  Fix: pnpm lint --fix, or remove the rule's cause.",
    ])
  })

  test('S2.2 FR-014 C4 format names each file Prettier would change, and how to fix it', async () => {
    const { formatMessage } = await loadSiteReport()
    const one = formatMessage(['scripts/ci/gate.ts'])
    expect(one[0]).toBe('✖ format  1 file not formatted')
    expect(one[1]).toBe('  scripts/ci/gate.ts')
    expect(one.at(-1)).toMatch(/^ {2}Fix: pnpm format\b/)
    expect(formatMessage(['a.ts', 'b.astro'])[0]).toBe('✖ format  2 files not formatted')
  })

  test('S2.2 FR-014 C4 site types names the file, line, column and TypeScript error', async () => {
    const { siteTypesMessage } = await loadSiteReport()
    const lines = siteTypesMessage([
      { file: 'apps/site/src/pages/index.astro', line: 2, column: 7, rule: 'ts(2322)', message: "Type 'string' is not assignable to type 'number'." },
    ])
    expect(lines.slice(0, 3)).toEqual([
      '✖ site-types  1 error',
      '  apps/site/src/pages/index.astro:2:7',
      "    ts(2322)  Type 'string' is not assignable to type 'number'.",
    ])
    expect(lines.at(-1)).toMatch(/^ {2}Fix: pnpm site:types\b/)
  })
})

describe('C5: invalid HTML or a broken internal link', () => {
  test("S2.6 FR-014 C5 links names the page and the link that points to nothing, in the mock's words", async () => {
    const { linksMessage } = await loadSiteReport()
    expect(linksMessage([{ file: 'dist/index.html', link: '/essay#intro', reason: 'no such page' }])).toEqual([
      '✖ links  1 broken internal link',
      '  dist/index.html',
      '    /essay#intro  no such page',
      '  Fix: point the link at a page the build has.',
    ])
  })

  test('S2.6 FR-014 C5 links lists each page once, with every broken link on it', async () => {
    const { linksMessage } = await loadSiteReport()
    const lines = linksMessage([
      { file: 'dist/index.html', link: '#missing', reason: 'no such anchor' },
      { file: 'dist/index.html', link: '/gone', reason: 'no such page' },
      { file: 'dist/404.html', link: '/#nowhere', reason: 'no such anchor' },
    ])
    expect(lines[0]).toBe('✖ links  3 broken internal links')
    expect(lines.filter((line) => line === '  dist/index.html')).toHaveLength(1)
    expect(lines).toContain('    #missing  no such anchor')
    expect(lines).toContain('  dist/404.html')
  })

  test('S2.6 FR-014 C5 html names the page, line, column and rule', async () => {
    const { htmlMessage } = await loadSiteReport()
    const lines = htmlMessage([{ file: 'dist/index.html', line: 9, column: 3, rule: 'close-order', message: 'Unexpected close-tag, expected opening tag.' }])
    expect(lines.slice(0, 3)).toEqual(['✖ html  1 problem', '  dist/index.html:9:3', '    close-order  Unexpected close-tag, expected opening tag.'])
    expect(lines.at(-1)).toMatch(FIX)
  })
})

describe('C6: a security header is missing', () => {
  test("S4.1 FR-014 C6 names the path and the header, in the mock's words", async () => {
    const { headersMessage } = await loadSiteReport()
    expect(headersMessage([{ path: '/', header: 'Content-Security-Policy' }])).toEqual([
      '✖ e2e  1 security header missing',
      '  /  Content-Security-Policy',
      "  Fix: firebase.json's headers, and Astro's CSP hashes for any new inline script.",
    ])
  })

  test('S4.1 FR-014 C6 two missing headers are both named, on the 404 page too', async () => {
    const { headersMessage } = await loadSiteReport()
    const lines = headersMessage([
      { path: '/', header: 'Permissions-Policy' },
      { path: '/no-such-page', header: 'Strict-Transport-Security' },
    ])
    expect(lines[0]).toBe('✖ e2e  2 security headers missing')
    expect(lines).toContainEqual(expect.stringMatching(/^ {2}\/no-such-page {2,}Strict-Transport-Security$/))
  })
})
