import { afterEach, describe, expect, test, vi } from 'vitest'
import { MAX_ANSWER_CHARS, MAX_MESSAGES, QUESTIONS_PER_DAY } from '../../../apps/chat-api/src/constants.ts'
import { BOUNDARY, NO_SOURCE } from '../../../apps/chat-api/src/prompt.ts'
import { apiTransport, messagesOf, type Outcome, refusalOf } from '../../../apps/site/src/components/chat/api.ts'
import type { StreamEvent } from '../../../apps/site/src/components/chat/stream.ts'
import type { Turn } from '../../../apps/site/src/components/chat/types.ts'
import { harness, type HarnessOptions, NEXT } from '../../021/helpers/fakes.ts'

// Spec 022: the window's client against spec 021's real API, run in-process
// with its fake model and store, so every reply has the API's own shape. The
// browser's ALTCHA solver (WebCrypto) solves the API's real challenges.

afterEach(() => {
  vi.useRealTimers()
})

const ORIGIN = 'https://chat-api.test'

/** The real transport, with fetch going to the in-process API from a next origin. */
function transportOf(options: HarnessOptions = {}, origin = NEXT) {
  const h = harness(options)
  const calls: { path: string; body?: unknown }[] = []
  const fetcher = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = new URL(String(input))
    calls.push({ path: url.pathname, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) })
    const headers = new Headers(init?.headers)
    headers.set('origin', origin)
    return h.app.request(url.pathname, { method: init?.method ?? 'GET', headers, body: init?.body ?? null })
  }) as typeof fetch
  return { h, calls, transport: apiTransport(ORIGIN, fetcher) }
}

async function ask(transport: ReturnType<typeof apiTransport>, question = 'What did Brad build at Hopper?', earlier: Turn[] = []) {
  let checked = 0
  const outcome = await transport.ask(question, earlier, new AbortController().signal, () => checked++)
  return { outcome, checked }
}

async function eventsOf(outcome: Outcome): Promise<StreamEvent[]> {
  if (outcome.kind !== 'stream') throw new Error(`expected a stream, got ${outcome.kind}`)
  const events: StreamEvent[] = []
  for await (const event of outcome.events) events.push(event)
  return events
}

const done = (n: number, text = `Answer ${n}.`): Turn => ({ id: `t${n}`, question: `Question ${n}?`, status: 'done', text, sources: [] })

describe('asking', () => {
  test('S2.3 FR-003 the client fetches and solves the challenge, says so, then posts the question with the solution', async () => {
    const { transport, calls } = transportOf({ script: { text: ['Brad ', 'launched it.'], cites: ['job-hopper'] } })
    const { outcome, checked } = await ask(transport)
    expect(checked).toBe(1)
    expect(calls.map((call) => call.path)).toEqual(['/challenge', '/chat'])
    const body = calls[1]?.body as { altcha: string; messages: unknown[] }
    expect(body.altcha.length).toBeGreaterThan(20)
    expect(body.messages).toEqual([{ id: 'q', role: 'user', parts: [{ type: 'text', text: 'What did Brad build at Hopper?' }] }])
    expect(outcome.kind).toBe('stream')
  })

  test('S2.3 S2.4 the stream gives each word as it comes, then each cited source once with its label and link, then the numbers', async () => {
    const { transport } = transportOf({ script: { text: ['Brad ', 'launched ', 'it.'], cites: ['job-hopper', 'essay-dark-launch', 'job-hopper'] } })
    const events = await eventsOf((await ask(transport)).outcome)
    expect(events.filter((event) => event.type === 'text').map((event) => event.type === 'text' && event.delta)).toEqual(['Brad ', 'launched ', 'it.'])
    expect(events.filter((event) => event.type === 'source').map((event) => event.type === 'source' && event.source)).toEqual([
      { id: 'job-hopper', url: 'https://bradthome.com/#hopper', label: 'Résumé · Hopper' },
      { id: 'essay-dark-launch', url: 'https://bradthome.com/vindecoded-agents#new-features-ship-dark', label: 'Essay · New features ship dark' },
    ])
    const meta = events.find((event) => event.type === 'meta')
    expect(meta?.type === 'meta' && meta.meta).toMatchObject({ state: 'answered', model: 'claude-haiku-5-5', inputTokens: 200, cacheReadTokens: 11_000, outputTokens: 90 })
    expect(events.at(-1)?.type).toBe('meta')
  })

  test("S5.1 S5.2 a no-source or boundary reply arrives with the API's own words and its state", async () => {
    const noSource = await eventsOf((await ask(transportOf({ script: { text: [NO_SOURCE] } }).transport)).outcome)
    expect(noSource.find((event) => event.type === 'meta')).toMatchObject({ meta: { state: 'no-source' } })
    const boundary = await eventsOf((await ask(transportOf({ script: { text: [BOUNDARY] } }).transport)).outcome)
    expect(boundary.find((event) => event.type === 'meta')).toMatchObject({ meta: { state: 'boundary' } })
  })

  test('S2.5 a stopped question throws its abort, so the window keeps the words so far', async () => {
    const { transport } = transportOf()
    const controller = new AbortController()
    controller.abort(new Error('stopped'))
    await expect(transport.ask('Question?', [], controller.signal, () => {})).rejects.toThrow('stopped')
  })
})

