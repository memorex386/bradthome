import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { type Snapshots, snapshotsSchema } from '../../../apps/site/src/content/previews.ts'
import {
  appIdsOf,
  type Fetcher,
  imageNameOf,
  imagesNamed,
  refresh,
  reportOf,
  snapshotsText,
  summaryOf,
} from '../../../scripts/previews/refresh-lib.ts'

// The link previews' refresh (S4.1–S4.3, FR-004, FR-010, SC-005), on GitHub's
// and Apple's responses recorded in fixtures/. No test makes a live call: the
// fetcher answers from the recordings, and the resizer returns its input.

const FIXTURES = path.join(import.meta.dirname, '..', 'fixtures')
const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const fixture = (name: string): unknown => JSON.parse(readFileSync(path.join(FIXTURES, name), 'utf8'))
const IMAGE = new Uint8Array([1, 2, 3])

const RECORDED: Record<string, () => unknown> = {
  'https://api.github.com/users/memorex386': () => fixture('github-user.json'),
  'https://api.github.com/users/memorex386/repos?per_page=100&type=owner': () => fixture('github-repos.json'),
  'https://itunes.apple.com/lookup?id=1191483515&country=us': () => fixture('appstore-1191483515.json'),
  'https://itunes.apple.com/lookup?id=1544613828&country=us': () => fixture('appstore-1544613828.json'),
}

/** A fetcher that answers from the recordings, with any URL in `failing` failing. */
function recorded(failing: readonly string[] = [], override: Record<string, () => unknown> = {}): Fetcher & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    json(url) {
      calls.push(url)
      if (failing.some((part) => url.includes(part))) return Promise.reject(new Error(`${new URL(url).hostname} answered 503`))
      const answer = override[url] ?? RECORDED[url]
      if (answer === undefined) return Promise.reject(new Error(`no recording for ${url}`))
      return Promise.resolve(answer())
    },
    bytes(url) {
      calls.push(url)
      if (failing.some((part) => url.includes(part))) return Promise.reject(new Error('image failed'))
      return Promise.resolve(IMAGE)
    },
  }
}

const APP_IDS = ['1191483515', '1544613828']
const run = (old: Snapshots, fetcher: Fetcher, today = '2026-11-05') =>
  refresh({ old, appIds: APP_IDS, today, fetcher, resize: (bytes) => Promise.resolve(bytes) })

describe('the sources', () => {
  test('FR-004 the App Store IDs come from the claims evidence, and only GitHub and Apple are called, with no live call', async () => {
    const claims = parse(readFileSync(path.join(ROOT, 'apps/site/content/claims.yaml'), 'utf8')) as Record<string, { evidence: string[] }>
    expect(appIdsOf(claims)).toEqual(APP_IDS)
    const fetcher = recorded()
    await run({}, fetcher)
    for (const url of fetcher.calls) expect(['api.github.com', 'avatars.githubusercontent.com', 'itunes.apple.com', 'is1-ssl.mzstatic.com']).toContain(new URL(url).hostname)
  })

  test('S2.1 FR-004 the GitHub snapshot holds the profile, the two most-starred own repos and the public repo count', async () => {
    const { snapshots } = await run({}, recorded())
    const github = snapshots.github
    expect(github).toMatchObject({ source: 'github', name: 'Brad Thome', login: 'memorex386', href: 'https://github.com/memorex386', fetched: '2026-11-05' })
    if (github?.source !== 'github') throw new Error('no GitHub snapshot')
    const repos = (fixture('github-repos.json') as { name: string; stargazers_count: number; fork: boolean; archived: boolean }[])
      .filter((repo) => !repo.fork && !repo.archived && repo.stargazers_count > 0)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
    expect(github.repos.map((repo) => repo.name)).toEqual(repos.slice(0, 2).map((repo) => repo.name))
    expect(github.publicRepos).toBe((fixture('github-user.json') as { public_repos: number }).public_repos)
    expect(github.image).toBe(imageNameOf('github', IMAGE))
  })

  test('S2.2 S2.3 FR-004 FR-006 an App Store snapshot holds the listing, its opening sentences, and the rating rounded', async () => {
    const { snapshots } = await run({}, recorded())
    const app = snapshots['appstore-1191483515']
    if (app?.source !== 'appstore') throw new Error('no App Store snapshot')
    const raw = (fixture('appstore-1191483515.json') as { results: { averageUserRating: number; userRatingCount: number; trackName: string }[] }).results[0]
    expect(app.name).toBe(raw?.trackName)
    expect(app.seller).toBe('VINDecoded LLC')
    expect(app.href).not.toContain('?')
    expect(app.rating).toBe(Math.round((raw?.averageUserRating ?? 0) * 10) / 10)
    const count = raw?.userRatingCount ?? 0
    expect(app.ratings).toBeLessThanOrEqual(count)
    expect(String(app.ratings).replace(/0+$/, '').length).toBeLessThanOrEqual(2)
    expect(app.summary?.length).toBeLessThanOrEqual(160)
    expect(snapshotsSchema.safeParse(snapshots).success).toBe(true)
  })

  test("FR-004 a listing's summary is its first paragraph's whole sentences up to 160 characters, or a first sentence cut with an ellipsis", () => {
    expect(summaryOf('Same Sudoku. Same rules. Different solver.\n\nMore here.')).toBe('Same Sudoku. Same rules. Different solver.')
    expect(summaryOf(`${'word '.repeat(50)}end.`)).toMatch(/^word( word)*…$/)
    expect(summaryOf(undefined)).toBeUndefined()
  })
})

