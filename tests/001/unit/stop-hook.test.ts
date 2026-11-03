import { describe, expect, test, vi } from 'vitest'
import { decide } from '../../../.claude/hooks/stop.ts'
import { stop } from '../helpers/hook-input.ts'
import { C7 } from '../helpers/messages.ts'
import { slash } from '../helpers/paths.ts'

// The Stop hook's decision logic, with canned tsc and Vitest output. The hook
// is given the paths that changed in the turn and a way to run a package
// script, and answers Claude Code's Stop hook protocol.

type Script = 'typecheck' | 'test:unit'
type Result = { status: number; output: string }

const ROOT = process.platform === 'win32' ? 'C:\\work\\bradthome' : '/work/bradthome'

const TYPES_PASS: Result = { status: 0, output: '' }
const TYPES_FAIL: Result = {
  status: 2,
  output: "scripts/private-terms.ts(41,7): error TS2322: Type 'string | undefined' is not assignable to type 'string'.\n",
}

interface SuiteResult {
  file: string
  passed?: number
  failed?: number
  loadError?: string
}

/** Vitest's JSON report, in the Jest-compatible shape its json reporter writes. */
function vitestReport(suites: readonly SuiteResult[]): Result {
  const testResults = suites.map((suite) => {
    const assertions = [
      ...Array.from({ length: suite.passed ?? 0 }, (_, n) => ({ title: `passes ${n + 1}`, status: 'passed' })),
      ...Array.from({ length: suite.failed ?? 0 }, (_, n) => ({ title: `fails ${n + 1}`, status: 'failed' })),
    ].map((assertion) => ({
      ancestorTitles: [],
      fullName: assertion.title,
      status: assertion.status,
      title: assertion.title,
      duration: 3,
      failureMessages: assertion.status === 'failed' ? ['AssertionError: expected true to be false'] : [],
      meta: {},
    }))
    const failed = (suite.failed ?? 0) > 0 || suite.loadError !== undefined
    return {
      assertionResults: assertions,
      startTime: 1793000000000,
      endTime: 1793000000100,
      status: failed ? 'failed' : 'passed',
      message: suite.loadError ?? '',
      name: `${slash(ROOT)}/${suite.file}`,
    }
  })
  const failedTests = suites.reduce((sum, suite) => sum + (suite.failed ?? 0), 0)
  const passedTests = suites.reduce((sum, suite) => sum + (suite.passed ?? 0), 0)
  const failedSuites = testResults.filter((suite) => suite.status === 'failed').length
  const report = {
    numTotalTestSuites: suites.length,
    numPassedTestSuites: suites.length - failedSuites,
    numFailedTestSuites: failedSuites,
    numPendingTestSuites: 0,
    numTotalTests: failedTests + passedTests,
    numPassedTests: passedTests,
    numFailedTests: failedTests,
    numPendingTests: 0,
    numTodoTests: 0,
    snapshot: { added: 0, failure: false, filesAdded: 0, filesRemoved: 0, filesUnmatched: 0, filesUpdated: 0, total: 0 },
    startTime: 1793000000000,
    success: failedSuites === 0,
    testResults,
  }
  return { status: failedSuites === 0 ? 0 : 1, output: `${JSON.stringify(report, null, 2)}\n` }
}

const TESTS_PASS = vitestReport([{ file: 'tests/private-terms.test.ts', passed: 5 }])
const TESTS_FAIL = vitestReport([
  { file: 'tests/private-terms.test.ts', passed: 3, failed: 2 },
  { file: 'tests/addresses.test.ts', passed: 4 },
])

function runner(results: Record<Script, Result>) {
  return vi.fn((script: Script): Result => results[script])
}

async function answer(changedPaths: string[], results: Record<Script, Result>, stopHookActive = false) {
  const run = runner(results)
  const output = await decide(stop(ROOT, 'stop-session', stopHookActive), { changedPaths, run })
  return { output: output ?? undefined, run }
}

function reasonLines(output: unknown): string[] {
  const reason = (output as { reason?: unknown } | undefined)?.reason
  if (typeof reason !== 'string') throw new Error('expected a reason')
  return reason.replace(/\n+$/, '').split('\n')
}

