import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { parse } from 'yaml'
import { APP_STORE_ID } from '../../apps/chat-api/src/pulse.ts'
import { pulseSnapshotSchema, snapshotsSchema } from '../../apps/site/src/content/previews.ts'
import { topLevel } from '../lib/git.ts'
import {
  appIdsOf,
  type Fetcher,
  imagesNamed,
  mergedCountOf,
  pulseOf,
  pulseReportOf,
  pulseText,
  refresh,
  reportOf,
  type Runner,
  snapshotsText,
} from './refresh-lib.ts'

// pnpm previews:refresh, run by hand on Brad's PC (spec 016, D48; spec 044,
// D247). It fetches the link previews' snapshots from GitHub's and Apple's
// public APIs and writes the ones that changed to
// apps/site/content/previews/snapshots.json, with their images resized into
// apps/site/public/previews/. It also writes the numbers VINDecoded's card is
// built with to content/previews/pulse.json (spec 041): the latest iOS
// release from Apple's lookup, and the PRs merged in the last 30 days,
// counted through this PC's own signed-in gh, from the repo the PC's git
// setting names. It reads no token and prints counts only. A source that
// fails keeps its last numbers, and the run exits 1. The files it changes
// wait for a normal push, and a release builds them into bradthome.com.

const root = topLevel(process.cwd()) ?? process.cwd()
const contentDir = path.join(root, 'apps', 'site', 'content')
const snapshotsFile = path.join(contentDir, 'previews', 'snapshots.json')
const pulseFile = path.join(contentDir, 'previews', 'pulse.json')
const imagesDir = path.join(root, 'apps', 'site', 'public', 'previews')

const headers = (url: string): Record<string, string> => {
  const base: Record<string, string> = { 'User-Agent': 'bradthome.com link previews' }
  // GitHub's public profile API, read with no token (D150).
  if (new URL(url).hostname === 'api.github.com') {
    base.Accept = 'application/vnd.github+json'
    base['X-GitHub-Api-Version'] = '2022-11-28'
  }
  return base
}

// Commands run with their output kept here, never shown: gh's own messages
// could name the repo, so only mergedCountOf's own words are printed.
const run: Runner = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, GH_NO_UPDATE_NOTIFIER: '1', GH_PROMPT_DISABLED: '1', NO_COLOR: '1' },
  })
  return { status: result.error === undefined ? result.status : null, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

const fetcher: Fetcher = {
  async json(url) {
    const response = await fetch(url, { headers: headers(url), signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error(`${new URL(url).hostname} answered ${response.status}`)
    return (await response.json()) as unknown
  },
  async bytes(url) {
    // Apple serves the same icon from shards is1 to is5; one that resets the
    // connection shouldn't fail the refresh, so each is tried in turn.
    const shard = /^https:\/\/is(\d)-ssl\.mzstatic\.com\//.exec(url)
    const urls = shard
      ? [shard[1], ...['1', '2', '3', '4', '5'].filter((n) => n !== shard[1])].map((n) =>
          url.replace(/^https:\/\/is\d-/, `https://is${n}-`),
        )
      : [url]
    let last: unknown
    for (const each of urls) {
      try {
        const response = await fetch(each, { headers: headers(each), signal: AbortSignal.timeout(20_000) })
        if (!response.ok) throw new Error(`${new URL(each).hostname} answered ${response.status} for an image`)
        return new Uint8Array(await response.arrayBuffer())
      } catch (error) {
        last = error
      }
    }
    throw last instanceof Error ? last : new Error('the image failed')
  },
}

const resize = async (bytes: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await sharp(bytes).resize(112, 112, { fit: 'cover' }).webp({ quality: 82, effort: 6 }).toBuffer())

const old = existsSync(snapshotsFile) ? snapshotsSchema.parse(JSON.parse(readFileSync(snapshotsFile, 'utf8'))) : {}
const claims = parse(readFileSync(path.join(contentDir, 'claims.yaml'), 'utf8')) as Record<string, { evidence: string[] }>
const today = (process.env.PREVIEWS_TODAY ?? new Date().toISOString()).slice(0, 10)

const result = await refresh({ old, appIds: appIdsOf(claims), today, fetcher, resize })

if (result.changed.length > 0) {
  mkdirSync(path.dirname(snapshotsFile), { recursive: true })
  mkdirSync(imagesDir, { recursive: true })
  writeFileSync(snapshotsFile, snapshotsText(result.snapshots))
  for (const [name, bytes] of result.images) writeFileSync(path.join(imagesDir, name), bytes)
  const named = imagesNamed(result.snapshots)
  for (const name of readdirSync(imagesDir)) {
    if (!named.has(name)) rmSync(path.join(imagesDir, name))
  }
}

const lines = reportOf(result).map((line) => (line === 'Every source is unchanged.' ? '· Every link preview is unchanged.' : line))
let pulseWritten = false
let pulseFailed = false
try {
  const text = readFileSync(pulseFile, 'utf8')
  const last = pulseSnapshotSchema.parse(JSON.parse(text))
  const now = Date.parse(process.env.PREVIEWS_NOW ?? '') || Date.now()
  const pulse = await pulseOf(
    last,
    fetcher,
    `https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=us`,
    () => mergedCountOf(run, now),
    today,
  )
  if (pulseText(pulse.pulse) !== text) {
    writeFileSync(pulseFile, pulseText(pulse.pulse))
    pulseWritten = true
  }
  lines.push(...pulseReportOf(last, pulse))
  pulseFailed = pulse.failed.length > 0
} catch (error) {
  pulseFailed = true
  lines.push(`✖ pulse failed, so its last numbers stay: ${error instanceof Error ? error.message : String(error)}`)
}
lines.push(
  result.changed.length > 0 || pulseWritten
    ? 'Next: read the diff, then push it once Brad says push. A release builds it into bradthome.com (docs/release.md).'
    : 'Nothing changed, so nothing to push.',
)

process.stdout.write(`${lines.join('\n')}\n`)
process.exitCode = result.failed.length > 0 || pulseFailed ? 1 : 0
