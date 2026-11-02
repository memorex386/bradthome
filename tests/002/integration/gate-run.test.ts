import { writeFileSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { expectBlock, expectOneLine } from '../../001/helpers/messages.ts'
import { describeRun, runMerged, type RunResult } from '../../001/helpers/run.ts'
import { type Sandbox, setEnv } from '../../001/helpers/sandbox.ts'
import { createCiSandbox } from '../helpers/ci-repo.ts'
import { type JobResult, recorded } from '../helpers/gate.ts'
import { K1_TAIL, PASS } from '../helpers/messages.ts'
import { CI } from '../helpers/paths.ts'

// The gate's command line, run as the workflow runs it: `node scripts/ci/gate.ts`.
// How the gate step gets each check's result on GitHub is the build's choice.
// GATE_RESULTS names a JSON file of { name, result } entries, which the command
// reads in place of GitHub's when it's set, so the tests can give it recorded
// results. Input it can't read fails the gate, and never reads as a pass.

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
})

function runGate(results: readonly JobResult[] | string | undefined): RunResult {
  const sandbox = createCiSandbox({ terms: false })
  sandboxes.push(sandbox)
  const env = { ...sandbox.env }
  if (results !== undefined) {
    const file = sandbox.path('results.json')
    writeFileSync(file, typeof results === 'string' ? results : `${JSON.stringify(results)}\n`)
    setEnv(env, 'GATE_RESULTS', file)
  } else {
    setEnv(env, 'GATE_RESULTS', sandbox.path('no-such-file.json'))
  }
  return runMerged(process.execPath, [CI.gate], { cwd: sandbox.root, env, scratch: sandbox.root })
}

describe("the gate's command line", () => {
  test('S1.1 FR-002 K0 exits 0 and prints the pass line when every job passed', () => {
    const result = runGate(recorded())
    expect(result.status, describeRun(result)).toBe(0)
    expectOneLine(result.stdout, PASS.gate)
  })

  test('S1.2 FR-003 SC-001 K1 exits non-zero for a failed, a cancelled, a skipped or a missing job, printing K1', () => {
    const cases: [string, JobResult[]][] = [
      ['failed', recorded({ privacy: 'failure' })],
      ['cancelled', recorded({ secrets: 'cancelled' })],
      ['skipped', recorded({ commits: 'skipped' })],
      ['missing', recorded().filter((job) => job.name !== 'trace')],
    ]
    for (const [name, results] of cases) {
      const result = runGate(results)
      expect(result.status, `${name}\n${describeRun(result)}`).not.toBe(0)
      expectBlock(result.stdout, ["✖ gate  1 of 8 jobs didn't pass"])
      expectBlock(result.stdout, K1_TAIL)
    }
  })

  test("S1.2 FR-003 input the gate can't read fails it, and never reads as a pass", () => {
    for (const input of [undefined, '', 'not json', '{}']) {
      const result = runGate(input)
      expect(result.status, `${String(input)}\n${describeRun(result)}`).not.toBe(0)
      expect(result.stdout).not.toMatch(/^✓ gate/m)
      expect(result.stdout, String(input)).toMatch(/^✖ gate {2}\S/m)
    }
  })
})
