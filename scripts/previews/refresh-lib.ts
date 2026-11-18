import { createHash } from 'node:crypto'
import { appStoreOf } from '../../apps/chat-api/src/pulse.ts'
import {
  type AppStoreSnapshot,
  type PulseSnapshot,
  pulseSnapshotSchema,
  appStoreIdOf,
  GITHUB_LOGIN,
  type GithubSnapshot,
  roughCount,
  type Snapshot,
  type Snapshots,
  snapshotSchema,
} from '../../apps/site/src/content/previews.ts'

// The link previews' refresh (spec 016, D48). It fetches GitHub's public REST
// API for Brad's profile (D150) and Apple's public lookup API, builds each snapshot, and keeps a
// source's last snapshot whenever its fetch fails, so a card never blanks.
// A snapshot's date moves only when its data changed, so an unchanged source
// changes nothing and opens no pull request. Everything that touches the
// network or the disk is passed in, so the tests run on recorded responses.

export interface Fetcher {
  json(url: string): Promise<unknown>
  bytes(url: string): Promise<Uint8Array>
}

export interface RefreshInput {
  /** The snapshots committed today. */
  old: Snapshots
  /** The App Store IDs the claims' evidence links. */
  appIds: readonly string[]
  /** Today, as YYYY-MM-DD. */
  today: string
  fetcher: Fetcher
  /** Resizes an image to the cards' size, as WebP. */
  resize(bytes: Uint8Array): Promise<Uint8Array>
}

export interface RefreshResult {
  snapshots: Snapshots
  /** The images the snapshots name, by file name. */
  images: Map<string, Uint8Array>
  changed: string[]
  failed: { key: string; reason: string }[]
}

/** The App Store IDs among the claims' evidence links, sorted. */
export function appIdsOf(claims: Record<string, { evidence: readonly string[] }>): string[] {
  const ids = new Set<string>()
  for (const claim of Object.values(claims)) {
    for (const href of claim.evidence) {
      const id = appStoreIdOf(href)
      if (id !== undefined) ids.add(id)
    }
  }
  return [...ids].sort()
}

/** The image's file name: its key and the first 12 hex digits of its hash. */
export function imageNameOf(key: string, bytes: Uint8Array): string {
  return `${key}-${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.webp`
}

const record = (value: unknown, what: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${what} isn't an object`)
  return value as Record<string, unknown>
}
const string = (value: unknown, what: string): string => {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${what} is missing`)
  return value.trim()
}
const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.replace(/\s+/g, ' ').trim() : undefined

/**
 * A listing's opening words: its first paragraph's whole sentences, up to 160
 * characters, or its first sentence cut at a word with an ellipsis.
 */
export function summaryOf(description: string | undefined): string | undefined {
  const paragraph = description
    ?.split(/\n/)
    .map((line) => line.trim())
    .find((line) => line !== '')
  if (paragraph === undefined) return undefined
  const sentences = paragraph.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [paragraph]
  let summary = ''
  for (const sentence of sentences) {
    const next = `${summary} ${sentence.trim()}`.trim()
    if (next.length > 160) break
    summary = next
  }
  if (summary !== '') return summary
  const cut = paragraph.slice(0, 159)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:]+$/, '')}…`
}

async function imageOf(input: RefreshInput, key: string, url: string, images: Map<string, Uint8Array>): Promise<string> {
  const resized = await input.resize(await input.fetcher.bytes(url))
  const name = imageNameOf(key, resized)
  images.set(name, resized)
  return name
}

async function github(input: RefreshInput, images: Map<string, Uint8Array>): Promise<Omit<GithubSnapshot, 'fetched'>> {
  const base = `https://api.github.com/users/${GITHUB_LOGIN}`
  const user = record(await input.fetcher.json(base), 'the GitHub user')
  const avatar = string(user.avatar_url, 'the avatar')
  return {
    source: 'github',
    href: `https://github.com/${GITHUB_LOGIN}`,
    name: string(user.name, 'the name'),
    login: string(user.login, 'the login'),
    bio: optionalString(user.bio),
    publicRepos: typeof user.public_repos === 'number' ? user.public_repos : 0,
    image: await imageOf(input, 'github', `${avatar}${avatar.includes('?') ? '&' : '?'}s=240`, images),
  }
}