describe('C7: the Stop hook sends the agent back', () => {
  test("C7 S5.1 FR-022 sends the agent back with the type and test failures, in the mock's words", async () => {
    const { output } = await answer(['scripts/private-terms.ts'], { typecheck: TYPES_FAIL, 'test:unit': TESTS_FAIL })
    expect(output).toMatchObject({ decision: 'block' })
    expect(reasonLines(output)).toEqual(C7)
  })

  test('C7 S5.1 FR-022 sends the agent back when only the type check fails', async () => {
    const { output } = await answer(['scripts/private-terms.ts'], { typecheck: TYPES_FAIL, 'test:unit': TESTS_PASS })
    expect(output).toMatchObject({ decision: 'block' })
    const lines = reasonLines(output)
    expect(lines).toContain(C7[1])
    expect(lines.some((line) => line.includes('✖ tests'))).toBe(false)
  })

  test('C7 S5.1 FR-022 sends the agent back when only the tests fail', async () => {
    const { output } = await answer(['tests/001/unit/x.test.ts'], { typecheck: TYPES_PASS, 'test:unit': TESTS_FAIL })
    expect(output).toMatchObject({ decision: 'block' })
    const lines = reasonLines(output)
    expect(lines).toContain(C7[2])
    expect(lines.some((line) => line.includes('✖ types'))).toBe(false)
  })

  test('C7 S5.1 FR-022 sends the agent back when a test file fails to load', async () => {
    const report = vitestReport([
      { file: 'tests/001/unit/guard.test.ts', loadError: 'Error: Cannot find module .claude/hooks/guard.ts' },
    ])
    const { output } = await answer(['scripts/lib/terms.ts'], { typecheck: TYPES_PASS, 'test:unit': report })
    expect(output).toMatchObject({ decision: 'block' })
    expect(reasonLines(output).join('\n')).toContain('tests/001/unit/guard.test.ts')
  })

  test('C7 S5.1 FR-022 runs the type check and Vitest\'s unit project, not the whole suite', async () => {
    const { run } = await answer(['scripts/lib/terms.ts'], { typecheck: TYPES_PASS, 'test:unit': TESTS_PASS })
    expect(run.mock.calls.map(([script]) => script).sort()).toEqual(['test:unit', 'typecheck'])
  })

  test('S5.1 FR-022 counts scripts, tests, the hooks and the root config files as code', async () => {
    for (const file of [
      'scripts/lib/terms.ts',
      'tests/001/unit/guard.test.ts',
      '.claude/hooks/guard.ts',
      '.husky/pre-commit',
      'package.json',
      'tsconfig.json',
      'vitest.config.ts',
      'commitlint.config.ts',
    ]) {
      const { output, run } = await answer([file], { typecheck: TYPES_FAIL, 'test:unit': TESTS_PASS })
      expect(run, file).toHaveBeenCalled()
      expect(output, file).toMatchObject({ decision: 'block' })
    }
  })
})

describe('the turn ends', () => {
  test('S5.2 FR-022 lets the agent finish when the checks pass', async () => {
    const { output } = await answer(['scripts/lib/terms.ts'], { typecheck: TYPES_PASS, 'test:unit': TESTS_PASS })
    expect(output).toBeUndefined()
  })

  test('S5.2 FR-022 lets the agent finish without running the checks when no code changed', async () => {
    for (const changed of [[], ['docs/plan.md', 'specs/001-hooks-and-agent-rules/spec.md', '.agents/skills/review/SKILL.md']]) {
      const { output, run } = await answer(changed, { typecheck: TYPES_FAIL, 'test:unit': TESTS_FAIL })
      expect(output, changed.join(', ')).toBeUndefined()
      expect(run, changed.join(', ')).not.toHaveBeenCalled()
    }
  })
})

