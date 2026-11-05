import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { parse } from 'yaml'
import { snapshotsSchema } from '../../apps/site/src/content/previews.ts'
import { topLevel } from '../lib/git.ts'
import { appIdsOf, type Fetcher, imagesNamed, refresh, reportOf, snapshotsText } from './refresh-lib.ts'

// pnpm previews:refresh (spec 016, D48). Fetches the link previews' snapshots
// from GitHub's and Apple's public APIs and writes the ones that changed to
// apps/site/content/previews/snapshots.json, with their images resized into
// apps/site/public/previews/. It exits 1 when a source failed, after keeping
// that source's last snapshot. In a workflow it sets the step's `changed`
// output, which the scheduled workflow reads to open a pull request.

const root = topLevel(process.cwd()) ?? process.cwd()
const contentDir = path.join(root, 'apps', 'site', 'content')
const snapshotsFile = path.join(contentDir, 'previews', 'snapshots.json')
const imagesDir = path.join(root, 'apps', 'site', 'public', 'previews')

const headers = (url: string): Record<string, string> => {
  const base: Record<string, string> = { 'User-Agent': 'bradthome.com link previews' }
  if (new URL(url).hostname === 'api.github.com') {
    base.Accept = 'application/vnd.github+json'
    base['X-GitHub-Api-Version'] = '2022-11-28'
    if (process.env.GITHUB_TOKEN) base.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return base
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

process.stdout.write(`${reportOf(result).join('\n')}\n`)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${result.changed.length > 0}\n`)
process.exitCode = result.failed.length > 0 ? 1 : 0
