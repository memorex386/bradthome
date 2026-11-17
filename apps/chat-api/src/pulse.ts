// VINDecoded's live pulse (spec 041, D240): GET /pulse answers the card's
// live numbers as small JSON, each with the time it was fetched. The App
// Store's come from Apple's public lookup API; the merged-PR count comes from
// VINDecoded's private repo, read with a read-only token. Each source's last
// good answer is cached in Firestore, and a visit only reads that cache: when
// a source's cache is over an hour old, one request claims a lease and
// refetches it, so however many visits come, each source is called at most
// once an hour. Nothing about a visitor is kept, and nothing of the repo but
// the count leaves the server: no titles, branches, authors or its name.

/** The App Store app the card shows: VINDecoded's, which its claims link. */
export const APP_STORE_ID = '1191483515'

/** How old a source's cache may get before a visit refreshes it (Brad's card, D240). */
export const MAX_AGE_MS = 60 * 60 * 1000

/** How long an instance reuses its last answer before it reads Firestore again. */
export const MEMORY_MS = 60 * 1000

/** How long each upstream call may take before the last good numbers answer instead. */
export const UPSTREAM_TIMEOUT_MS = 4_000

/** The window the merged-PR count covers. */
export const MERGED_DAYS = 30

/** The most pages of closed pull requests a count reads, 100 a page. */
export const MAX_PAGES = 20

/** How long a browser may reuse an answer. */
export const BROWSER_SECONDS = 300

/** The smallest number of ratings the answer gives a rating for (D143). */
export const MIN_RATINGS = 100

export type Source = 'appstore' | 'github'
export const SOURCES: readonly Source[] = ['appstore', 'github']

export interface AppStoreData {
  version: string
  /** The release's day, YYYY-MM-DD, in UTC. */
  released: string
  rating?: number
  ratings?: number
}

export interface GithubData {
  merged: number
}

export interface DataOf {
  appstore: AppStoreData
  github: GithubData
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

/** What /pulse answers: each source with its data, or nothing for a source that has none. */
export interface PulseAnswer {
  appStore?: AppStoreData & { fetched: string }
  github?: GithubData & { days: number; fetched: string }
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
  /** The read-only token and the repo, from Secret Manager. Without both, the count stays as last cached. */
  github?: { token: string; repo: string }
  /** Each refresh's numbers-only line. */
  log?: (source: Source, state: 'refreshed' | 'failed' | 'missing', ms: number) => void
  now?: () => number
}

const REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/
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

/**
 * The pull requests merged in the 30 days before `now`, counted from the
 * repo's closed pull requests, newest update first: a pull request merged in
 * the window was updated in it, so the count stops at the first page that
 * reaches back past it. Only `merged_at` and `updated_at` are read.
 */
export async function mergedCountOf(fetcher: Fetcher, github: { token: string; repo: string }, now: number): Promise<GithubData> {
  if (!REPO.test(github.repo)) throw new Error("the repo isn't owner/name")
  const since = now - MERGED_DAYS * 24 * 60 * 60 * 1000
  const signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  let merged = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://api.github.com/repos/${github.repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`
    const response = await fetcher(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${github.token}`,
        'User-Agent': 'bradthome.com pulse',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal,
    })
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`)
    const pulls = await response.json()
    if (!Array.isArray(pulls)) throw new Error("GitHub's answer isn't a list")
    let older = false
    for (const pull of pulls) {
      const fields = record(pull)
      const mergedAt = typeof fields?.merged_at === 'string' ? Date.parse(fields.merged_at) : Number.NaN
      const updatedAt = typeof fields?.updated_at === 'string' ? Date.parse(fields.updated_at) : Number.NaN
      if (mergedAt >= since && mergedAt <= now) merged++
      if (updatedAt < since) older = true
    }
    if (older || pulls.length < 100) return { merged }
  }
  throw new Error('the count needs more pages than it may read')
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

  const fresh = async <S extends Source>(source: S, fetchOne: (() => Promise<DataOf[S]>) | undefined): Promise<Cached<S> | undefined> => {
    let cached: Cached<S> | undefined
    try {
      cached = await deps.store.read(source)
    } catch {
      return undefined
    }
    const at = now()
    if ((cached?.tried ?? 0) > at - MAX_AGE_MS && cached?.tried !== undefined && cached.tried <= at) return cached
    if (fetchOne === undefined) {
      // No token or repo: the last count stays, refreshed by nothing.
      if (cached?.tried === undefined || cached.tried <= at - MAX_AGE_MS) {
        try {
          if (await deps.store.claim(source, at, at - MAX_AGE_MS)) log(source, 'missing', 0)
        } catch {
          // The next visit tries the claim again.
        }
      }
      return cached
    }
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
    const github = deps.github
    const [appStore, merged] = await Promise.all([
      fresh('appstore', () => appStoreNow(fetcher)),
      fresh('github', github === undefined ? undefined : () => mergedCountOf(fetcher, github, now())),
    ])
    const answer: PulseAnswer = {}
    if (appStore?.data !== undefined && appStore.fetched !== undefined)
      answer.appStore = { ...appStore.data, fetched: new Date(appStore.fetched).toISOString() }
    if (merged?.data !== undefined && merged.fetched !== undefined)
      answer.github = { merged: merged.data.merged, days: MERGED_DAYS, fetched: new Date(merged.fetched).toISOString() }
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
