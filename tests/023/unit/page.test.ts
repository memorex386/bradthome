import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { casesOf, detailsOf, modelName, seconds, summaryOf, usd } from '../../../apps/site/src/components/evals/evals.ts'
import { parseResults, type Results } from '../../../apps/evals/src/results.ts'

// Spec 023, Story 4: /evals's words and numbers, from a fixture run.

const CASE = {
  suite: 'facts' as const,
  title: 'When Brad was at Hopper',
  turns: [],
  question: 'When did Brad work at Hopper?',
  answer: 'Brad worked at Hopper from April 2022 to October 2026.',
  state: 'answered' as const,
  sources: [{ id: 'job-hopper', label: 'Résumé · Hopper', url: 'https://bradthome.com/#hopper' }],
  checks: [{ name: 'cites a right source', pass: true, detail: 'job-hopper' }],
  tokens: { input: 27, cacheRead: 20_725, cacheWrite: 0, output: 60 },
  costUsd: 0.0003,
  judgeCostUsd: 0.002,
  ms: 2100,
}

const FIXTURE: Results = parseResults({
  version: 1,
  runAt: '2026-11-09T18:00:00.000Z',
  commit: 'a'.repeat(40),
  runUrl: 'https://github.com/memorex386/bradthome/actions/runs/1',
  model: 'claude-haiku-5-5',
  judge: 'claude-sonnet-5-5',
  fingerprint: { hash: 'b'.repeat(64), parts: { prompt: 'c', model: 'd', judge: 'e', checks: 'f', cases: 'g' } },
  corpus: { hash: 'c'.repeat(64), sources: 60 },
  limits: { costUsd: 0.005, ms: 10_000 },
  totals: { cases: 2, passed: 1, answerCostUsd: 0.0006, judgeCostUsd: 0.004, costUsd: 0.0046, ms: 4200 },
  suites: [{ id: 'facts', title: 'Facts it must get right', about: 'x', cases: 2, passed: 1 }],
  cases: [
    { ...CASE, id: 'facts-a', pass: true },
    { ...CASE, id: 'facts-b', pass: false, checks: [{ name: 'says /2026/', pass: false, detail: 'not found' }] },
  ],
  passed: false,
})

describe('/evals', () => {
  test("S4.1 the summary shows the cases passed, the model, the run's cost and its date", () => {
    expect(summaryOf(FIXTURE)).toEqual([
      { value: '1 of 2', label: 'Cases passed' },
      { value: 'Claude Haiku 5.5', label: 'Model that answers' },
      { value: '$0.0046', label: 'Cost of the run' },
      { value: 'November 9, 2026', label: 'Run on' },
    ])
  })

  test('S4.1 the details name the judge, the costs, the limits, the corpus, the commit and the CI run', () => {
    const details = detailsOf(FIXTURE)
    expect(details.map((item) => item.label)).toEqual(['Judge', 'Answers', 'Judging', 'Limits per answer', 'Sources the chat read', 'Code', 'CI run'])
    expect(details.find((item) => item.label === 'Judge')?.value).toBe('Claude Sonnet 5.5')
    expect(details.find((item) => item.label === 'Sources the chat read')?.value).toBe(`60, version ${'c'.repeat(12)}`)
    expect(details.find((item) => item.label === 'Code')?.href).toBe(`https://github.com/memorex386/bradthome/tree/${'a'.repeat(40)}`)
    expect(details.find((item) => item.label === 'CI run')?.href).toBe('https://github.com/memorex386/bradthome/actions/runs/1')
  })

  test('S4.2 a failed case comes first in its suite, so a failure is never buried', () => {
    expect(casesOf(FIXTURE, 'facts').map((item) => item.id)).toEqual(['facts-b', 'facts-a'])
  })

  test('S4.2 costs and times read as people write them', () => {
    expect(usd(0)).toBe('$0')
    expect(usd(0.0003)).toBe('$0.0003')
    expect(usd(0.072)).toBe('$0.072')
    expect(usd(0.13)).toBe('$0.13')
    expect(seconds(2100)).toBe('2.1 s')
    expect(modelName('claude-unknown')).toBe('claude-unknown')
  })

  test('FR-009 SC-001 SC-002 the committed run parses, passed every case, and cost under $0.50', () => {
    const results = parseResults(JSON.parse(readFileSync(path.join(import.meta.dirname, '..', '..', '..', 'apps', 'evals', 'results.json'), 'utf8')))
    expect(results.passed).toBe(true)
    expect(results.totals.passed).toBe(results.totals.cases)
    expect(results.totals.costUsd).toBeLessThan(0.5)
    expect(results.model).toBe('claude-haiku-5-5')
  })
})
