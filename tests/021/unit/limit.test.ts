import { describe, expect, test } from 'vitest'
import { QUESTIONS_PER_DAY } from '../../../apps/chat-api/src/constants.ts'
import { createLimiter } from '../../../apps/chat-api/src/limit.ts'
import { addressOf } from '../../../apps/chat-api/src/address.ts'
import { ask, harness, NOW } from '../helpers/fakes.ts'

// Spec 021, Story 4: the visitor's daily limit (FR-005, D173).

const A = '203.0.113.7'
const B = '198.51.100.20'

describe('the limiter', () => {
  test('S4.1 FR-005 allows 20 a UTC day, then refuses with resetsAt at the next UTC midnight', () => {
    const clock = { now: NOW }
    const limiter = createLimiter({ now: () => clock.now })
    expect(QUESTIONS_PER_DAY).toBe(20)
    for (let i = 0; i < QUESTIONS_PER_DAY; i++) expect(limiter.take(A)).toEqual({ ok: true })
    expect(limiter.take(A)).toEqual({ ok: false, resetsAt: '2026-11-09T00:00:00.000Z' })
  })

  test('S4.2 FR-005 two addresses have their own 20', () => {
    const limiter = createLimiter({ now: () => NOW })
    for (let i = 0; i < QUESTIONS_PER_DAY; i++) limiter.take(A)
    expect(limiter.take(B)).toEqual({ ok: true })
  })

  test('S4.3 FR-005 the next UTC day gives 20 again, under a new code, since the salt changed', () => {
    const clock = { now: NOW }
    const limiter = createLimiter({ now: () => clock.now })
    for (let i = 0; i < QUESTIONS_PER_DAY; i++) limiter.take(A)
    const before = limiter.snapshot()
    clock.now = new Date('2026-11-09T00:00:01Z')
    expect(limiter.take(A)).toEqual({ ok: true })
    const after = limiter.snapshot()
    expect(after.day).toBe('2026-11-09')
    expect(after.entries).toHaveLength(1)
    expect(after.entries[0]?.[0]).not.toBe(before.entries[0]?.[0])
  })

  test('S4.4 FR-005 the state holds only one-way codes and counts, never an address', () => {
    const limiter = createLimiter({ now: () => NOW })
    limiter.take(A)
    limiter.take(B)
    const state = JSON.stringify(limiter.snapshot())
    expect(state).not.toContain(A)
    expect(state).not.toContain(B)
    for (const [code, count] of limiter.snapshot().entries) {
      expect(code).toMatch(/^[0-9a-f]{64}$/)
      expect(count).toBe(1)
    }
  })
})

describe('the visitor address', () => {
  test("S4.2 FR-005 is the rightmost X-Forwarded-For entry, the one Google's front end adds, so a planted entry is ignored", () => {
    expect(addressOf('198.51.100.1, 203.0.113.7')).toBe('203.0.113.7')
    expect(addressOf('203.0.113.7')).toBe('203.0.113.7')
    expect(addressOf(' 2001:db8::1 ')).toBe('2001:db8::1')
    expect(addressOf(undefined)).toBe('unknown')
  })
})

describe('the app', () => {
  test('S4.1 FR-005 the 21st question is 429 limit with resetsAt, and calls no model', async () => {
    const h = harness({ script: { cites: ['job-hopper'] } })
    for (let i = 0; i < QUESTIONS_PER_DAY; i++) expect((await ask(h, { address: A })).status).toBe(200)
    const response = await ask(h, { address: A })
    expect(response.status).toBe(429)
    expect(await response.json()).toMatchObject({ state: 'limit', resetsAt: '2026-11-09T00:00:00.000Z' })
    expect(h.model.doStreamCalls).toHaveLength(QUESTIONS_PER_DAY)
    expect((await ask(h, { address: B })).status).toBe(200)
  })

  test("S4.5 FR-005 refusals for origin, body and ALTCHA don't count toward the limit", async () => {
    const h = harness({ script: { cites: ['job-hopper'] } })
    for (let i = 0; i < 30; i++) {
      await ask(h, { address: A, origin: 'https://bradthome.com', altcha: 'x' })
      await ask(h, { address: A, body: '{' })
      await ask(h, { address: A, altcha: 'bad' })
    }
    expect((await ask(h, { address: A })).status).toBe(200)
  })
})
