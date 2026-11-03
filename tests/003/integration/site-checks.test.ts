import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { describeRun, filledLines, type RunResult } from '../../001/helpers/run.ts'
import { createScratchSite, type ScratchSite } from '../helpers/scratch-site.ts'

// The site's checks, run for real as CI's jobs run them: pnpm lint,
// pnpm format:check, pnpm site:types and pnpm site:html, in a scratch copy of
// the site with one failure planted (FR-008, FR-009, FR-013, FR-014, S2.2,
// S2.6, C4, C5). Each fails, naming the file, the place and the rule, and the
// untouched copy passes. The links job's lychee runs only in CI, so its
// message is checked from findings in unit/messages.test.ts.

let clean: ScratchSite

beforeAll(() => {
  clean = createScratchSite()
})

afterAll(() => {
  clean.sandbox.cleanup()
})

function planted(files: Record<string, string>, command: readonly string[]): RunResult {
  const site = createScratchSite()
  try {
    for (const [file, content] of Object.entries(files)) site.write(file, content)
    return site.pnpm(command)
  } finally {
    site.sandbox.cleanup()
  }
}

/** The lines from the job's ✖ line on. */
function message(result: RunResult, job: string): string[] {
  const lines = filledLines(result.stdout + result.stderr)
  const at = lines.findIndex((line) => line.startsWith(`✖ ${job}  `))
  expect(at, describeRun(result)).toBeGreaterThanOrEqual(0)
  return lines.slice(at)
}

const VALID_PAGE = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '  <head>',
  '    <meta charset="utf-8">',
  '    <title>Brad Thome</title>',
  '  </head>',
  '  <body>',
  '    <main>',
  '      <h1>Brad Thome</h1>',
  '    </main>',
  '  </body>',
  '</html>',
  '',
].join('\n')

describe('the untouched site', () => {
  test('S2.2 FR-008 C4 passes lint', () => {
    const result = clean.pnpm(['lint'])
    expect(result.status, describeRun(result)).toBe(0)
  })

  test('S2.2 FR-008 C4 passes the format check', () => {
    const result = clean.pnpm(['format:check'])
    expect(result.status, describeRun(result)).toBe(0)
  })

  test('S2.2 FR-009 C4 passes the site types', () => {
    const result = clean.pnpm(['site:types'])
    expect(result.status, describeRun(result)).toBe(0)
  })

  test('S2.6 FR-013 C5 a valid built page passes the HTML check', () => {
    const result = planted({ 'apps/site/dist/index.html': VALID_PAGE }, ['site:html'])
    expect(result.status, describeRun(result)).toBe(0)
  })
})

describe('C4: a planted failure fails its command', () => {
  test('S2.2 FR-008 FR-014 C4 a lint error in the site fails pnpm lint, naming the file, line, column and rule', () => {
    const result = planted({ 'apps/site/src/planted.ts': 'const unused = 1\nexport {}\n' }, ['lint'])
    expect(result.status, describeRun(result)).not.toBe(0)
    const lines = message(result, 'lint')
    expect(lines[0]).toMatch(/^✖ lint {2}\d+ problems?$/)
    expect(lines).toContain('  apps/site/src/planted.ts:1:7')
    expect(lines).toContainEqual(expect.stringMatching(/^ {4}\S*no-unused-vars {2}\S/))
    expect(lines.at(-1)).toMatch(/^ {2}Fix: pnpm lint --fix\b/)
  })

  test('S2.2 FR-008 FR-014 C4 a lint error in the scripts fails pnpm lint too', () => {
    const result = planted({ 'scripts/site/planted.ts': 'const unused = 1\nexport {}\n' }, ['lint'])
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(message(result, 'lint')).toContain('  scripts/site/planted.ts:1:7')
  })

  test('S2.2 FR-008 FR-014 C4 an unformatted file fails pnpm format:check, naming the file and the fix', () => {
    const result = planted({ 'scripts/site/planted.ts': 'export const planted = {a:1};\n' }, ['format:check'])
    expect(result.status, describeRun(result)).not.toBe(0)
    const lines = message(result, 'format')
    expect(lines[0]).toBe('✖ format  1 file not formatted')
    expect(lines).toContain('  scripts/site/planted.ts')
    expect(lines.at(-1)).toMatch(/^ {2}Fix: pnpm format\b/)
  })

  test('S2.2 FR-009 FR-014 C4 a type error astro check finds fails pnpm site:types, naming the file, line and error', () => {
    const page = ['---', "const count: number = 'three'", '---', '<p>{count}</p>', ''].join('\n')
    const result = planted({ 'apps/site/src/pages/planted.astro': page }, ['site:types'])
    expect(result.status, describeRun(result)).not.toBe(0)
    const lines = message(result, 'site-types')
    expect(lines[0]).toMatch(/^✖ site-types {2}\d+ errors?$/)
    expect(lines).toContainEqual(expect.stringMatching(/^ {2}apps\/site\/src\/pages\/planted\.astro:2:\d+$/))
    expect(lines).toContainEqual(expect.stringMatching(/^ {4}ts\(2322\) {2}\S/))
    expect(lines.at(-1)).toMatch(/^ {2}Fix: \S/)
  })
})

describe('C5: invalid HTML in the build', () => {
  test('S2.6 FR-013 FR-014 C5 invalid HTML in a built page fails pnpm site:html, naming the page, place and rule', () => {
    const broken = VALID_PAGE.replace('      <h1>Brad Thome</h1>\n', '      <h1>Brad Thome</h1>\n      <p>Unclosed <b>bold</p>\n')
    const result = planted({ 'apps/site/dist/index.html': broken }, ['site:html'])
    expect(result.status, describeRun(result)).not.toBe(0)
    const lines = message(result, 'html')
    expect(lines[0]).toMatch(/^✖ html {2}\d+ problems?$/)
    expect(lines).toContainEqual(expect.stringMatching(/^ {2}(?:apps\/site\/)?dist\/index\.html:10:\d+$/))
    expect(lines).toContainEqual(expect.stringMatching(/^ {4}[\w-]+ {2}\S/))
    expect(lines.at(-1)).toMatch(/^ {2}Fix: \S/)
  })
})
