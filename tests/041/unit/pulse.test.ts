import { afterEach, describe, expect, test, vi } from 'vitest'
import { createApp } from '../../../apps/chat-api/src/app.ts'
import { pulseLineOf } from '../../../apps/chat-api/src/log.ts'
import {
  APP_STORE_ID,
  appStoreOf,
  createPulse,
  type Fetcher,
  MAX_AGE_MS,
  MAX_PAGES,
  memoryPulseStore,
  mergedCountOf,
  type PulseAnswer,
  type PulseStore,
  UPSTREAM_TIMEOUT_MS,
} from '../../../apps/chat-api/src/pulse.ts'
import { ALTCHA_KEY, CORPUS, fakeModel, fakeStore, NEXT, PREVIEW } from '../../021/helpers/fakes.ts'

// Spec 041, Story 4: the site's own API answers VINDecoded's live numbers
// from a cache it refreshes at most once an hour, and never breaks (D240).
// Apple and GitHub are fakes here: nothing reaches the network (FR-012).

const NOW = Date.parse('2026-11-17T15:12:00Z')
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const LIVE = 'https://bradthome.com'
const GITHUB = { token: 'test-token-not-a-secret', repo: 'example-org/example-repo' }

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

/** A closed pull request as GitHub lists it, with the fields the count must never pass on. */
const pull = (n: number, merged: number | null, updated: number) => ({
  number: n,
  title: `A private title ${n}`,
  head: { ref: `agent/private-branch-${n}` },
  user: { login: 'someone' },
  merged_at: merged === null ? null : new Date(merged).toISOString(),
  updated_at: new Date(updated).toISOString(),
})

interface Fake {
  fetch: Fetcher
  calls: { url: string; headers: Record<string, string> }[]
  apple: () => number
  github: () => number
}

/** Fakes of Apple's lookup and GitHub's pull requests list, counting each call. */
function fakes(options: { apple?: unknown; appleStatus?: number; pages?: unknown[][]; githubStatus?: number; hang?: boolean } = {}): Fake {
  const calls: Fake['calls'] = []
  const pages = options.pages ?? [
    [
      pull(1, NOW - DAY, NOW - DAY),
      pull(2, NOW - 2 * DAY, NOW - 2 * DAY),
      pull(3, null, NOW - 3 * DAY),
      pull(4, NOW - 40 * DAY, NOW - 40 * DAY),
    ],
  ]
  const fetch: Fetcher = async (url, init) => {
    calls.push({ url, headers: init.headers })
    if (options.hang)
      await new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
    const host = new URL(url).hostname
    if (host === 'itunes.apple.com') {
      const status = options.appleStatus ?? 200
      return { ok: status === 200, status, json: async () => options.apple ?? LOOKUP }
    }
    if (host === 'api.github.com') {
      const status = options.githubStatus ?? 200
      const page = Number(new URL(url).searchParams.get('page') ?? '1')
      return { ok: status === 200, status, json: async () => pages[page - 1] ?? [] }
    }
    throw new Error(`unexpected ${url}`)
  }
  const count = (host: string) => calls.filter((call) => new URL(call.url).hostname === host).length
  return { fetch, calls, apple: () => count('itunes.apple.com'), github: () => count('api.github.com') }
}