describe('a tests stage ends its turn', () => {
  const SPEC_003_FAILS = vitestReport([
    { file: 'tests/003/unit/csp.test.ts', passed: 1, failed: 3 },
    { file: 'tests/003/static/site.test.ts', loadError: 'Error: Cannot find module scripts/ci/site-report.ts' },
    { file: 'tests/001/unit/guard.test.ts', passed: 4 },
  ])

  async function waitingAnswer(results: Record<Script, Result>, waiting: string[]) {
    const run = runner(results)
    const asked = vi.fn(() => waiting)
    const output = await decide(stop(ROOT, 'stop-session'), { changedPaths: ['tests/003/unit/csp.test.ts'], run, waiting: asked })
    return { output: output ?? undefined, asked }
  }

  test("S5.4 FR-022 lets the turn end with a notice when the only failures are in a waiting spec's tests", async () => {
    const { output } = await waitingAnswer({ typecheck: TYPES_PASS, 'test:unit': SPEC_003_FAILS }, ['003'])
    expect(output).toEqual({
      systemMessage: "Stop hook: the only failures are in spec 003's tests, which wait for the build, so the turn ends.",
    })
  })

  test('S5.4 FR-022 names every waiting spec that holds a failure', async () => {
    const report = vitestReport([
      { file: 'tests/004/unit/a.test.ts', failed: 1 },
      { file: 'tests/003/unit/b.test.ts', failed: 1 },
    ])
    const { output } = await waitingAnswer({ typecheck: TYPES_PASS, 'test:unit': report }, ['003', '004'])
    expect(output).toEqual({
      systemMessage: "Stop hook: the only failures are in specs 003 and 004's tests, which wait for the build, so the turn ends.",
    })
  })

  test('S5.4 FR-022 still sends the agent back when the type check fails', async () => {
    const { output } = await waitingAnswer({ typecheck: TYPES_FAIL, 'test:unit': SPEC_003_FAILS }, ['003'])
    expect(output).toMatchObject({ decision: 'block' })
    const lines = reasonLines(output)
    expect(lines).toContain(C7[1])
    expect(lines).toContain('  ✖ tests  3 failed in tests/003/unit/csp.test.ts')
  })

  test("S5.4 FR-022 still sends the agent back when another spec's tests fail too", async () => {
    const report = vitestReport([
      { file: 'tests/003/unit/csp.test.ts', failed: 3 },
      { file: 'tests/001/unit/guard.test.ts', passed: 3, failed: 1 },
    ])
    const { output } = await waitingAnswer({ typecheck: TYPES_PASS, 'test:unit': report }, ['003'])
    expect(output).toMatchObject({ decision: 'block' })
    const lines = reasonLines(output)
    expect(lines).toContain('  ✖ tests  1 failed in tests/001/unit/guard.test.ts')
    expect(lines).toContain('  ✖ tests  3 failed in tests/003/unit/csp.test.ts')
  })

  test("S5.4 FR-022 still sends the agent back when a failing file is no spec's, or the tests didn't run", async () => {
    const reports = [
      vitestReport([
        { file: 'tests/003/unit/csp.test.ts', failed: 3 },
        { file: 'tests/private-terms.test.ts', failed: 1 },
      ]),
      { status: 1, output: 'ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found\n' },
    ]
    for (const report of reports) {
      const { output } = await waitingAnswer({ typecheck: TYPES_PASS, 'test:unit': report }, ['003'])
      expect(output).toMatchObject({ decision: 'block' })
    }
  })

  test("S5.4 FR-022 still sends the agent back when the failing spec's tests don't wait for its build", async () => {
    const { output } = await waitingAnswer({ typecheck: TYPES_PASS, 'test:unit': SPEC_003_FAILS }, ['004'])
    expect(output).toMatchObject({ decision: 'block' })
    expect(reasonLines(output)).toContain('  ✖ tests  3 failed in tests/003/unit/csp.test.ts')
  })

  test('S5.4 FR-022 asks which specs wait only when tests fail', async () => {
    const { output, asked } = await waitingAnswer({ typecheck: TYPES_PASS, 'test:unit': TESTS_PASS }, ['003'])
    expect(output).toBeUndefined()
    expect(asked).not.toHaveBeenCalled()
  })
})

describe("Claude Code's limit ends a loop", () => {
  test('S5.3 FR-022 keeps sending the agent back while the checks fail, even when stop_hook_active is set', async () => {
    for (let send = 1; send <= 9; send += 1) {
      const { output } = await answer(['scripts/private-terms.ts'], { typecheck: TYPES_FAIL, 'test:unit': TESTS_FAIL }, true)
      expect(output, `send ${send}`).toMatchObject({ decision: 'block' })
      expect(reasonLines(output)).toEqual(C7)
    }
  })
})
