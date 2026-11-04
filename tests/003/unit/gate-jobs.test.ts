import { describe, expect, test } from 'vitest'
import { loadGate, recorded } from '../../002/helpers/gate.ts'
import { checkNames, readYaml, type Workflow } from '../../002/helpers/workflows.ts'
import { c0Mock, GATE_JOBS, NEW_JOBS } from '../helpers/ci.ts'
import { GITHUB } from '../helpers/paths.ts'

// The gate's list (FR-007, S2.1, C0): the eight new jobs join spec 002's, in
// C0's order, and every one is required. A failure in any new job fails it.
// The gate counts the tests matrix once, as tests, while each runner still
// shows as its own check (D115).

/** The gate's jobs: C0's checks, with the two tests runners as one. */
const RESULT_JOBS = [...new Set(GATE_JOBS.map((name) => (name.startsWith('tests (') ? 'tests' : name)))]

describe('C0: the gate expects every check', () => {
  test('S2.1 FR-007 C0 the gate expects the eight new jobs and spec 002\'s, in the order C0 lists them', async () => {
    const { EXPECTED_JOBS } = await loadGate()
    expect([...EXPECTED_JOBS]).toEqual(RESULT_JOBS)
  })

  test('S2.1 FR-007 C0 ci.yml shows exactly those checks and the gate', () => {
    const names = checkNames(readYaml<Workflow>(GITHUB.ci))
    expect([...names].sort()).toEqual([...GATE_JOBS, 'gate'].sort())
  })

  test("S2.1 FR-007 FR-015 C0 a pull request shows exactly the checks C0 lists, in its order, and C0's count matches", () => {
    const shown = (file: string): string[] => {
      const workflow = readYaml<Workflow>(file)
      return checkNames(workflow).map((name) => `${String(workflow.name)} / ${name}`)
    }
    const { count, checks } = c0Mock()
    expect(checks).toEqual([...GATE_JOBS.map((name) => `ci / ${name}`), 'ci / gate', 'locked-tests / lock', 'preview / build', 'preview / deploy', 'preview / comment'])
    expect(count).toBe(checks.length)
    expect([...shown(GITHUB.ci), ...shown(GITHUB.lockedTests), ...shown(GITHUB.preview)].sort()).toEqual([...checks].sort())
  })

  test('S2.1 FR-007 C0 the gate passes when every job passed, and fails naming any new job that didn\'t', async () => {
    const { EXPECTED_JOBS, gateVerdict } = await loadGate()
    expect(gateVerdict(recorded(EXPECTED_JOBS)).passed).toBe(true)
    for (const id of NEW_JOBS) {
      for (const result of ['failure', 'cancelled', 'skipped']) {
        const verdict = gateVerdict(recorded(EXPECTED_JOBS, { [id]: result }))
        expect(verdict.passed, `${id} ${result}`).toBe(false)
        expect(verdict.lines[0], `${id} ${result}`).toBe(`✖ gate  1 of ${RESULT_JOBS.length} jobs didn't pass`)
        expect(verdict.lines.some((line) => new RegExp(`^ {2}${id} {2,}${result}$`).test(line)), `${id} ${result}`).toBe(true)
      }
    }
  })
})
