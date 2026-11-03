import { describe, expect, test } from 'vitest'
import { combinedResults, DRAFT_JOBS, EXPECTED_JOBS, gateMode, gateVerdict, SLOW_JOBS } from '../../../scripts/ci/gate.ts'
import { recorded } from '../helpers/gate.ts'

// The gate's draft and edit runs (FR-001, FR-003, D100). A draft runs only the
// quick jobs, so its gate expects those. An edit to the pull request's text runs
// only privacy and commits, so its gate adds each job's latest result from the
// earlier runs for the same commit, and a code run that failed still fails it.

const PULL = { action: 'synchronize', pull_request: { draft: false } }

describe('which run this is', () => {
  test('S1.4 FR-001 a push to a ready pull request or to main is a full run, a draft is a quick run, and an edit is a text run', () => {
    expect(gateMode(PULL)).toEqual({ draft: false, textOnly: false })
    expect(gateMode({ ref: 'refs/heads/main' })).toEqual({ draft: false, textOnly: false })
    expect(gateMode({ action: 'ready_for_review', pull_request: { draft: false } })).toEqual({ draft: false, textOnly: false })
    expect(gateMode({ action: 'synchronize', pull_request: { draft: true } })).toEqual({ draft: true, textOnly: false })
    expect(gateMode({ action: 'edited', pull_request: { draft: false } })).toEqual({ draft: false, textOnly: true })
  })
})

describe("a draft's gate", () => {
  test('S1.2 FR-003 passes on the quick jobs alone, saying the full suite runs once it is ready', () => {
    const results = recorded(DRAFT_JOBS).concat(SLOW_JOBS.map((name) => ({ name, result: 'skipped' })))
    const verdict = gateVerdict(results, { draft: true, textOnly: false })
    expect(verdict.passed).toBe(true)
    expect(verdict.lines[0]).toMatch(/^✓ gate {2}every quick job passed\. A draft runs the full suite once it's ready for review\.$/)
    expect(DRAFT_JOBS).toContain('tests (windows-2025)')
    for (const name of SLOW_JOBS) expect(DRAFT_JOBS).not.toContain(name)
  })

  test('S1.2 FR-003 still fails on a quick job that failed', () => {
    const verdict = gateVerdict(recorded(DRAFT_JOBS, { lint: 'failure' }), { draft: true, textOnly: false })
    expect(verdict.passed).toBe(false)
    expect(verdict.lines.some((line) => /^ {2}lint {2,}failure$/.test(line))).toBe(true)
  })

  test("S1.2 FR-003 the same skipped jobs fail a ready pull request's gate", () => {
    const results = recorded(DRAFT_JOBS).concat(SLOW_JOBS.map((name) => ({ name, result: 'skipped' })))
    expect(gateVerdict(results).passed).toBe(false)
  })
})

describe("an edit's gate", () => {
  const textRun = [
    ...EXPECTED_JOBS.filter((name) => name !== 'privacy' && name !== 'commits').map((name) => ({ name, result: 'skipped' })),
    { name: 'privacy', result: 'success' },
    { name: 'commits', result: 'success' },
  ]

  test("S1.2 FR-003 passes when the text jobs pass and the commit's latest code run passed", () => {
    const results = combinedResults(textRun, [recorded(EXPECTED_JOBS)])
    expect(gateVerdict(results).passed).toBe(true)
  })

  test('S1.2 FR-003 fails when the code run for the same commit failed, naming its job', () => {
    const verdict = gateVerdict(combinedResults(textRun, [recorded(EXPECTED_JOBS, { e2e: 'failure' })]))
    expect(verdict.passed).toBe(false)
    expect(verdict.lines.some((line) => /^ {2}e2e {2,}failure$/.test(line))).toBe(true)
  })

  test('S1.2 FR-003 fails while no code run for the commit has finished, and an earlier edit never hides a code result', () => {
    expect(gateVerdict(combinedResults(textRun, [])).passed).toBe(false)
    const results = combinedResults(textRun, [recorded(EXPECTED_JOBS, { lint: 'failure' }), textRun])
    expect(gateVerdict(results).passed).toBe(false)
  })

  test("S1.2 FR-003 a failed text job fails the edit's gate even when the code run passed", () => {
    const failed = textRun.map((job) => (job.name === 'privacy' ? { ...job, result: 'failure' } : job))
    expect(gateVerdict(combinedResults(failed, [recorded(EXPECTED_JOBS)])).passed).toBe(false)
  })
})