async function appStore(input: RefreshInput, id: string, images: Map<string, Uint8Array>): Promise<Omit<AppStoreSnapshot, 'fetched'>> {
  const body = record(await input.fetcher.json(`https://itunes.apple.com/lookup?id=${id}&country=us`), 'the lookup')
  const results = body.results
  if (!Array.isArray(results) || results.length === 0) throw new Error('the lookup found no app')
  const app = record(results[0], 'the app')
  const view = new URL(string(app.trackViewUrl, 'the listing'))
  view.search = ''
  const rating = typeof app.averageUserRating === 'number' ? Math.round(app.averageUserRating * 10) / 10 : undefined
  const ratings = typeof app.userRatingCount === 'number' ? roughCount(app.userRatingCount) : undefined
  const artwork = string(app.artworkUrl512 ?? app.artworkUrl100, 'the icon')
  const summary = summaryOf(typeof app.description === 'string' ? app.description : undefined)
  return {
    source: 'appstore',
    id,
    href: view.toString(),
    name: string(app.trackName, "the app's name"),
    seller: string(app.sellerName ?? app.artistName, 'the seller'),
    genre: string(app.primaryGenreName, 'the category'),
    ...(summary === undefined ? {} : { summary }),
    ...(rating === undefined ? {} : { rating }),
    ...(ratings === undefined ? {} : { ratings }),
    image: await imageOf(input, `appstore-${id}`, artwork, images),
  }
}

/** A snapshot's fields less its date, in a stable order, to compare two. */
export function sameData(a: Snapshot | undefined, b: Omit<Snapshot, 'fetched'>): boolean {
  if (a === undefined) return false
  const { fetched: _, ...rest } = a
  const stable = (value: unknown): string =>
    JSON.stringify(value, (_key, inner: unknown) =>
      inner !== null && typeof inner === 'object' && !Array.isArray(inner)
        ? Object.fromEntries(Object.entries(inner).sort(([x], [y]) => x.localeCompare(y)))
        : inner,
    )
  return stable(rest) === stable(b)
}

/** Fetches every source. A failing source keeps its last snapshot and is reported. */
export async function refresh(input: RefreshInput): Promise<RefreshResult> {
  const snapshots: Snapshots = {}
  const images = new Map<string, Uint8Array>()
  const changed: string[] = []
  const failed: { key: string; reason: string }[] = []
  const sources: [string, (found: Map<string, Uint8Array>) => Promise<Omit<Snapshot, 'fetched'>>][] = [
    ['github', (found) => github(input, found)],
    ...input.appIds.map((id): [string, (found: Map<string, Uint8Array>) => Promise<Omit<Snapshot, 'fetched'>>] => [
      `appstore-${id}`,
      (found) => appStore(input, id, found),
    ]),
  ]
  for (const [key, fetchOne] of sources) {
    const old = input.old[key]
    const found = new Map<string, Uint8Array>()
    try {
      const data = await fetchOne(found)
      if (sameData(old, data)) {
        snapshots[key] = old as Snapshot
      } else {
        snapshots[key] = snapshotSchema.parse({ ...data, fetched: input.today })
        for (const [name, bytes] of found) images.set(name, bytes)
        changed.push(key)
      }
    } catch (error) {
      failed.push({ key, reason: error instanceof Error ? error.message : String(error) })
      if (old !== undefined) snapshots[key] = old
    }
  }
  for (const key of Object.keys(input.old)) {
    if (!(key in snapshots)) changed.push(key)
  }
  return { snapshots, images, changed, failed }
}

/** The snapshots file's text: keys sorted, two-space indent, a final newline. */
export function snapshotsText(snapshots: Snapshots): string {
  const sorted = Object.fromEntries(Object.entries(snapshots).sort(([a], [b]) => a.localeCompare(b)))
  return `${JSON.stringify(sorted, null, 2)}\n`
}

/** The image files the snapshots name. */
export function imagesNamed(snapshots: Snapshots): Set<string> {
  return new Set(Object.values(snapshots).flatMap((snapshot) => (snapshot.image === undefined ? [] : [snapshot.image])))
}

/** What the run prints: one line per changed or failed source. */
export function reportOf(result: RefreshResult): string[] {
  const lines = [
    ...result.changed.map((key) => `✓ ${key} changed`),
    ...result.failed.map(({ key, reason }) => `✖ ${key} failed, so its last snapshot stays: ${reason}`),
  ]
  if (lines.length === 0) lines.push('Every source is unchanged.')
  return lines
}

/** The window the merged-PR count covers, in days. */
export const MERGED_DAYS = 30

/**
 * The git setting on this PC that names VINDecoded's repo as owner/name
 * (spec 044, D247). It lives in the PC's own git config, never in this repo,
 * and nothing here prints, logs or writes its value.
 */
export const REPO_SETTING = 'bradthome.pulseRepo'

const REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/

/** Runs a command on this PC and returns what it printed. A command that couldn't start has a null status. */
export type Runner = (command: string, args: readonly string[]) => { status: number | null; stdout: string; stderr: string }

/**
 * The pull requests merged in the 30 days before `now`, counted on this PC
 * through Brad's own signed-in gh (spec 044, D247): one read-only search, whose
 * answer gh trims to the count before it reaches this script, so no title,
 * branch, author or name ever does. No token is read, asked for or stored.
 * Every error says why in words of its own, never gh's, which could hold the
 * repo's name.
 */