function setup(options: { store?: PulseStore; fake?: Fake; github?: typeof GITHUB | undefined; now?: () => number } = {}) {
  const store = options.store ?? memoryPulseStore()
  const fake = options.fake ?? fakes()
  const lines: string[] = []
  let at = NOW
  const now = options.now ?? (() => at)
  const pulse = createPulse({
    store,
    fetch: fake.fetch,
    ...('github' in options ? (options.github === undefined ? {} : { github: options.github }) : { github: GITHUB }),
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
  test('S4.1 FR-005 answers the allowed origins with both sources, CORS for that origin, Vary and five minutes of browser cache', async () => {
    for (const origin of [LIVE, NEXT, PREVIEW]) {
      const { get } = setup()
      const response = await get(origin)
      expect(response.status, origin).toBe(200)
      expect(response.headers.get('access-control-allow-origin')).toBe(origin)
      expect(response.headers.get('vary')).toMatch(/Origin/)
      expect(response.headers.get('cache-control')).toBe('public, max-age=300')
      expect(await response.json()).toEqual({
        appStore: { version: '12.7.8', released: '2026-11-10', rating: 4.7, ratings: 3254, fetched: '2026-11-17T15:12:00.000Z' },
        github: { merged: 2, days: 30, fetched: '2026-11-17T15:12:00.000Z' },
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
      github: { data: { merged: 280 }, fetched: NOW - 10 * 60_000, tried: NOW - 10 * 60_000 },
    })
    const { get, fake } = setup({ store })
    const body = (await (await get()).json()) as PulseAnswer
    expect(fake.calls).toHaveLength(0)
    expect(body).toEqual({
      appStore: { version: '12.7.7', released: '2026-11-01', fetched: '2026-11-17T15:02:00.000Z' },
      github: { merged: 280, days: 30, fetched: '2026-11-17T15:02:00.000Z' },
    })
  })

  test('S4.3 SC-002 many visits together, and across instances sharing one store, call each source once an hour', async () => {
    const store = memoryPulseStore()
    const fake = fakes()
    let at = NOW
    const now = () => at
    const one = setup({ store, fake, now })
    const two = setup({ store, fake, now })
    await Promise.all([...Array.from({ length: 20 }, () => one.get()), ...Array.from({ length: 20 }, () => two.get())])
    expect(fake.apple()).toBe(1)
    expect(fake.github()).toBe(1)
    // Within the hour, past each instance's minute of memory: still the cache.
    at += 30 * 60_000
    await Promise.all([one.get(), two.get()])
    expect(fake.apple()).toBe(1)
    // A day of visits every minute: at most 24 calls to each.
    for (let minute = 0; minute < 24 * 60; minute++) {
      at += 60_000
      await one.get()
      await two.get()
    }
    expect(fake.apple()).toBeLessThanOrEqual(25)
    expect(fake.github()).toBeLessThanOrEqual(25 * 1)
  })

  test('S4.3 the claim is atomic: a second claim inside the hour is refused', async () => {
    const store = memoryPulseStore()
    expect(await store.claim('appstore', NOW, NOW - MAX_AGE_MS)).toBe(true)
    expect(await store.claim('appstore', NOW + 1, NOW + 1 - MAX_AGE_MS)).toBe(false)
    expect(await store.claim('appstore', NOW + MAX_AGE_MS + 1, NOW + 1)).toBe(true)
  })
})

describe('when a source fails', () => {
  test('S4.4 a failing source answers its last good numbers with their time, and the route still answers 200', async () => {
    const store = memoryPulseStore({
      appstore: { data: { version: '12.7.7', released: '2026-11-01' }, fetched: NOW - 3 * HOUR, tried: NOW - 2 * HOUR },
      github: { data: { merged: 280 }, fetched: NOW - 3 * HOUR, tried: NOW - 2 * HOUR },
    })
    const { get, lines } = setup({ store, fake: fakes({ appleStatus: 503, githubStatus: 401 }) })
    const response = await get()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      appStore: { version: '12.7.7', released: '2026-11-01', fetched: '2026-11-17T12:12:00.000Z' },
      github: { merged: 280, days: 30, fetched: '2026-11-17T12:12:00.000Z' },
    })
    const states = lines.map((line) => JSON.parse(line) as { state: string })
    expect(states.map((line) => line.state).sort()).toEqual(['failed', 'failed'])
  })

  test('S4.4 a source with nothing cached is left out when it fails', async () => {
    const { get } = setup({ fake: fakes({ apple: { resultCount: 0, results: [] }, githubStatus: 500 }) })
    expect(await (await get()).json()).toEqual({})
  })

  test(`S4.4 a source slower than ${UPSTREAM_TIMEOUT_MS / 1000} s is given up, and the last good numbers answer`, async () => {
    const store = memoryPulseStore({
      appstore: { data: { version: '12.7.7', released: '2026-11-01' }, fetched: NOW - 3 * HOUR, tried: NOW - 2 * HOUR },
    })
    const { get } = setup({ store, fake: fakes({ hang: true }), github: undefined })
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
    expect(body.github?.merged).toBe(2)
  })

  test('S4.5 FR-006 with no token or repo, nothing calls GitHub, and the count is the last cached or left out', async () => {
    const empty = setup({ github: undefined })
    expect(((await (await empty.get()).json()) as PulseAnswer).github).toBeUndefined()
    expect(empty.fake.github()).toBe(0)
    const cached = setup({
      github: undefined,
      store: memoryPulseStore({ github: { data: { merged: 296 }, fetched: NOW - 5 * DAY, tried: NOW - 5 * DAY } }),
    })
    expect(((await (await cached.get()).json()) as PulseAnswer).github).toEqual({
      merged: 296,
      days: 30,
      fetched: new Date(NOW - 5 * DAY).toISOString(),
    })
    expect(cached.fake.github()).toBe(0)
    expect(
      cached.lines.map((line) => JSON.parse(line) as { state: string; source: string }).filter((line) => line.source === 'github'),
    ).toEqual([expect.objectContaining({ source: 'github', state: 'missing' })])
  })
})