describe('changed, unchanged and failing', () => {
  test('S4.1 FR-010 SC-005 a changed source gets its new data, today and its image, and is reported', async () => {
    const first = await run({}, recorded(), '2026-11-01')
    const changedUser = { ...(fixture('github-user.json') as object), bio: 'A new bio.' }
    const result = await run(first.snapshots, recorded([], { 'https://api.github.com/users/memorex386': () => changedUser }), '2026-11-08')
    expect(result.changed).toEqual(['github'])
    expect(result.snapshots.github).toMatchObject({ bio: 'A new bio.', fetched: '2026-11-08' })
    expect(result.snapshots['appstore-1191483515']?.fetched).toBe('2026-11-01')
    expect([...result.images.keys()]).toEqual([imageNameOf('github', IMAGE)])
    expect(reportOf(result)).toEqual(['✓ github changed'])
  })

  test('S4.2 FR-010 SC-005 when nothing changed, every snapshot and date stays and nothing is reported as changed', async () => {
    const first = await run({}, recorded(), '2026-11-01')
    const again = await run(first.snapshots, recorded(), '2026-11-08')
    expect(again.changed).toEqual([])
    expect(again.failed).toEqual([])
    expect(snapshotsText(again.snapshots)).toBe(snapshotsText(first.snapshots))
    expect(reportOf(again)).toEqual(['Every source is unchanged.'])
  })

  test('S4.3 FR-010 SC-005 a failing source keeps its last snapshot, the others still refresh, and it is reported', async () => {
    const first = await run({}, recorded(), '2026-11-01')
    const changed = { ...(fixture('github-user.json') as object), bio: 'A new bio.' }
    const result = await run(first.snapshots, recorded(['itunes.apple.com/lookup?id=1191483515'], { 'https://api.github.com/users/memorex386': () => changed }), '2026-11-08')
    expect(result.failed).toEqual([{ key: 'appstore-1191483515', reason: 'itunes.apple.com answered 503' }])
    expect(result.snapshots['appstore-1191483515']).toEqual(first.snapshots['appstore-1191483515'])
    expect(result.changed).toEqual(['github'])
    expect(reportOf(result)).toContain('✖ appstore-1191483515 failed, so its last snapshot stays: itunes.apple.com answered 503')
  })

  test('S4.3 S2.5 FR-007 a source that fails with no snapshot yet stays missing, so its card shows the missing state', async () => {
    const result = await run({}, recorded(['api.github.com']))
    expect(result.snapshots.github).toBeUndefined()
    expect(result.failed.map((failure) => failure.key)).toEqual(['github'])
  })

  test('S4.1 FR-008 an image is named by its hash, and an app that leaves the claims drops its snapshot and image', async () => {
    expect(imageNameOf('github', IMAGE)).toMatch(/^github-[0-9a-f]{12}\.webp$/)
    const first = await run({}, recorded())
    const result = await refresh({ old: first.snapshots, appIds: ['1191483515'], today: '2026-11-08', fetcher: recorded(), resize: (bytes) => Promise.resolve(bytes) })
    expect(result.changed).toEqual(['appstore-1544613828'])
    expect(Object.keys(result.snapshots).sort()).toEqual(['appstore-1191483515', 'github'])
    expect(imagesNamed(result.snapshots).has(first.snapshots['appstore-1544613828']?.image ?? '')).toBe(false)
  })

  test("FR-010 the committed snapshots file is the refresh's own text and matches the schema", () => {
    const file = path.join(ROOT, 'apps/site/content/previews/snapshots.json')
    const text = readFileSync(file, 'utf8')
    const snapshots = snapshotsSchema.parse(JSON.parse(text))
    expect(snapshotsText(snapshots)).toBe(text)
    for (const name of imagesNamed(snapshots)) expect(readFileSync(path.join(ROOT, 'apps/site/public/previews', name)).length).toBeGreaterThan(0)
  })
})
