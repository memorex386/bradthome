import { describe, expect, test } from 'vitest'
import { EXPECTED_JOBS, type JobResult, readSettled, settled } from '../../../scripts/ci/gate.ts'

// The gate re-reads its run's jobs until GitHub's list has caught up. PR #30's
// gate failed twice with every job passed: once when the list still showed
// them queued, and once when a re-run's copied jobs weren't listed yet.

const all = (result = 'success'): JobResult[] => EXPECTED_JOBS.map((name) => ({ name, result }))

describe("the gate's read of GitHub", () => {
  test('a list with every expected job finished has settled, whatever the results', () => {
    expect(settled(all())).toBe(true)
    expect(settled(all().map((job, index) => (index === 0 ? { ...job, result: 'failure' } : job)))).toBe(true)
    expect(settled(all('skipped'))).toBe(true)
  })

  test('a list with a queued, in-progress or unlisted job has not settled', () => {
    expect(settled(all('queued'))).toBe(false)
    expect(settled(all().map((job, index) => (index === 3 ? { ...job, result: 'in_progress' } : job)))).toBe(false)
    expect(settled(all().slice(1))).toBe(false)
  })

  test('re-reads until the list settles, and returns the settled list', async () => {
    const reads = [all('queued'), all().slice(7), all()]
    const slept: number[] = []
    const results = await readSettled(
      async () => reads.shift() ?? [],
      async (ms) => {
        slept.push(ms)
      },
    )
    expect(results).toEqual(all())
    expect(slept).toEqual([10_000, 10_000])
  })

  test('gives up after its tries and returns the last read, so a job that never shows still fails the gate', async () => {
    let count = 0
    const results = await readSettled(
      async () => {
        count += 1
        return all().slice(1)
      },
      async () => {},
      3,
    )
    expect(count).toBe(3)
    expect(results).toHaveLength(EXPECTED_JOBS.length - 1)
  })
})
