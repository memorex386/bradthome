import path from 'node:path'

// A stand-in for Firebase Hosting's REST API and the sites it serves, for the
// release, rollback and check tests (spec 008, issue #29). One fetch answers
// both: API calls under API_BASE, and page requests to a channel's address,
// where each file of the channel's current version answers with its hash as
// the ETag, as Hosting does. A fake clock lets a release take time to reach
// the edge, so the retry and the automatic rollback can be tested.

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')
export const API_BASE = 'https://firebasehosting.googleapis.com/v1beta1'
export const SITE = 'bradthome'
export const LIVE_URL = 'https://bradthome.com'

export interface FakeFile {
  path: string
  hash: string
  body?: string
  headers?: Record<string, string>
}

export interface FakeVersion {
  status: 'FINALIZED' | 'DELETED' | 'CREATED'
  files: FakeFile[]
}

interface FakeRelease {
  name: string
  version: { name: string; status: string }
  releaseTime: string
  message?: string
}

interface FakeChannel {
  url: string
  releases: FakeRelease[]
  /** When each release reaches the edge, in fake milliseconds. */
  servedFrom: number[]
}

export interface FakeRequest {
  method: string
  url: string
  authorization: string | null
  quotaProject: string | null
}

export class FakeCloud {
  readonly versions = new Map<string, FakeVersion>()
  readonly channels = new Map<string, FakeChannel>()
  readonly requests: FakeRequest[] = []
  /** How long a new release takes to be served, in fake milliseconds. */
  lagMs = 0
  /** A release of this version is accepted but never served. */
  neverServes = new Set<string>()
  /** Every release create answers this HTTP status instead, when set. */
  refuseReleases: number | undefined
  clock = 0
  private serial = 1_000

  /** sites/bradthome/versions/<id> */
  addVersion(id: string, files: FakeFile[], status: FakeVersion['status'] = 'FINALIZED'): string {
    const name = `sites/${SITE}/versions/${id}`
    this.versions.set(name, { status, files })
    return name
  }

  addChannel(channel: string, url: string, ...versionIds: string[]): void {
    this.channels.set(channel, { url, releases: [], servedFrom: [] })
    for (const id of versionIds) this.makeRelease(channel, `sites/${SITE}/versions/${id}`)
  }

  /** The version name the channel points at now. */
  current(channel: string): string | undefined {
    return this.channels.get(channel)?.releases[0]?.version.name
  }

  /** The version name the channel serves at the fake clock's time. */
  served(channel: string): string | undefined {
    const found = this.channels.get(channel)
    if (found === undefined) return undefined
    for (const [index, release] of found.releases.entries()) {
      if (this.neverServes.has(release.version.name)) continue
      if ((found.servedFrom[index] ?? 0) <= this.clock) return release.version.name
    }
    return undefined
  }

  sleep = async (ms: number): Promise<void> => {
    this.clock += ms
  }

  now = (): number => this.clock

  private makeRelease(channel: string, versionName: string, message?: string): FakeRelease {
    const found = this.channels.get(channel)
    if (found === undefined) throw new Error(`no channel ${channel}`)
    this.serial += 1
    const version = this.versions.get(versionName)
    const release: FakeRelease = {
      name: `sites/${SITE}/channels/${channel}/releases/${this.serial}`,
      version: { name: versionName, status: version?.status ?? 'DELETED' },
      releaseTime: new Date(Date.UTC(2026, 10, 4) + this.serial * 1000).toISOString(),
      ...(message === undefined ? {} : { message }),
    }
    found.releases.unshift(release)
    found.servedFrom.unshift(this.clock + this.lagMs)
    return release
  }

  fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const headers = new Headers(init?.headers)
    const method = (init?.method ?? 'GET').toUpperCase()
    this.requests.push({ method, url: url.href, authorization: headers.get('authorization'), quotaProject: headers.get('x-goog-user-project') })
    if (url.href.startsWith(API_BASE)) return this.api(method, url)
    return this.page(url)
  }

  private api(method: string, url: URL): Response {
    const route = url.pathname.replace(/^\/v1beta1\//, '')
    const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
    let match = /^sites\/([^/]+)\/channels\/([^/]+)$/.exec(route)
    if (match !== null && method === 'GET') {
      const found = this.channels.get(match[2] ?? '')
      if (found === undefined) return json({ error: { code: 404 } }, 404)
      return json({ name: route, url: found.url, ...(found.releases[0] === undefined ? {} : { release: found.releases[0] }) })
    }
    match = /^sites\/([^/]+)\/channels\/([^/]+)\/releases$/.exec(route)
    if (match !== null && method === 'GET') {
      const found = this.channels.get(match[2] ?? '')
      if (found === undefined) return json({ error: { code: 404 } }, 404)
      const size = Number(url.searchParams.get('pageSize') ?? '100')
      const start = Number(url.searchParams.get('pageToken') ?? '0')
      const page = found.releases.slice(start, start + size)
      const next = start + size < found.releases.length ? { nextPageToken: String(start + size) } : {}
      return json({ releases: page, ...next })
    }
    if (match !== null && method === 'POST') {
      if (this.refuseReleases !== undefined) return json({ error: { code: this.refuseReleases } }, this.refuseReleases)
      const versionName = url.searchParams.get('versionName') ?? ''
      const version = this.versions.get(versionName)
      if (version?.status !== 'FINALIZED') return json({ error: { code: 400 } }, 400)
      return json(this.makeRelease(match[2] ?? '', versionName))
    }
    match = /^(sites\/[^/]+\/versions\/[^/]+)$/.exec(route)
    if (match !== null && method === 'GET') {
      const version = this.versions.get(match[1] ?? '')
      if (version === undefined) return json({ error: { code: 404 } }, 404)
      return json({ name: match[1], status: version.status })
    }
    match = /^(sites\/[^/]+\/versions\/[^/]+)\/files$/.exec(route)
    if (match !== null && method === 'GET') {
      const version = this.versions.get(match[1] ?? '')
      if (version === undefined) return json({ error: { code: 404 } }, 404)
      return json({ files: version.files.map((file) => ({ path: file.path, hash: file.hash, status: 'EXPECTED' })) })
    }
    return json({ error: { code: 404, message: `no route ${method} ${route}` } }, 404)
  }

  private page(url: URL): Response {
    const channel = [...this.channels.entries()].find(([name, value]) => value.url === url.origin || (name === 'live' && url.origin === LIVE_URL))
    const versionName = channel === undefined ? undefined : this.served(channel[0])
    const files = versionName === undefined ? [] : (this.versions.get(versionName)?.files ?? [])
    const wanted = url.pathname
    if (wanted.length > 1 && wanted.endsWith('/')) {
      return new Response('', { status: 301, headers: { location: `${url.origin}${wanted.slice(0, -1)}` } })
    }
    if (wanted.endsWith('.html')) {
      const clean = wanted === '/index.html' ? '/' : wanted.slice(0, -'.html'.length)
      if (files.some((file) => file.path === wanted)) return new Response('', { status: 301, headers: { location: `${url.origin}${clean}` } })
    }
    const candidates = wanted === '/' ? ['/index.html'] : [wanted, `${wanted}.html`, `${wanted}/index.html`]
    const file = files.find((entry) => candidates.includes(entry.path))
    if (file !== undefined) return this.respond(200, file)
    const missing = files.find((entry) => entry.path === '/404.html')
    if (missing !== undefined) return this.respond(404, missing)
    return new Response('Not found', { status: 404 })
  }

  private respond(status: number, file: FakeFile): Response {
    return new Response(file.body ?? `<html><body>${file.path}</body></html>`, {
      status,
      headers: { etag: `"${file.hash}"`, 'content-type': file.path.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8', ...file.headers },
    })
  }
}

/** A version's files, each hash made from its path and a tag, so A and B differ. */
export function filesOf(tag: string, paths: string[], extra: Partial<FakeFile> = {}): FakeFile[] {
  return paths.map((file) => ({ path: file, hash: `${tag}${file}`.replace(/[^a-z0-9]/gi, '').padEnd(16, '0'), ...extra }))
}
