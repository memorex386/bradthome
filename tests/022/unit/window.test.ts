import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { PRICES as API_PRICES, costOf as apiCostOf } from '../../../apps/chat-api/src/spend.ts'
import { hrefOf } from '../../../apps/site/src/components/chat/corpus.ts'
import { costOf, dollarsOf, PRICES, secondsOf } from '../../../apps/site/src/components/chat/inspect.ts'
import { eventOf, eventsOf, type StreamEvent } from '../../../apps/site/src/components/chat/stream.ts'
import { HELD, META } from '../../../apps/site/src/components/chat/fixtures.ts'
import * as WORDS from '../../../apps/site/src/components/chat/words.ts'

// Spec 022: the window's pieces that need no browser: the stream reader,
// Inspect's numbers, a source's link, the reset time, the mail links and the
// words.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const CHAT = path.join(ROOT, 'apps', 'site', 'src', 'components', 'chat')

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

async function all(chunks: string[]): Promise<StreamEvent[]> {
  const events: StreamEvent[] = []
  for await (const event of eventsOf(streamOf(chunks))) events.push(event)
  return events
}

const sse = (part: unknown) => `data: ${JSON.stringify(part)}\n\n`

describe('the stream reader', () => {
  test('S2.3 S2.4 it reads text, sources and numbers, and skips the parts the window does not show', async () => {
    const events = await all([
      sse({ type: 'start' }),
      sse({ type: 'text-start', id: 't' }),
      sse({ type: 'text-delta', id: 't', delta: 'Brad ' }),
      sse({ type: 'text-delta', id: 't', delta: 'built it.' }),
      sse({ type: 'text-end', id: 't' }),
      sse({ type: 'source-url', sourceId: 'job-hopper', url: 'https://bradthome.com/#hopper', title: 'Résumé · Hopper' }),
      sse({ type: 'data-meta', data: META }),
      sse({ type: 'finish' }),
      'data: [DONE]\n\n',
    ])
    expect(events).toEqual([
      { type: 'text', delta: 'Brad ' },
      { type: 'text', delta: 'built it.' },
      { type: 'source', source: { id: 'job-hopper', url: 'https://bradthome.com/#hopper', label: 'Résumé · Hopper' } },
      { type: 'meta', meta: META },
    ])
  })

  test('S2.3 an event split across chunks, or ended with CRLF, is read whole', async () => {
    const whole = sse({ type: 'text-delta', id: 't', delta: 'split word' })
    expect(await all([whole.slice(0, 9), whole.slice(9, 20), whole.slice(20)])).toEqual([{ type: 'text', delta: 'split word' }])
    expect(await all([`data: ${JSON.stringify({ type: 'text-delta', delta: 'crlf' })}\r\n\r\n`])).toEqual([{ type: 'text', delta: 'crlf' }])
  })

  test('S6.3 an error part, or data that is not JSON, is an error; numbers in the wrong shape are dropped', () => {
    expect(eventOf(JSON.stringify({ type: 'error', errorText: 'failed' }))).toEqual({ type: 'error' })
    expect(eventOf('{not json')).toEqual({ type: 'error' })
    expect(eventOf(JSON.stringify({ type: 'data-meta', data: { state: 'answered' } }))).toBeUndefined()
  })
})

describe('Inspect', () => {
  test("S4.2 FR-006 the window's prices are the API's, and its cost is the API's for every priced model", () => {
    expect(PRICES).toEqual(API_PRICES)
    for (const model of Object.keys(API_PRICES)) {
      const meta = { ...META, model, cacheWriteTokens: 1_234 }
      expect(costOf(meta)).toBeCloseTo(
        apiCostOf(model, { noCache: meta.inputTokens, cacheRead: meta.cacheReadTokens, cacheWrite: meta.cacheWriteTokens, output: meta.outputTokens }),
        12,
      )
    }
    expect(costOf({ ...META, model: 'unpriced' })).toBeUndefined()
  })

  test('S4.1 time shows in seconds to one place, and a cost under a cent to four places', () => {
    expect(secondsOf(2340)).toBe('2.3 s')
    expect(dollarsOf(0.000_327)).toBe('$0.0003')
    expect(dollarsOf(0.0123)).toBe('$0.012')
    expect(WORDS.INSPECT.readDetail(20_725, 0)).toBe('20,725 tokens from the cache')
    expect(WORDS.INSPECT.readDetail(0, 20_725)).toBe('20,725 tokens written to the cache')
  })
})

