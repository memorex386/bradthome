import { afterEach, describe, expect, test, vi } from 'vitest'
import { createApp } from '../../../apps/chat-api/src/app.ts'
import { pulseLineOf } from '../../../apps/chat-api/src/log.ts'
import {
  APP_STORE_ID,
  appStoreOf,
  createPulse,
  type Fetcher,
  MAX_AGE_MS,
  memoryPulseStore,
  type PulseAnswer,
  type PulseStore,
  UPSTREAM_TIMEOUT_MS,
} from '../../../apps/chat-api/src/pulse.ts'
import { ALTCHA_KEY, CORPUS, fakeModel, fakeStore, NEXT, PREVIEW } from '../../021/helpers/fakes.ts'

// Spec 041, Story 4: the site's own API answers VINDecoded's live numbers
// from a cache it refreshes at most once an hour, and never breaks (D240).
// Apple is a fake here: nothing reaches the network (FR-012). Amended by spec
// 044 (D247): the API answers the App Store alone, so the GitHub source's
// tests (S4.5, S4.6's count) retired with it; spec 044's tests check that
// nothing of GitHub is left.

const NOW = Date.parse('2026-11-17T15:12:00Z')
const HOUR = 60 * 60 * 1000
const LIVE = 'https://bradthome.com'

const LOOKUP = {
  resultCount: 1,
  results: [
    {
      trackName: 'VIN Check Report, Plate Lookup',
      version: '12.7.8',
      currentVersionReleaseDate: '2026-11-10T17:02:11Z',
      averageUserRating: 4.71234,
      userRatingCount: 3254,
      releaseNotes: 'Notes the API never passes on.',
    },
  ],
}

interface Fake {
  fetch: Fetcher
  calls: { url: string; headers: Record<string, string> }[]
  apple: () => number
}

/** A fake of Apple's lookup, counting each call. */
function fakes(options: { apple?: unknown; appleStatus?: number; hang?: boolean } = {}): Fake {
  const calls: Fake['calls'] = []
  const fetch: Fetcher = async (url, init) => {
    calls.push({ url, headers: init.headers })
    if (options.hang)
      await new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
    if (new URL(url).hostname === 'itunes.apple.com') {
      const status = options.appleStatus ?? 200
      return { ok: status === 200, status, json: async () => options.apple ?? LOOKUP }
    }
    throw new Error(`unexpected ${url}`)
  }
  return { fetch, calls, apple: () => calls.filter((call) => new URL(call.url).hostname === 'itunes.apple.com').length }
}

function setup(options: { store?: PulseStore; fake?: Fake; now?: () => number } = {}) {
  const store = options.store ?? memoryPulseStore()
  const fake = options.fake ?? fakes()
  const lines: string[] = []
  let at = NOW
  const now = options.now ?? (() => at)
  const pulse = createPulse({
    store,
    fetch: fake.fetch,
    log: (source, state, ms) => lines.push(pulseLineOf(source, state, ms)),
    now,
  })
  const app = createApp({
    model: fakeModel(),
    modelId: 'claude-haiku-5-5',
    store: fakeStore().store,
    corpus: CORPUS,
    altchaKey: ALTCHA_KEY,
    write: (line) => lines.push(line),
    pulse,
  })
  const get = (origin: string | null = LIVE) => app.request('/pulse', { headers: origin === null ? {} : { origin } })
  return { app, pulse, store, fake, lines, get, advance: (ms: number) => (at += ms) }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /pulse', () => {
  test('S4.1 FR-005 answers the allowed origins with the App Store, CORS for that origin, Vary and five minutes of browser cache', async () => {
    for (const origin of [LIVE, NEXT, PREVIEW]) {
      const { get } = setup()
      const response = await get(origin)
      expect(response.status, origin).toBe(200)
      expect(response.headers.get('access-control-allow-origin')).toBe(origin)
      expect(response.headers.get('vary')).toMatch(/Origin/)
      expect(response.headers.get('cache-control')).toBe('public, max-age=300')
      expect(await response.json()).toEqual({
        appStore: { version: '12.7.8', released: '2026-11-10', rating: 4.7, ratings: 3254, fetched: '2026-11-17T15:12:00.000Z' },
      })
    }
  })

  test('S4.1 FR-005 refuses every other origin, or none, with 403, no body, no CORS header and no call upstream', async () => {
    for (const origin of ['https://www.bradthome.com', 'https://bradthome.web.app', 'https://evil.example', null]) {
      const { get, fake } = setup()
      const response = await get(origin)
      expect(response.status, String(origin)).toBe(403)
      expect(await response.text()).toBe('')
      expect(response.headers.get('access-control-allow-origin')).toBeNull()
      expect(fake.calls).toHaveLength(0)
    }
  })

  test('S4.1 the app with no pulse answers an empty object, so the card keeps its numbers', async () => {
    const app = createApp({
      model: fakeModel(),
      modelId: 'claude-haiku-5-5',
      store: fakeStore().store,
      corpus: CORPUS,
      altchaKey: ALTCHA_KEY,
      write: () => {},
    })
    const response = await app.request('/pulse', { headers: { origin: LIVE } })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({})
  })
})

