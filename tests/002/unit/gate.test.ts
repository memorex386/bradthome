import { describe, expect, test } from 'vitest'
import { CI_JOBS, loadGate, recorded } from '../helpers/gate.ts'
import { K1_TAIL, PASS } from '../helpers/messages.ts'
import { GITHUB } from '../helpers/paths.ts'
import { checkNames, readYaml, type Workflow } from '../helpers/workflows.ts'

// The gate's logic, run on recorded job results (S1.1, S1.2). The gate's list of
// expected jobs lives in scripts/ci/gate.ts, and is checked here against the
// CI workflow's jobs.

describe('K0: every job passed', () => {
  test('S1.1 FR-002 K0 passes when every job passed, in one line', async () => {
    const { gateVerdict } = await loadGate()
    const verdict = gateVerdict(recorded())
    expect(verdict.passed).toBe(true)
    expect(verdict.lines).toHaveLength(1)
    expect(verdict.lines[0]).toMatch(PASS.gate)
  })

  test('S1.1 FR-002 K0 the gate expects exactly the eight checks the mocks show, in their order', async () => {
    const { EXPECTED_JOBS } = await loadGate()
    expect([...EXPECTED_JOBS]).toEqual([...CI_JOBS])
  })

  test("S1.2 FR-002 FR-003 the gate's list matches the CI workflow's jobs, so a new job can't go unchecked", async () => {
    const { EXPECTED_JOBS } = await loadGate()
    const names = checkNames(readYaml<Workflow>(GITHUB.ci)).filter((name) => name !== 'gate')
    expect([...names].sort()).toEqual([...EXPECTED_JOBS].sort())
  })
})

describe('K1: the gate fails, naming each job', () => {
  test("S1.2 FR-003 FR-020 K1 a failed job fails the gate, in the mock's words", async () => {
    const { gateVerdict } = await loadGate()
    const verdict = gateVerdict(recorded({ 'tests (windows-2025)': 'failure', privacy: 'failure' }))
    expect(verdict.passed).toBe(false)
    expect(verdict.lines).toEqual([
      "✖ gate  2 of 8 jobs didn't pass",
      '  tests (windows-2025)  failure',
      '  privacy               failure',
      ...K1_TAIL,
    ])
  })

  test('S1.2 FR-003 K1 a cancelled job fails the gate and is named', async () => {
    const { gateVerdict } = await loadGate()
    const verdict = gateVerdict(recorded({ secrets: 'cancelled' }))
    expect(verdict.passed).toBe(false)
    expect(verdict.lines[0]).toBe("✖ gate  1 of 8 jobs didn't pass")
    expect(verdict.lines).toContain('  secrets  cancelled')
    expect(verdict.lines.slice(-2)).toEqual(K1_TAIL)
  })

  test('S1.2 FR-003 K1 a skipped job fails the gate, so a missing check never reads as a pass', async () => {
    const { gateVerdict } = await loadGate()
    const verdict = gateVerdict(recorded({ commits: 'skipped' }))
    expect(verdict.passed).toBe(false)
    expect(verdict.lines).toContain('  commits  skipped')
  })

  test("S1.2 FR-003 K1 a job with no result at all fails the gate and is named", async () => {
    const { gateVerdict } = await loadGate()
    const verdict = gateVerdict(recorded().filter((job) => job.name !== 'trace'))
    expect(verdict.passed).toBe(false)
    expect(verdict.lines[0]).toBe("✖ gate  1 of 8 jobs didn't pass")
    expect(verdict.lines.some((line) => /^ {2}trace {2}\S/.test(line)), verdict.lines.join('\n')).toBe(true)
  })

  test('S1.2 FR-003 K1 no results at all fails the gate, naming all eight jobs', async () => {
    const { gateVerdict } = await loadGate()
    const verdict = gateVerdict([])
    expect(verdict.passed).toBe(false)
    expect(verdict.lines[0]).toBe("✖ gate  8 of 8 jobs didn't pass")
    for (const name of CI_JOBS) {
      expect(verdict.lines.some((line) => line.startsWith(`  ${name}  `)), name).toBe(true)
    }
  })

  test("S1.2 FR-003 K1 any result that isn't success fails the gate, such as neutral or timed out", async () => {
    const { gateVerdict } = await loadGate()
    for (const result of ['neutral', 'timed_out', 'action_required', 'stale', '']) {
      const verdict = gateVerdict(recorded({ hygiene: result }))
      expect(verdict.passed, result).toBe(false)
      expect(verdict.lines.some((line) => line.startsWith('  hygiene  ')), result).toBe(true)
    }
  })

  test("S1.2 FR-003 K1 a failed job the gate doesn't expect still fails it", async () => {
    const { gateVerdict } = await loadGate()
    const verdict = gateVerdict([...recorded(), { name: 'lint', result: 'failure' }])
    expect(verdict.passed).toBe(false)
    expect(verdict.lines.some((line) => /^ {2}lint {2,}failure$/.test(line)), verdict.lines.join('\n')).toBe(true)
  })

  test('S1.2 FR-003 K1 the failing jobs are listed in the order the mocks show the checks', async () => {
    const { gateVerdict } = await loadGate()
    const verdict = gateVerdict(recorded({ hygiene: 'failure', types: 'cancelled', 'tests (ubuntu-24.04)': 'skipped' }))
    const named = verdict.lines.slice(1, -2).map((line) => line.trim().split(/ {2,}/)[0])
    expect(named).toEqual(['types', 'tests (ubuntu-24.04)', 'hygiene'])
  })
})
