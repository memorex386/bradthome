import { describe, expect, test } from 'vitest'
import { DRAFT_JOBS, EXPECTED_JOBS, gateMode, gateVerdict, resultsFromNeeds, SLOW_JOBS } from '../../../scripts/ci/gate.ts'
import { recorded } from '../helpers/gate.ts'

// The gate's draft runs and where its results come from (FR-001, FR-003, S1.6,
// D100, D115). A draft runs only the quick jobs, so its gate expects those. An
// edit to the pull request's text runs no ci at all, only the text check, so
// no run ever reads another run's results. The gate decides from the needs its
// workflow hands it, never from GitHub's API.

const PULL = { action: 'synchronize', pull_request: { draft: false } }

/** The needs context GitHub gives the gate, as toJSON(needs) writes it. */
function needsJson(results: Record<string, string>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(results).map(([name, result]) => [name, { result, outputs: {} }])))
}

describe('which run this is', () => {
  test('S1.4 FR-001 a push to a ready pull request or to main is a full run, and a draft is a quick run', () => {
    expect(gateMode(PULL)).toEqual({ draft: false })
    expect(gateMode({ ref: 'refs/heads/main' })).toEqual({ draft: false })
    expect(gateMode({ action: 'ready_for_review', pull_request: { draft: false } })).toEqual({ draft: false })
    expect(gateMode({ action: 'synchronize', pull_request: { draft: true } })).toEqual({ draft: true })
  })
})

describe("a draft's gate", () => {
  test('S1.2 FR-003 passes on the quick jobs alone, saying the full suite runs once it is ready', () => {
    const results = recorded(DRAFT_JOBS).concat(SLOW_JOBS.map((name) => ({ name, result: 'skipped' })))
    const verdict = gateVerdict(results, { draft: true })
    expect(verdict.passed).toBe(true)
    expect(verdict.lines[0]).toMatch(/^✓ gate {2}every quick job passed\. A draft runs the full suite once it's ready for review\.$/)
    expect(DRAFT_JOBS).toContain('tests')
    for (const name of SLOW_JOBS) expect(DRAFT_JOBS).not.toContain(name)
  })

  test('S1.2 FR-003 still fails on a quick job that failed', () => {
    const verdict = gateVerdict(recorded(DRAFT_JOBS, { lint: 'failure' }), { draft: true })
    expect(verdict.passed).toBe(false)
    expect(verdict.lines.some((line) => /^ {2}lint {2,}failure$/.test(line))).toBe(true)
  })

  test("S1.2 FR-003 the same skipped jobs fail a ready pull request's gate", () => {
    const results = recorded(DRAFT_JOBS).concat(SLOW_JOBS.map((name) => ({ name, result: 'skipped' })))
    expect(gateVerdict(results).passed).toBe(false)
  })
})

describe('S1.6: the gate reads its needs', () => {
  test('S1.6 FR-003 reads each job and its result from the needs context', () => {
    const results = resultsFromNeeds(needsJson({ lint: 'success', tests: 'failure', e2e: 'skipped' }))
    expect(results).toEqual([
      { name: 'lint', result: 'success' },
      { name: 'tests', result: 'failure' },
      { name: 'e2e', result: 'skipped' },
    ])
  })

  test('S1.6 S1.2 FR-002 FR-003 every job passing passes, and the tests matrix failing on either runner fails it, as tests', () => {
    const all = Object.fromEntries(EXPECTED_JOBS.map((name) => [name, 'success']))
    expect(gateVerdict(resultsFromNeeds(needsJson(all))).passed).toBe(true)
    // GitHub gives a matrix job one result: failure when any leg failed.
    const verdict = gateVerdict(resultsFromNeeds(needsJson({ ...all, tests: 'failure' })))
    expect(verdict.passed).toBe(false)
    expect(verdict.lines.some((line) => /^ {2}tests {2,}failure$/.test(line))).toBe(true)
  })

  test("S1.6 FR-003 a job missing from the needs, or a needs context that isn't one, fails the gate", () => {
    const some = Object.fromEntries(EXPECTED_JOBS.slice(1).map((name) => [name, 'success']))
    const verdict = gateVerdict(resultsFromNeeds(needsJson(some)))
    expect(verdict.passed).toBe(false)
    expect(verdict.lines.some((line) => new RegExp(`^ {2}${EXPECTED_JOBS[0]} {2,}missing$`).test(line))).toBe(true)
    for (const bad of ['', 'null', '[]', '{"lint": "success"}', 'not json']) expect(() => resultsFromNeeds(bad), bad).toThrow()
  })
})