describe('the cache', () => {
  test('S4.2 a cache tried within the hour answers with no call upstream', async () => {
    const store = memoryPulseStore({
      appstore: { data: { version: '12.7.7', released: '2026-11-01' }, fetched: NOW - 10 * 60_000, tried: NOW - 10 * 60_000 },
    })
    const { get, fake } = setup({ store })
    const body = (await (await get()).json()) as PulseAnswer
    expect(fake.calls).toHaveLength(0)
    expect(body).toEqual({ appStore: { version: '12.7.7', released: '2026-11-01', fetched: '2026-11-17T15:02:00.000Z' } })
  })

  test('S4.3 SC-002 many visits together, and across instances sharing one store, call Apple once an hour', async () => {
    const store = memoryPulseStore()
    const fake = fakes()
    let at = NOW
    const now = () => at
    const one = setup({ store, fake, now })
    const two = setup({ store, fake, now })
    await Promise.all([...Array.from({ length: 20 }, () => one.get()), ...Array.from({ length: 20 }, () => two.get())])
    expect(fake.apple()).toBe(1)
    // Within the hour, past each instance's minute of memory: still the cache.
    at += 30 * 60_000
    await Promise.all([one.get(), two.get()])
    expect(fake.apple()).toBe(1)
    // A day of visits every minute: at most 24 calls, and one for the start.
    for (let minute = 0; minute < 24 * 60; minute++) {
      at += 60_000
      await one.get()
      await two.get()
    }
    expect(fake.apple()).toBeLessThanOrEqual(25)
  })

  test('S4.3 the claim is atomic: a second claim inside the hour is refused', async () => {
    const store = memoryPulseStore()
    expect(await store.claim('appstore', NOW, NOW - MAX_AGE_MS)).toBe(true)
    expect(await store.claim('appstore', NOW + 1, NOW + 1 - MAX_AGE_MS)).toBe(false)
    expect(await store.claim('appstore', NOW + MAX_AGE_MS + 1, NOW + 1)).toBe(true)
  })
})

