// A small client for Firebase Hosting's REST API, for the release, the
// rollback and their checks (spec 008, issue #29). It reads channels, their
// release history and versions, and creates releases, which is all a release
// or a rollback needs: both point a channel at a version that already exists.
// The token comes from the caller. It's sent only as a bearer header, and no
// error carries it.

export type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export const API_BASE = 'https://firebasehosting.googleapis.com/v1beta1'

export interface Release {
  name: string
  releaseTime: string
  version: { name: string; status: string }
  message?: string
}

export interface Channel {
  name?: string
  url: string
  release?: Release
}

export interface VersionFile {
  path: string
  hash: string
}

export interface HostingOptions {
  token: string
  fetch?: Fetch
  /** Sent as x-goog-user-project, which a person's token needs and a service account's mustn't. */
  quotaProject?: string
}

const NAME = /^[a-z0-9-]+$/
const VERSION_ID = /^[A-Za-z0-9_-]+$/

/** A version's full name, from its ID or its full name. It throws for anything else. */
export function versionName(site: string, value: string): string {
  const full = /^sites\/([^/]+)\/versions\/([^/]+)$/.exec(value)
  if (full !== null) {
    if (full[1] !== site || !VERSION_ID.test(full[2] ?? '')) throw new Error(`${value} isn't a version of ${site}`)
    return value
  }
  if (!VERSION_ID.test(value)) throw new Error(`${value} isn't a version ID`)
  return `sites/${site}/versions/${value}`
}

/** The ID at the end of a version's name. */
export const versionId = (name: string): string => name.split('/').at(-1) ?? name

/**
 * The version that was live before the current one: the newest release, after
 * the first, of a different version that Hosting still keeps.
 */
export function previousVersion(releases: readonly Release[]): string | undefined {
  const current = releases[0]?.version.name
  if (current === undefined) return undefined
  return releases.find((release) => release.version.name !== current && release.version.status === 'FINALIZED')?.version.name
}

export class HostingError extends Error {
  readonly status: number

  constructor(what: string, status: number) {
    super(`${what}: HTTP ${status}`)
    this.status = status
  }
}

export class Hosting {
  readonly #token: string
  readonly #fetch: Fetch
  readonly #quotaProject: string | undefined

  constructor(options: HostingOptions) {
    this.#token = options.token
    this.#fetch = options.fetch ?? fetch
    this.#quotaProject = options.quotaProject
  }

  async #call<T>(what: string, method: 'GET' | 'POST', route: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { authorization: `Bearer ${this.#token}` }
    if (this.#quotaProject !== undefined) headers['x-goog-user-project'] = this.#quotaProject
    if (body !== undefined) headers['content-type'] = 'application/json'
    const response = await this.#fetch(`${API_BASE}/${route}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok) throw new HostingError(what, response.status)
    return (await response.json()) as T
  }

  channel(site: string, channel: string): Promise<Channel> {
    if (!NAME.test(site) || !NAME.test(channel)) throw new Error(`${site}:${channel} isn't a site and channel`)
    return this.#call(`reading channel ${channel}`, 'GET', `sites/${site}/channels/${channel}`)
  }

  /** Every release of a channel, newest first. */
  async releases(site: string, channel: string): Promise<Release[]> {
    if (!NAME.test(site) || !NAME.test(channel)) throw new Error(`${site}:${channel} isn't a site and channel`)
    const all: Release[] = []
    let token: string | undefined
    do {
      const query = new URLSearchParams({ pageSize: '100', ...(token === undefined ? {} : { pageToken: token }) })
      const page = await this.#call<{ releases?: Release[]; nextPageToken?: string }>(
        `reading channel ${channel}'s releases`,
        'GET',
        `sites/${site}/channels/${channel}/releases?${query.toString()}`,
      )
      all.push(...(page.releases ?? []))
      token = page.nextPageToken
    } while (token !== undefined && token !== '')
    return all
  }

  /** A version's status, or undefined when Hosting has no such version. */
  async version(name: string): Promise<{ name: string; status: string } | undefined> {
    try {
      return await this.#call(`reading version ${versionId(name)}`, 'GET', name)
    } catch (error) {
      if (error instanceof HostingError && error.status === 404) return undefined
      throw error
    }
  }

  /** Every file of a version, with its hash. */
  async files(name: string): Promise<VersionFile[]> {
    const all: VersionFile[] = []
    let token: string | undefined
    do {
      const query = new URLSearchParams({ pageSize: '1000', ...(token === undefined ? {} : { pageToken: token }) })
      const page = await this.#call<{ files?: VersionFile[]; nextPageToken?: string }>(
        `listing version ${versionId(name)}'s files`,
        'GET',
        `${name}/files?${query.toString()}`,
      )
      all.push(...(page.files ?? []).map((file) => ({ path: file.path, hash: file.hash })))
      token = page.nextPageToken
    } while (token !== undefined && token !== '')
    return all
  }

  /** Points a channel at a version that already exists. */
  release(site: string, channel: string, version: string, message?: string): Promise<Release> {
    if (!NAME.test(site) || !NAME.test(channel)) throw new Error(`${site}:${channel} isn't a site and channel`)
    const query = new URLSearchParams({ versionName: versionName(site, version) })
    return this.#call(
      `releasing ${versionId(version)} to ${channel}`,
      'POST',
      `sites/${site}/channels/${channel}/releases?${query.toString()}`,
      message === undefined ? {} : { message },
    )
  }
}