describe('the conversation sent with a question', () => {
  test('S2.6 FR-003 earlier finished turns go first, the newest kept, within 10 messages', () => {
    const earlier = Array.from({ length: 7 }, (_, n) => done(n + 1))
    const messages = messagesOf('Now?', earlier)
    expect(messages.length).toBeLessThanOrEqual(MAX_MESSAGES)
    expect(messages.length).toBe(9)
    expect(messages[0]).toMatchObject({ role: 'user', parts: [{ type: 'text', text: 'Question 4?' }] })
    expect(messages.at(-2)).toMatchObject({ role: 'assistant', parts: [{ type: 'text', text: 'Answer 7.' }] })
    expect(messages.at(-1)).toMatchObject({ role: 'user', parts: [{ type: 'text', text: 'Now?' }] })
  })

  test('S2.6 a stopped, failed, checked-out or refused turn, and an answer over 4,000 characters, are left out', () => {
    const earlier: Turn[] = [
      { ...done(1), status: 'stopped' },
      { ...done(2), status: 'failed', text: '' },
      { ...done(3), status: 'check-failed', text: '' },
      { ...done(4), status: 'unavailable', text: '' },
      done(5, 'x'.repeat(MAX_ANSWER_CHARS + 1)),
      done(6),
    ]
    expect(messagesOf('Now?', earlier).map((message) => message.parts[0]?.text)).toEqual(['Question 6?', 'Answer 6.', 'Now?'])
  })

  test('S2.6 the API accepts what the window sends after earlier answers', async () => {
    const { transport } = transportOf({ script: { text: ['Again.'], cites: ['job-hopper'] } })
    const events = await eventsOf((await ask(transport, 'And then?', [done(1), done(2)])).outcome)
    expect(events.some((event) => event.type === 'meta')).toBe(true)
  })
})

describe('limits, pauses and failures', () => {
  test("S6.1 the visitor's 21st question today is the limit, with when it resets", async () => {
    const { transport } = transportOf({ script: { text: ['Yes.'], cites: ['job-hopper'] } })
    for (let n = 0; n < QUESTIONS_PER_DAY; n++) await eventsOf((await ask(transport)).outcome)
    const { outcome } = await ask(transport)
    expect(outcome).toEqual({ kind: 'off', off: { kind: 'limit', resetsAt: '2026-11-09T00:00:00.000Z' } })
  })

  test("S6.2 the spending caps pause the chat by day, month, or for now when the totals can't be read", async () => {
    expect((await ask(transportOf({ spend: { day: 2.5 } }).transport)).outcome).toEqual({
      kind: 'off',
      off: { kind: 'paused', scope: 'day', resetsAt: '2026-11-09T00:00:00.000Z' },
    })
    expect((await ask(transportOf({ spend: { month: 20 } }).transport)).outcome).toEqual({
      kind: 'off',
      off: { kind: 'paused', scope: 'month', resetsAt: '2026-12-01T00:00:00.000Z' },
    })
    const broken = transportOf()
    broken.h.spend.breaks()
    expect((await ask(broken.transport)).outcome).toEqual({ kind: 'off', off: { kind: 'paused', scope: 'unknown' } })
  })

  test('S6.3 a model that fails ends the stream with an error', async () => {
    const events = await eventsOf((await ask(transportOf({ script: { error: true } }).transport)).outcome)
    expect(events.some((event) => event.type === 'error')).toBe(true)
    expect(events.some((event) => event.type === 'meta')).toBe(false)
  })

  test("S6.3 a request that can't reach the API fails", async () => {
    const fetcher = (async (input: Parameters<typeof fetch>[0]) => {
      if (String(input).endsWith('/challenge')) return transportOf().h.app.request('/challenge', { headers: { origin: NEXT } })
      throw new TypeError('network')
    }) as typeof fetch
    expect((await ask(apiTransport(ORIGIN, fetcher))).outcome).toEqual({ kind: 'failed' })
  })

  test("S6.4 the check fails when the challenge can't be fetched, can't be solved, or the API refuses the solution", async () => {
    const down = (async () => {
      throw new TypeError('network')
    }) as typeof fetch
    expect((await ask(apiTransport(ORIGIN, down))).outcome).toEqual({ kind: 'check-failed' })
    const unsolvable = (async () =>
      Response.json({
        parameters: { algorithm: 'PBKDF2/SHA-256', nonce: '00', salt: '00', cost: 1, keyLength: 32, keyPrefix: 'zz' },
      })) as typeof fetch
    expect((await ask(apiTransport(ORIGIN, unsolvable))).outcome).toEqual({ kind: 'check-failed' })
    expect(refusalOf(403, { state: 'altcha', message: 'The check didn’t pass. Try again.' })).toEqual({ kind: 'check-failed' })
  })

  test("S6.5 bradthome.com's origin is refused as unavailable, and a question the API can't read as invalid", async () => {
    expect((await ask(transportOf({}, 'https://bradthome.com').transport)).outcome).toEqual({ kind: 'unavailable', reason: 'origin' })
    expect((await ask(transportOf().transport, 'x'.repeat(1_001))).outcome).toEqual({ kind: 'unavailable', reason: 'invalid' })
  })

  test('S6.1 S6.2 S6.3 a refusal with no body still maps to a state', () => {
    expect(refusalOf(429, undefined)).toEqual({ kind: 'off', off: { kind: 'limit' } })
    expect(refusalOf(503, { state: 'paused', scope: 'whatever' })).toEqual({ kind: 'off', off: { kind: 'paused', scope: 'unknown' } })
    expect(refusalOf(500, undefined)).toEqual({ kind: 'failed' })
  })
})