describe('links and times', () => {
  test("S3.2 FR-005 a bradthome.com source opens on the site the visitor is on, and any other link stays as it is", () => {
    expect(hrefOf('https://bradthome.com/#receipt-hopper-fintech-ai-1')).toBe('/#receipt-hopper-fintech-ai-1')
    expect(hrefOf('https://bradthome.com/vindecoded-agents#new-features-ship-dark')).toBe('/vindecoded-agents#new-features-ship-dark')
    expect(hrefOf('https://example.org/x')).toBe('https://example.org/x')
  })

  test("S6.1 the limit's reset is written in the visitor's time, or UTC, or midnight UTC with no time sent", () => {
    expect(WORDS.resetOf('2026-11-09T00:00:00.000Z', 'UTC')).toBe('at 12:00 AM UTC')
    expect(WORDS.resetOf('2026-11-09T00:00:00.000Z', 'America/Chicago')).toBe('at 6:00 PM your time')
    expect(WORDS.resetOf(undefined)).toBe('at midnight UTC')
    expect(WORDS.resetOf('not a date')).toBe('at midnight UTC')
  })

  test('S5.1 S5.2 the no-source email carries the question in its body; the boundary email carries none', () => {
    const withQuestion = new URL(WORDS.mailtoOf('Has Brad shipped Rust & Go?'))
    expect(withQuestion.protocol).toBe('mailto:')
    expect(withQuestion.pathname).toBe('brad@bradthome.com')
    expect(withQuestion.searchParams.get('body')).toBe('Has Brad shipped Rust & Go?')
    expect(withQuestion.searchParams.get('subject')).toBe(WORDS.HANDOFF.subject)
    expect(new URL(WORDS.mailtoOf()).searchParams.has('body')).toBe(false)
    expect(WORDS.mailtoOf()).not.toContain('+')
  })
})

describe('the words', () => {
  test('FR-011 every word the window shows calls Brad "Brad", never a pronoun', () => {
    const shown: string[] = []
    const collect = (value: unknown): void => {
      if (typeof value === 'string') shown.push(value)
      else if (typeof value === 'function') shown.push(String((value as (...args: number[]) => unknown)(3, 0)))
      else if (value !== null && typeof value === 'object') Object.values(value).forEach(collect)
    }
    collect(WORDS)
    expect(shown.length).toBeGreaterThan(40)
    for (const words of shown) expect(words, words).not.toMatch(/\b(he|him|his|she|her|hers)\b/i)
    expect(shown.join(' ')).toMatch(/Brad/)
  })

  test('S10.1 the gallery holds every state in the spec but A1, once each', () => {
    expect(HELD.map((state) => state.id)).toEqual(['A2', 'K1', 'A3', 'A4', 'A5', 'A6', 'A8', 'A9', 'A10', 'A11', 'A12', 'K2'])
  })

  test("S8.1 FR-008 the site's analytics skips every click inside the chat's dialog", () => {
    const sender = readFileSync(path.join(ROOT, 'apps', 'site', 'src', 'components', 'analytics', 'analytics.client.ts'), 'utf8')
    const onLink = sender.slice(sender.indexOf('const onLink'))
    const skip = onLink.indexOf("__BRADTHOME_CHAT__ && link.closest('[data-chat-dialog]') !== null) return")
    expect(skip).toBeGreaterThan(0)
    expect(skip).toBeLessThan(onLink.indexOf('track('))
  })

  test('S8.2 FR-008 nothing in the window logs to the console or stores anything in the browser', () => {
    for (const name of readdirSync(CHAT)) {
      const source = readFileSync(path.join(CHAT, name), 'utf8')
      expect(source, name).not.toMatch(/\bconsole\.|localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon/)
      expect(source, name).not.toMatch(/\btrack\(/)
    }
  })
})