export function mergedCountOf(run: Runner, now: number): number {
  const setting = run('git', ['config', '--get', REPO_SETTING])
  const repo = setting.status === 0 ? setting.stdout.trim() : ''
  if (repo === '') throw new Error(`the setting ${REPO_SETTING} isn't on this PC (docs/release.md says how to add it)`)
  if (!REPO.test(repo)) throw new Error(`the setting ${REPO_SETTING} isn't owner/name`)
  const since = new Date(now - MERGED_DAYS * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
  const answer = run('gh', [
    'api',
    '--method=GET',
    'search/issues',
    '-f',
    `q=repo:${repo} is:pr is:merged merged:>=${since}`,
    '-f',
    'per_page=1',
    '--jq',
    '[.total_count, .incomplete_results]',
  ])
  if (answer.status === null) throw new Error("gh isn't installed on this PC")
  if (answer.status !== 0) {
    if (/gh auth login|not logged in|authentication/i.test(answer.stderr))
      throw new Error("gh isn't signed in on this PC (run gh auth login)")
    const http = /\bHTTP (\d{3})\b/.exec(answer.stderr)?.[1]
    throw new Error(http === undefined ? `gh failed (exit ${answer.status})` : `GitHub answered ${http}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(answer.stdout)
  } catch {
    throw new Error("GitHub's answer didn't parse")
  }
  if (!Array.isArray(parsed) || parsed.length !== 2) throw new Error("GitHub's answer isn't a count")
  const [count, incomplete] = parsed as unknown[]
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) throw new Error("GitHub's answer isn't a count")
  if (incomplete !== false) throw new Error("GitHub's count was incomplete, so it isn't used")
  return count
}

/**
 * The numbers VINDecoded's card is built with (spec 041, D240; spec 044,
 * D247): its latest iOS release, from Apple's public lookup, and its
 * merged-PR count, from `count`, which runs on Brad's PC. Each part takes
 * today's day whenever it's checked, since the day says when the numbers were
 * last true, and the count covers the 30 days to it. A part that fails keeps
 * its last numbers and day and is reported, so the run fails as a failing
 * source does.
 */
export async function pulseOf(
  old: PulseSnapshot,
  fetcher: Pick<Fetcher, 'json'>,
  lookup: string,
  count: () => number | Promise<number>,
  today: string,
): Promise<{ pulse: PulseSnapshot; changed: string[]; failed: { key: string; reason: string }[] }> {
  const changed: string[] = []
  const failed: { key: string; reason: string }[] = []
  let appStore = old.appStore
  let github = old.github
  const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))
  try {
    const { version, released } = appStoreOf(await fetcher.json(lookup))
    if (version !== old.appStore.version || released !== old.appStore.released) changed.push('pulse-appstore')
    appStore = { fetched: today, version, released }
  } catch (error) {
    failed.push({ key: 'pulse-appstore', reason: reason(error) })
  }
  try {
    const merged = await count()
    if (merged !== old.github.merged) changed.push('pulse-github')
    github = { fetched: today, merged }
  } catch (error) {
    failed.push({ key: 'pulse-github', reason: reason(error) })
  }
  return { pulse: pulseSnapshotSchema.parse({ appStore, github }), changed, failed }
}

/** What the run prints for the pulse: numbers and days only, never the repo. */
export function pulseReportOf(
  old: PulseSnapshot,
  result: { pulse: PulseSnapshot; changed: readonly string[]; failed: readonly { key: string; reason: string }[] },
): string[] {
  const lines: string[] = []
  const { appStore, github } = result.pulse
  const failedOf = (key: string) => result.failed.find((failure) => failure.key === key)
  const appFailed = failedOf('pulse-appstore')
  if (appFailed !== undefined)
    lines.push(`✖ pulse-appstore failed, so v${old.appStore.version} as of ${old.appStore.fetched} stays: ${appFailed.reason}`)
  else
    lines.push(
      `✓ pulse-appstore v${appStore.version}, shipped ${appStore.released}, checked ${appStore.fetched}${
        result.changed.includes('pulse-appstore') ? ` (was v${old.appStore.version})` : ' (unchanged)'
      }`,
    )
  const ghFailed = failedOf('pulse-github')
  if (ghFailed !== undefined)
    lines.push(`✖ pulse-github failed, so ${old.github.merged} as of ${old.github.fetched} stays: ${ghFailed.reason}`)
  else
    lines.push(
      `✓ pulse-github ${github.merged} merged in the ${MERGED_DAYS} days to ${github.fetched}${
        result.changed.includes('pulse-github') ? ` (was ${old.github.merged})` : ' (unchanged)'
      }`,
    )
  return lines
}

/** The pulse file's text: two-space indent, a final newline. */
export function pulseText(pulse: PulseSnapshot): string {
  return `${JSON.stringify(pulseSnapshotSchema.parse(pulse), null, 2)}\n`
}
