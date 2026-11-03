import { describe, expect, test } from 'vitest'
import { loadNightlySummary } from '../helpers/modules.ts'

// The nightly report (FR-020, S5.1, S5.2, N1): external links and the mutation
// score, in the run's summary, with no threshold until there's a baseline.

const N1_TAIL = "  Reported in the run's summary. Not a gate until there's a baseline (D94)."

/** Stryker's JSON report (mutation-testing-report-schema), with only the fields the score reads. */
function strykerReport(statuses: Record<string, number>): unknown {
  const mutants = Object.entries(statuses).flatMap(([status, count]) =>
    Array.from({ length: count }, (_, index) => ({ id: `${status}-${index}`, mutatorName: 'ConditionalExpression', status })),
  )
  return {
    schemaVersion: '2',
    thresholds: { high: 80, low: 60 },
    files: {
      'scripts/lib/terms.ts': { language: 'typescript', source: '', mutants: mutants.slice(0, Math.ceil(mutants.length / 2)) },
      'scripts/hooks/pre-commit.ts': { language: 'typescript', source: '', mutants: mutants.slice(Math.ceil(mutants.length / 2)) },
    },
  }
}

describe('N1: the nightly report', () => {
  test("S5.1 S5.2 FR-020 N1 reports the links and the score, in the mock's words", async () => {
    const { nightlySummary } = await loadNightlySummary()
    expect(nightlySummary({ total: 3, broken: [] }, 87)).toEqual([
      'nightly  external links: 0 broken of 3',
      '         mutation score (safety scripts): 87%',
      N1_TAIL,
    ])
  })

  test('S5.1 FR-020 N1 names each broken external link, with its page and reason', async () => {
    const { nightlySummary } = await loadNightlySummary()
    const lines = nightlySummary(
      {
        total: 3,
        broken: [
          { page: 'dist/index.html', url: 'https://example.com/gone', reason: '404 Not Found' },
          { page: 'dist/404.html', url: 'https://example.org/down', reason: 'timeout' },
        ],
      },
      87,
    )
    expect(lines[0]).toBe('nightly  external links: 2 broken of 3')
    for (const url of ['https://example.com/gone', 'https://example.org/down']) {
      expect(lines.some((line) => line.includes(url)), url).toBe(true)
    }
    expect(lines.some((line) => line.includes('dist/index.html') && line.includes('404 Not Found'))).toBe(true)
    expect(lines.at(-1)).toBe(N1_TAIL)
  })

  test("S5.2 FR-020 N1 says when the mutation job didn't report, rather than showing a score", async () => {
    const { nightlySummary } = await loadNightlySummary()
    const lines = nightlySummary({ total: 0, broken: [] }, undefined)
    expect(lines[0]).toBe('nightly  external links: 0 broken of 0')
    expect(lines[1]).toMatch(/^ {9}mutation score \(safety scripts\): (?!\d)\S/)
  })
})

describe("Stryker's score", () => {
  test('S5.2 FR-020 is the detected mutants over the valid ones, as Stryker counts it', async () => {
    const { mutationScore } = await loadNightlySummary()
    // Detected: Killed and Timeout. Undetected: Survived and NoCoverage. Not valid: CompileError, RuntimeError and Ignored.
    const report = strykerReport({ Killed: 7, Timeout: 1, Survived: 1, NoCoverage: 1, CompileError: 3, RuntimeError: 1, Ignored: 2 })
    expect(mutationScore(report)).toBeCloseTo(80, 5)
    expect(mutationScore(strykerReport({ Killed: 3 }))).toBe(100)
  })

  test("S5.2 FR-020 a report it can't read throws, rather than reading as a score", async () => {
    const { mutationScore } = await loadNightlySummary()
    for (const bad of [undefined, {}, { files: {} }, 'not a report']) expect(() => mutationScore(bad), JSON.stringify(bad)).toThrow()
  })
})