describe('when the source fails', () => {
  test('S4.4 a failing source answers its last good numbers with their time, and the route still answers 200', async () => {
    const store = memoryPulseStore({
      appstore: { data: { version: '12.7.7', released: '2026-11-01' }, fetched: NOW - 3 * HOUR, tried: NOW - 2 * HOUR },
    })
    const { get, lines } = setup({ store, fake: fakes({ appleStatus: 503 }) })
    const response = await get()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      appStore: { version: '12.7.7', released: '2026-11-01', fetched: '2026-11-17T12:12:00.000Z' },
    })
    expect(lines.map((line) => (JSON.parse(line) as { state: string }).state)).toEqual(['failed'])
  })

  test('S4.4 a source with nothing cached is left out when it fails', async () => {
    const { get } = setup({ fake: fakes({ apple: { resultCount: 0, results: [] } }) })
    expect(await (await get()).json()).toEqual({})
  })

  test(`S4.4 a source slower than ${UPSTREAM_TIMEOUT_MS / 1000} s is given up, and the last good numbers answer`, async () => {
    const store = memoryPulseStore({
      appstore: { data: { version: '12.7.7', released: '2026-11-01' }, fetched: NOW - 3 * HOUR, tried: NOW - 2 * HOUR },
    })
    const { get } = setup({ store, fake: fakes({ hang: true }) })
    const started = performance.now()
    const body = (await (await get()).json()) as PulseAnswer
    expect(performance.now() - started).toBeLessThan(UPSTREAM_TIMEOUT_MS + 2_000)
    expect(body.appStore?.version).toBe('12.7.7')
  })

  test('S4.4 a store that fails answers nothing for that source, never 5xx', async () => {
    const broken: PulseStore = {
      read: async () => {
        throw new Error('down')
      },
      claim: async () => {
        throw new Error('down')
      },
      write: async () => {
        throw new Error('down')
      },
    }
    const { get, fake } = setup({ store: broken })
    const response = await get()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({})
    expect(fake.calls).toHaveLength(0)
  })

  test('S4.4 a store that reads but fails to write still answers the fresh numbers', async () => {
    const store = memoryPulseStore()
    store.write = async () => {
      throw new Error('down')
    }
    const { get } = setup({ store })
    const body = (await (await get()).json()) as PulseAnswer
    expect(body.appStore?.version).toBe('12.7.8')
  })
})

describe('the source', () => {
  test("S4.6 FR-006 the answer carries the App Store's own fields and nothing else of the lookup", async () => {
    const { get } = setup()
    const text = await (await get()).text()
    expect(text).not.toContain('Notes the API')
    expect(text).not.toContain('VIN Check Report')
  })

  test('S4.7 the lookup gives the version and release day, and the rating only from 100 ratings (D143)', () => {
    expect(appStoreOf(LOOKUP)).toEqual({ version: '12.7.8', released: '2026-11-10', rating: 4.7, ratings: 3254 })
    const few = { results: [{ ...LOOKUP.results[0], userRatingCount: 99 }] }
    expect(appStoreOf(few)).toEqual({ version: '12.7.8', released: '2026-11-10' })
    expect(() => appStoreOf({ results: [{ ...LOOKUP.results[0], version: '<b>1</b>' }] })).toThrow()
    expect(() => appStoreOf({ results: [{ ...LOOKUP.results[0], currentVersionReleaseDate: 'soon' }] })).toThrow()
    expect(() => appStoreOf({ results: [] })).toThrow()
  })

  test("S4.7 asks Apple for VINDecoded's app alone, with no key", async () => {
    const { get, fake } = setup()
    await get()
    const apple = fake.calls.find((call) => new URL(call.url).hostname === 'itunes.apple.com')
    expect(apple?.url).toBe(`https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=us`)
    expect(Object.keys(apple?.headers ?? {})).toEqual(['User-Agent'])
  })
})

describe('the log', () => {
  test('S4.8 FR-006 one numbers-only line per refresh, none per visit, and never the numbers, a token or an address', async () => {
    const { get, lines, advance } = setup()
    await get()
    await get()
    advance(2 * 60_000)
    await get()
    expect(lines).toHaveLength(1)
    for (const line of lines) {
      const fields = JSON.parse(line) as Record<string, unknown>
      expect(Object.keys(fields).sort()).toEqual(['event', 'ms', 'severity', 'source', 'state'])
      expect(fields.event).toBe('pulse.refresh')
      expect(fields.state).toBe('refreshed')
      expect(line).not.toMatch(/12\.7\.8|token|\d+\.\d+\.\d+\.\d+/)
    }
  })

  test('S4.8 the line copies only known words', () => {
    expect(JSON.parse(pulseLineOf('appstore', 'failed', 12.6))).toEqual({
      severity: 'WARNING',
      event: 'pulse.refresh',
      source: 'appstore',
      state: 'failed',
      ms: 13,
    })
    expect(JSON.parse(pulseLineOf('evil' as 'appstore', 'nope' as 'failed', -5))).toEqual({
      severity: 'INFO',
      event: 'pulse.refresh',
      source: 'appstore',
      state: 'refreshed',
      ms: 0,
    })
  })
})
