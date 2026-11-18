// VINDecoded's live pulse (spec 041, D240; spec 044, D247): GET /pulse
// answers the card's live App Store numbers as small JSON, with the time they
// were fetched, from Apple's public lookup API, which needs no key. The last
// good answer is cached in Firestore, and a visit only reads that cache: when
// it's over an hour old, one request claims a lease and refetches it, so
// however many visits come, Apple is called at most once an hour. Nothing
// about a visitor is kept. The merged-PR count isn't here: since D247 it's
// counted on Brad's PC by `pnpm previews:refresh` and built into the page, so
// the API reads no GitHub token and answers nothing of GitHub.

/** The App Store app the card shows: VINDecoded's, which its claims link. */
export const APP_STORE_ID = '1191483515'

/** How old a source's cache may get before a visit refreshes it (Brad's card, D240). */
export const MAX_AGE_MS = 60 * 60 * 1000

/** How long an instance reuses its last answer before it reads Firestore again. */
export const MEMORY_MS = 60 * 1000

/** How long each upstream call may take before the last good numbers answer instead. */
export const UPSTREAM_TIMEOUT_MS = 4_000

/** How long a browser may reuse an answer. */
export const BROWSER_SECONDS = 300

/** The smallest number of ratings the answer gives a rating for (D143). */
export const MIN_RATINGS = 100

export type Source = 'appstore'
export const SOURCES: readonly Source[] = ['appstore']

export interface AppStoreData {
  version: string
  /** The release's day, YYYY-MM-DD, in UTC. */
  released: string
  rating?: number
  ratings?: number
}

export interface DataOf {
  appstore: AppStoreData
}

/** A source's cache: its last good data and when it was fetched, and when a refresh was last tried. */
export interface Cached<S extends Source = Source> {
  data?: DataOf[S]
  /** When the data was fetched, in ms since the epoch. */
  fetched?: number
  /** When a refresh was last claimed, in ms since the epoch. */
  tried?: number
}

export interface PulseStore {
  read<S extends Source>(source: S): Promise<Cached<S> | undefined>
  /** Claims the next refresh when the last was tried before `stale`, atomically, so one request refreshes at a time. */
  claim(source: Source, now: number, stale: number): Promise<boolean>
  write<S extends Source>(source: S, data: DataOf[S], now: number): Promise<void>
}

/** What /pulse answers: the App Store's numbers, or nothing when it has none. Never anything of GitHub (D247). */
export interface PulseAnswer {
  appStore?: AppStoreData & { fetched: string }
}

export interface Fetcher {
  (
    url: string,
    init: { headers: Record<string, string>; signal: AbortSignal },
  ): Promise<{
    ok: boolean
    status: number
    json(): Promise<unknown>
  }>
}

export interface PulseDeps {
  store: PulseStore
  fetch?: Fetcher
  /** Each refresh's numbers-only line. */
  log?: (source: Source, state: 'refreshed' | 'failed', ms: number) => void
  now?: () => number
}

const VERSION = /^[0-9][0-9A-Za-z.-]{0,31}$/

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined

/** The App Store data in Apple's lookup answer, or throws. */
export function appStoreOf(body: unknown): AppStoreData {
  const results = record(body)?.results
  const app = Array.isArray(results) ? record(results[0]) : undefined
  if (app === undefined) throw new Error('the lookup found no app')
  const version = app.version
  if (typeof version !== 'string' || !VERSION.test(version)) throw new Error('the lookup has no version')
  const at = typeof app.currentVersionReleaseDate === 'string' ? new Date(app.currentVersionReleaseDate) : undefined
  if (at === undefined || Number.isNaN(at.getTime())) throw new Error('the lookup has no release date')
  const data: AppStoreData = { version, released: at.toISOString().slice(0, 10) }
  const count = app.userRatingCount
  const average = app.averageUserRating
  if (
    typeof count === 'number' &&
    Number.isInteger(count) &&
    count >= MIN_RATINGS &&
    typeof average === 'number' &&
    average >= 0 &&
    average <= 5
  ) {
    data.rating = Math.round(average * 10) / 10
    data.ratings = count
  }
  return data
}

async function appStoreNow(fetcher: Fetcher): Promise<AppStoreData> {
  const response = await fetcher(`https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=us`, {
    headers: { 'User-Agent': 'bradthome.com pulse' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Apple answered ${response.status}`)
  return appStoreOf(await response.json())
}

/** The pulse: reads the cache, refreshes a stale source once, and answers what it has. It never throws. */
export function createPulse(deps: PulseDeps): { answer(): Promise<PulseAnswer> } {
  const fetcher: Fetcher = deps.fetch ?? ((url, init) => fetch(url, init))
  const now = deps.now ?? Date.now
  const log = deps.log ?? (() => {})
  let memory: { at: number; answer: PulseAnswer } | undefined
  let inFlight: Promise<PulseAnswer> | undefined

  const fresh = async <S extends Source>(source: S, fetchOne: () => Promise<DataOf[S]>): Promise<Cached<S> | undefined> => {
    let cached: Cached<S> | undefined
    try {
      cached = await deps.store.read(source)
    } catch {
      return undefined
    }
    const at = now()
    if ((cached?.tried ?? 0) > at - MAX_AGE_MS && cached?.tried !== undefined && cached.tried <= at) return cached
    try {
      if (!(await deps.store.claim(source, at, at - MAX_AGE_MS))) return cached
    } catch {
      return cached
    }
    const started = now()
    try {
      const data = await fetchOne()
      const fetched = now()
      try {
        await deps.store.write(source, data, fetched)
      } catch {
        // The answer still has it; the next refresh writes again.
      }
      log(source, 'refreshed', fetched - started)
      return { ...cached, data, fetched, tried: at }
    } catch {
      log(source, 'failed', now() - started)
      return cached
    }
  }

  const read = async (): Promise<PulseAnswer> => {
    const appStore = await fresh('appstore', () => appStoreNow(fetcher))
    const answer: PulseAnswer = {}
    // Only the App Store's own fields go out, whatever else the store holds.
    if (appStore?.data !== undefined && appStore.fetched !== undefined) {
      const { version, released, rating, ratings } = appStore.data
      answer.appStore = {
        version,
        released,
        ...(rating === undefined ? {} : { rating }),
        ...(ratings === undefined ? {} : { ratings }),
        fetched: new Date(appStore.fetched).toISOString(),
      }
    }
    return answer
  }

  return {
    async answer() {
      const at = now()
      if (memory !== undefined && at - memory.at < MEMORY_MS && at >= memory.at) return memory.answer
      // Visits that arrive together share one read.
      inFlight ??= read().finally(() => {
        inFlight = undefined
      })
      const answer = await inFlight
      memory = { at, answer }
      return answer
    },
  }
}

/** A store in memory, for tests and for running the API without Firestore. */
export function memoryPulseStore(
  seed: Partial<{ [S in Source]: Cached<S> }> = {},
): PulseStore & { cache: Partial<{ [S in Source]: Cached<S> }> } {
  const cache: Partial<{ [S in Source]: Cached }> = { ...seed }
  return {
    cache: cache as Partial<{ [S in Source]: Cached<S> }>,
    async read(source) {
      return cache[source] as Cached<typeof source> | undefined
    },
    async claim(source, now, stale) {
      const tried = cache[source]?.tried
      if (tried !== undefined && tried > stale && tried <= now) return false
      cache[source] = { ...cache[source], tried: now }
      return true
    },
    async write(source, data, now) {
      cache[source] = { ...cache[source], data, fetched: now }
    },
  }
}
