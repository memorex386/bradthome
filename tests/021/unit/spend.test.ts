import { describe, expect, test } from 'vitest'
import { DAY_LIMIT_USD, MONTH_LIMIT_USD } from '../../../apps/chat-api/src/constants.ts'
import { assertPriced, costOf, dayKey, monthKey, PRICES } from '../../../apps/chat-api/src/spend.ts'
import { ask, harness, partsOf } from '../helpers/fakes.ts'

// Spec 021, Story 5: the spending shutoffs (FR-006, D169, D182).

describe('pricing', () => {
  test("S5.4 FR-006 prices Haiku 5.5's tokens at $0.10 input, $0.20 cache writes, $0.01 cache reads and $0.50 output per million", () => {
    expect(PRICES['claude-haiku-5-5']).toEqual({ input: 0.1, cacheWrite: 0.2, cacheRead: 0.01, output: 0.5 })
    const cost = costOf('claude-haiku-5-5', { noCache: 1_000_000, cacheWrite: 1_000_000, cacheRead: 1_000_000, output: 1_000_000 })
    expect(cost).toBeCloseTo(0.81, 10)
    expect(costOf('claude-haiku-5-5', { noCache: 214, cacheWrite: 0, cacheRead: 11_873, output: 96 })).toBeCloseTo(0.0001829, 7)
  })

  test('S5.4 FR-006 an unpriced model stops the API from starting', () => {
    expect(() => assertPriced('claude-haiku-5-5')).not.toThrow()
    expect(() => assertPriced('claude-unknown-9')).toThrow(/price/i)
    expect(() => harness({ modelId: 'claude-unknown-9' })).toThrow(/price/i)
  })

  test('S5.3 the day and month documents are named by UTC date', () => {
    expect(dayKey(new Date('2026-11-08T23:59:59Z'))).toBe('day-2026-11-08')
    expect(monthKey(new Date('2026-11-30T23:59:59Z'))).toBe('month-2026-11')
    expect(dayKey(new Date('2026-12-01T00:00:00Z'))).toBe('day-2026-12-01')
  })

  test('SC-004 a warm answer from a cached corpus costs under $0.002', () => {
    expect(costOf('claude-haiku-5-5', { noCache: 1_500, cacheWrite: 0, cacheRead: 15_000, output: 800 })).toBeLessThan(0.002)
  })
})

describe('the shutoffs', () => {
  test(`S5.1 FR-006 at $${DAY_LIMIT_USD} today, a question is 503 paused for the day, until the next UTC midnight, with no model call`, async () => {
    const h = harness({ spend: { day: DAY_LIMIT_USD, month: 5 } })
    const response = await ask(h)
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ state: 'paused', scope: 'day', resetsAt: '2026-11-09T00:00:00.000Z' })
    expect(h.model.doStreamCalls).toHaveLength(0)
  })

  test('S5.1 just under the daily limit, it answers', async () => {
    const h = harness({ spend: { day: DAY_LIMIT_USD - 0.001, month: 5 }, script: { cites: ['job-hopper'] } })
    expect((await ask(h)).status).toBe(200)
  })

  test(`S5.2 FR-006 at $${MONTH_LIMIT_USD} this month, it is paused for the month, until the 1st UTC, even with today under its limit`, async () => {
    const h = harness({ spend: { day: 0, month: MONTH_LIMIT_USD } })
    const response = await ask(h)
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ state: 'paused', scope: 'month', resetsAt: '2026-12-01T00:00:00.000Z' })
    expect(h.model.doStreamCalls).toHaveLength(0)
  })

  test("S5.3 FR-006 an answer's cost is added to today's and this month's documents once, with the answer count", async () => {
    const h = harness({ script: { cites: ['job-hopper'], usage: { noCache: 214, cacheRead: 11_873, cacheWrite: 0, output: 96 } } })
    const response = await ask(h)
    await partsOf(response)
    expect(h.spend.added).toHaveLength(1)
    expect(h.spend.added[0]).toMatchObject({ day: 'day-2026-11-08', month: 'month-2026-11' })
    expect(h.spend.added[0]?.usd).toBeCloseTo(0.0001829, 7)
    expect(h.spend.docs.get('day-2026-11-08')).toMatchObject({ answers: 1 })
    expect(h.spend.docs.get('month-2026-11')).toMatchObject({ answers: 1 })
  })

  test('S5.5 FR-006 when the totals cannot be read, it fails closed as paused with scope unknown', async () => {
    const h = harness()
    h.spend.breaks()
    const response = await ask(h)
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ state: 'paused', scope: 'unknown' })
    expect(h.model.doStreamCalls).toHaveLength(0)
  })

  test('S5.1 a paused refusal does not use one of the visitor questions', async () => {
    const h = harness({ spend: { day: DAY_LIMIT_USD }, script: { cites: ['job-hopper'] } })
    for (let i = 0; i < 25; i++) expect((await ask(h)).status).toBe(503)
    h.spend.start.day = 0
    expect((await ask(h)).status).toBe(200)
  })
})
