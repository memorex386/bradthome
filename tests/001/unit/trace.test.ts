import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { createLayout, type Layout } from '../helpers/layout.ts'
import { fixturePath, SCRIPTS } from '../helpers/paths.ts'
import { describeRun, linesOf, runNode, type RunResult } from '../helpers/run.ts'
import { createSandbox, type Sandbox } from '../helpers/sandbox.ts'

// pnpm trace <spec-dir>, run as `node scripts/trace.ts` from the root of a
// scratch folder laid out like the repo. The test files are stored as .txt
// fixtures so that nothing reads them as this spec's own tests.

const SPEC = 'specs/007-demo'
const IDS = ['S1.1', 'S1.2', 'FR-001', 'FR-002', 'SC-001'] as const
const MISSING = /missing|no test|not covered|uncovered|untested/i

function fixtureText(name: string): string {
  return readFileSync(fixturePath('trace', name), 'utf8')
}

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const created of sandboxes.splice(0)) created.cleanup()
})

function fixture(): { where: Layout; trace(): RunResult } {
  const sandbox = createSandbox()
  sandboxes.push(sandbox)
  const where = createLayout(sandbox, {
    [`${SPEC}/spec.md`]: fixtureText('spec.md'),
    'tests/007/unit/a.test.ts': fixtureText('a.test.ts.txt'),
    'tests/007/integration/b.test.ts': fixtureText('b.test.ts.txt'),
  })
  return { where, trace: () => runNode(SCRIPTS.trace, [SPEC], { cwd: where.root, env: sandbox.env }) }
}

function mentions(line: string, id: string): boolean {
  return new RegExp(`(?<![\\w.-])${id.replace('.', '\\.')}(?![\\w.-])`).test(line)
}

function reportedMissing(result: RunResult, id: string): boolean {
  return linesOf(result.stdout + result.stderr).some((line) => mentions(line, id) && MISSING.test(line))
}

describe('pnpm trace', () => {
  test('FR-013 reports each ID that no test name mentions, and exits with an error', () => {
    const { trace } = fixture()
    const result = trace()
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(reportedMissing(result, 'FR-002'), describeRun(result)).toBe(true)
    for (const id of ['S1.1', 'S1.2', 'FR-001', 'SC-001']) {
      expect(reportedMissing(result, id), `${id} is covered\n${describeRun(result)}`).toBe(false)
    }
  })

  test('FR-013 lists every S, FR and SC ID in the spec, and passes once each one leads a test name', () => {
    const { where, trace } = fixture()
    where.write('tests/007/unit/c.test.ts', fixtureText('c.test.ts.txt'))
    where.stage()
    const result = trace()
    expect(result.status, describeRun(result)).toBe(0)
    const output = result.stdout + result.stderr
    for (const id of IDS) {
      expect(linesOf(output).some((line) => mentions(line, id)), `${id} is listed\n${output}`).toBe(true)
    }
  })

  test("FR-013 doesn't count mock states such as G3 or S3 as spec IDs", () => {
    const { where, trace } = fixture()
    where.write('tests/007/unit/c.test.ts', fixtureText('c.test.ts.txt'))
    where.stage()
    const result = trace()
    expect(result.status, describeRun(result)).toBe(0)
    for (const state of ['G3', 'S3', 'C7']) expect(reportedMissing(result, state)).toBe(false)
  })
})