describe('the sources', () => {
  test('S4.6 counts the pull requests merged in the 30 days before now, reading only the merge and update times', async () => {
    const fake = fakes()
    expect(await mergedCountOf(fake.fetch, GITHUB, NOW)).toEqual({ merged: 2 })
    const [call] = fake.calls
    const url = new URL(call?.url ?? '')
    expect(url.pathname).toBe('/repos/example-org/example-repo/pulls')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: '100',
      page: '1',
    })
    expect(call?.headers.Authorization).toBe(`Bearer ${GITHUB.token}`)
  })

  test('S4.6 reads the next page until one reaches back past the window, and no further', async () => {
    const full = Array.from({ length: 100 }, (_, i) => pull(i, NOW - DAY, NOW - DAY))
    const last = [pull(200, NOW - 2 * DAY, NOW - 2 * DAY), pull(201, NOW - 31 * DAY, NOW - 31 * DAY)]
    const fake = fakes({ pages: [full, full, last, full] })
    expect(await mergedCountOf(fake.fetch, GITHUB, NOW)).toEqual({ merged: 201 })
    expect(fake.github()).toBe(3)
  })

  test(`S4.6 gives up past ${MAX_PAGES} pages, so a count is never partial`, async () => {
    const full = Array.from({ length: 100 }, (_, i) => pull(i, NOW - DAY, NOW - DAY))
    const fake = fakes({ pages: Array.from({ length: MAX_PAGES + 2 }, () => full) })
    await expect(mergedCountOf(fake.fetch, GITHUB, NOW)).rejects.toThrow(/pages/)
    expect(fake.github()).toBe(MAX_PAGES)
  })

  test("S4.6 FR-006 a repo that isn't owner/name is never asked for", async () => {
    const fake = fakes()
    await expect(mergedCountOf(fake.fetch, { token: 't', repo: '../../users/x' }, NOW)).rejects.toThrow()
    expect(fake.calls).toHaveLength(0)
  })

  test('S4.6 FR-006 the answer carries the count and nothing else of the repo', async () => {
    const { get } = setup()
    const text = await (await get()).text()
    for (const word of ['private', 'agent/', 'someone', 'example-org', 'example-repo', GITHUB.token, 'Notes the API'])
      expect(text).not.toContain(word)
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
    const { get, fake } = setup({ github: undefined })
    await get()
    const apple = fake.calls.find((call) => new URL(call.url).hostname === 'itunes.apple.com')
    expect(apple?.url).toBe(`https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=us`)
    expect(Object.keys(apple?.headers ?? {})).toEqual(['User-Agent'])
  })
})

describe('the log', () => {
  test('S4.8 FR-006 one numbers-only line per refresh, none per visit, and never the count, repo, token or an address', async () => {
    const { get, lines, advance } = setup()
    await get()
    await get()
    advance(2 * 60_000)
    await get()
    expect(lines).toHaveLength(2)
    for (const line of lines) {
      const fields = JSON.parse(line) as Record<string, unknown>
      expect(Object.keys(fields).sort()).toEqual(['event', 'ms', 'severity', 'source', 'state'])
      expect(fields.event).toBe('pulse.refresh')
      expect(fields.state).toBe('refreshed')
      expect(line).not.toMatch(/296|example|token|\d+\.\d+\.\d+\.\d+/)
    }
  })

  test('S4.8 the line copies only known words', () => {
    expect(JSON.parse(pulseLineOf('github', 'failed', 12.6))).toEqual({
      severity: 'WARNING',
      event: 'pulse.refresh',
      source: 'github',
      state: 'failed',
      ms: 13,
    })
    expect(JSON.parse(pulseLineOf('evil' as 'github', 'nope' as 'failed', -5))).toEqual({
      severity: 'INFO',
      event: 'pulse.refresh',
      source: 'appstore',
      state: 'missing',
      ms: 0,
    })
  })
})
