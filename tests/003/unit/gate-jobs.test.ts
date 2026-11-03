import { describe, expect, test } from 'vitest'
import { loadGate, recorded } from '../../002/helpers/gate.ts'
import { checkNames, readYaml, type Workflow } from '../../002/helpers/workflows.ts'
import { C0_CHECKS, GATE_JOBS, NEW_JOBS } from '../helpers/ci.ts'
import { GITHUB } from '../helpers/paths.ts'

// The gate's list (FR-007, S2.1, C0): the eight new jobs join spec 002's, in
// C0's order, and every one is required. A failure in any new job fails it.

describe('C0: the gate expects every check', () => {
  test('S2.1 FR-007 C0 the gate expects the eight new jobs and spec 002\'s, in the order C0 lists them', async () => {
    const { EXPECTED_JOBS } = await loadGate()
    expect([...EXPECTED_JOBS]).toEqual([...GATE_JOBS])
  })

  test('S2.1 FR-007 C0 ci.yml shows exactly those checks and the gate, so C0 lists 19 with the lock and the preview', () => {
    const names = checkNames(readYaml<Workflow>(GITHUB.ci))
    expect([...names].sort()).toEqual([...GATE_JOBS, 'gate'].sort())
    expect(C0_CHECKS).toHaveLength(19)
  })

  test('S2.1 FR-007 C0 the gate passes when every job passed, and fails naming any new job that didn\'t', async () => {
    const { EXPECTED_JOBS, gateVerdict } = await loadGate()
    expect(gateVerdict(recorded(EXPECTED_JOBS)).passed).toBe(true)
    for (const id of NEW_JOBS) {
      for (const result of ['failure', 'cancelled', 'skipped']) {
        const verdict = gateVerdict(recorded(EXPECTED_JOBS, { [id]: result }))
        expect(verdict.passed, `${id} ${result}`).toBe(false)
        expect(verdict.lines[0], `${id} ${result}`).toBe(`✖ gate  1 of ${GATE_JOBS.length} jobs didn't pass`)
        expect(verdict.lines.some((line) => new RegExp(`^ {2}${id} {2,}${result}$`).test(line)), `${id} ${result}`).toBe(true)
      }
    }
  })
})
