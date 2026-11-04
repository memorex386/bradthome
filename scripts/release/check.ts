import { contextFor, flags, LIVE_URL, reason } from './context.ts'
import type { Fetch, VersionFile } from './hosting.ts'
import { urlPathFor } from './serve.ts'

// The pre-release check (spec 008, S3.1 to S3.5, FR-006): a candidate against
// what the live site serves today.
//
// - S3.1: every URL the live site serves still answers 200. That's each page
//   and file of the live version, robots.txt and the sitemap when live has
//   them. Hashed build files (/_astro/) and Hosting's own (/__/) are left out,
//   since a new build renames them.
// - S3.2: each redirect has the same status and target, and a missing page
//   answers 404.
// - S3.3: each security header the live site sends is there and at least as
//   strict.
// - S3.4: the home page's and the essay's visible words match, except that the
//   home page may lose its Work list's second item (D111). With
//   wordsMayChange, a difference is reported and allowed.
//
// pnpm release:check --live <url> --candidate <url> [--words-may-change] runs
// it by hand, reading the live paths from the channel the --live address
// serves. The release workflow's stage job runs it on every release.

export interface CheckOptions {
  liveBase: string
  candidateBase: string
  livePaths: readonly string[]
  fetch: Fetch
  wordsMayChange: boolean
}

interface Page {
  status: number
  location: string | undefined
  headers: Headers
  body: string
}

const PROBES = ['/robots.txt', '/sitemap-index.xml', '/sitemap.xml', '/favicon.ico', '/index.html']
const MISSING = '/release-check-missing-page'
const WORD_PAGES = ['/', '/vindecoded-agents']
const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'cross-origin-embedder-policy',
]
/** Referrer policies, from the one that sends least to the one that sends most. */
const REFERRER = [
  'no-referrer',
  'same-origin',
  'strict-origin',
  'strict-origin-when-cross-origin',
  'origin',
  'origin-when-cross-origin',
  'no-referrer-when-downgrade',
  'unsafe-url',
]
const LOOSE_SOURCES = new Set(["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", '*', 'data:', 'http:', 'https:'])

/** The addresses a version serves, from its files, leaving out Hosting's own and hashed build files. */
export function livePathsOf(files: readonly VersionFile[]): string[] {
  const paths = files.map((file) => urlPathFor(file.path)).filter((at): at is string => at !== undefined && !at.startsWith('/_astro/'))
  return [...new Set(paths)].sort()
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  mdash: '—',
  ndash: '–',
  middot: '·',
  hellip: '…',
}

/** A page's visible words: no tags, scripts, styles or comments, entities decoded, whitespace folded. */
export function visibleText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/\s+/g, ' ')
    .trim()
}

/** The page without the second item of the list after its Work heading (D111), or the page as it was. */
export function withoutSecondWorkItem(html: string): string {
  const heading = /<h2\b[^>]*>\s*Work\s*<\/h2>/i.exec(html)
  if (heading === null) return html
  const list = html.indexOf('<ul', heading.index)
  const listEnd = html.indexOf('</ul>', list)
  if (list < 0 || listEnd < 0) return html
  const first = html.indexOf('<li', list)
  const second = first < 0 ? -1 : html.indexOf('<li', first + 3)
  if (second < 0 || second > listEnd) return html
  const end = html.indexOf('</li>', second)
  if (end < 0 || end > listEnd) return html
  return html.slice(0, second) + html.slice(end + '</li>'.length)
}

async function get(fetchImpl: Fetch, base: string, at: string): Promise<Page> {
  const response = await fetchImpl(`${base}${at}`, { redirect: 'manual', headers: { 'cache-control': 'no-cache' } })
  const body = await response.text()
  const location = response.headers.get('location') ?? undefined
  return { status: response.status, location, headers: response.headers, body }
}

/** A redirect's target as a path, whatever host it names. */
const targetPath = (base: string, location: string | undefined): string => {
  if (location === undefined) return '(none)'
  const url = new URL(location, base)
  return `${url.pathname}${url.search}`
}

const isRedirect = (status: number): boolean => status >= 300 && status < 400

function hsts(value: string): { maxAge: number; subdomains: boolean } {
  const maxAge = /max-age\s*=\s*"?(\d+)/i.exec(value)
  return { maxAge: maxAge === null ? -1 : Number(maxAge[1]), subdomains: /includesubdomains/i.test(value) }
}

function csp(value: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const part of value.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/)
    if (name !== undefined && name !== '') map.set(name.toLowerCase(), sources)
  }
  return map
}

function permissions(value: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const match of value.matchAll(/([a-z-]+)\s*=\s*(\([^)]*\)|\*|[^,]+)/gi))
    map.set((match[1] ?? '').toLowerCase(), (match[2] ?? '').replace(/\s+/g, ''))
  return map
}

const referrerRank = (value: string): number => {
  const known = value
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => REFERRER.includes(token))
  return known.length === 0 ? REFERRER.length : REFERRER.indexOf(known.at(-1) ?? '')
}

/** Why the candidate's header is looser than the live one, or undefined when it's at least as strict. */
export function looser(name: string, live: string, candidate: string | null): string | undefined {
  if (candidate === null || candidate.trim() === '') return `drops ${name}`
  switch (name) {
    case 'strict-transport-security': {
      const before = hsts(live)
      const after = hsts(candidate)
      if (after.maxAge < before.maxAge) return `${name} max-age ${after.maxAge} is shorter than live's ${before.maxAge}`
      if (before.subdomains && !after.subdomains) return `${name} drops includeSubDomains`
      return undefined
    }
    case 'content-security-policy': {
      const before = csp(live)
      const after = csp(candidate)
      for (const directive of before.keys()) if (!after.has(directive)) return `${name} drops ${directive}`
      for (const [directive, sources] of after) {
        const allowed = new Set(before.get(directive) ?? before.get('default-src') ?? [])
        const loose = sources.find((source) => LOOSE_SOURCES.has(source.toLowerCase()) && !allowed.has(source))
        if (loose !== undefined) return `${name} adds ${loose} to ${directive}`
      }
      return undefined
    }
    case 'permissions-policy': {
      const before = permissions(live)
      const after = permissions(candidate)
      for (const [feature, allow] of before)
        if (allow === '()' && after.get(feature) !== '()') return `${name} allows ${feature}, which live blocks`
      return undefined
    }
    case 'referrer-policy':
      return referrerRank(candidate) <= referrerRank(live) ? undefined : `${name} ${candidate} sends more than live's ${live}`
    case 'x-content-type-options':
      return candidate.trim().toLowerCase() === 'nosniff' ? undefined : `${name} is ${candidate}, not nosniff`
    case 'x-frame-options': {
      const after = candidate.trim().toUpperCase()
      return after === 'DENY' || after === live.trim().toUpperCase() ? undefined : `${name} is ${candidate}, looser than live's ${live}`
    }
    default:
      return candidate.trim() === live.trim() ? undefined : `${name} is ${candidate}, not live's ${live}`
  }
}

/** The first place two texts differ, a few words either side. */
function firstDifference(live: string, candidate: string): string {
  const a = live.split(' ')
  const b = candidate.split(' ')
  let index = 0
  while (index < a.length && index < b.length && a[index] === b[index]) index += 1
  const around = (words: string[]): string => words.slice(Math.max(0, index - 4), index + 8).join(' ')
  return `live has “${around(a)}”, candidate has “${around(b)}”`
}

export async function preReleaseCheck(options: CheckOptions): Promise<{ ok: boolean; lines: string[] }> {
  const problems: string[] = []
  const notes: string[] = []
  const pages = new Set<string>([...options.livePaths, ...PROBES])
  for (const at of options.livePaths) if (at !== '/' && !/\.[a-z0-9]+$/i.test(at)) pages.add(`${at}/`)

  const live = new Map<string, Page>()
  const candidate = new Map<string, Page>()
  for (const at of [...pages].sort()) {
    const before = await get(options.fetch, options.liveBase, at)
    const after = await get(options.fetch, options.candidateBase, at)
    live.set(at, before)
    candidate.set(at, after)
    if (before.status === 200) {
      if (after.status !== 200) {
        problems.push(`${at}  live ${before.status}, candidate ${after.status}`)
        continue
      }
      for (const name of SECURITY_HEADERS) {
        const value = before.headers.get(name)
        if (value === null) continue
        const why = looser(name, value, after.headers.get(name))
        if (why !== undefined) problems.push(`${at}  ${why}`)
      }
    } else if (isRedirect(before.status)) {
      const from = targetPath(options.liveBase, before.location)
      const to = targetPath(options.candidateBase, after.location)
      if (after.status !== before.status || from !== to)
        problems.push(`${at}  live ${before.status} to ${from}, candidate ${after.status} to ${to}`)
    }
  }

  const missing = await get(options.fetch, options.candidateBase, MISSING)
  if (missing.status !== 404) problems.push(`missing page ${MISSING} answered ${missing.status}, not 404`)

  for (const at of WORD_PAGES) {
    const before = live.get(at)
    const after = candidate.get(at)
    if (before?.status !== 200 || after?.status !== 200) continue
    const now = visibleText(after.body)
    const asIs = visibleText(before.body)
    const allowed = at === '/' ? [asIs, visibleText(withoutSecondWorkItem(before.body))] : [asIs]
    if (allowed.includes(now)) continue
    const line = `words differ on ${at}: ${firstDifference(asIs, now)}`
    if (options.wordsMayChange) notes.push(`– check  ${line} (this run allows it)`)
    else problems.push(line)
  }

  const checked = `${pages.size} URLs, ${WORD_PAGES.length} pages' words`
  if (problems.length === 0) {
    return {
      ok: true,
      lines: [
        ...notes,
        `✓ check  ${options.candidateBase} serves every URL, redirect, security header and word that ${options.liveBase} does (${checked})`,
      ],
    }
  }
  return {
    ok: false,
    lines: [
      ...notes,
      ...problems.map((problem) => `✖ check  ${problem}`),
      `  Fix: change the build so each line above passes, or, for an intended change of words, run the release with words-may-change. Nothing was released.`,
    ],
  }
}

/** The channel an address serves: live for the site's own addresses, or the name in a preview address. */
export function channelOf(url: string, site: string): string | undefined {
  const { host } = new URL(url)
  if (url.startsWith(LIVE_URL) || host === `${site}.web.app` || host === `${site}.firebaseapp.com`) return 'live'
  const preview = new RegExp(`^${site}--([a-z0-9-]+)-[a-z0-9]{8}\\.web\\.app$`).exec(host)
  return preview?.[1]
}

async function main(argv: readonly string[], env: NodeJS.ProcessEnv): Promise<number> {
  try {
    const values = flags(argv, { live: { type: 'string' }, candidate: { type: 'string' }, 'words-may-change': { type: 'boolean' } })
    const liveBase = typeof values.live === 'string' ? values.live.replace(/\/$/, '') : LIVE_URL
    if (typeof values.candidate !== 'string') {
      console.log('✖ check  Usage: pnpm release:check --candidate <url> [--live <url>] [--words-may-change]')
      return 1
    }
    const deps = await contextFor({
      env,
      accountVariable: '',
      channel: 'live',
      url: liveBase,
      ...(typeof values.as === 'string' ? { actAs: values.as } : {}),
    })
    const channel = channelOf(liveBase, deps.site)
    if (channel === undefined) throw new Error(`${liveBase} isn't one of ${deps.site}'s addresses`)
    const version = (await deps.hosting.channel(deps.site, channel)).release?.version.name
    if (version === undefined) throw new Error(`${channel} has no release`)
    const result = await preReleaseCheck({
      liveBase,
      candidateBase: values.candidate.replace(/\/$/, ''),
      livePaths: livePathsOf(await deps.hosting.files(version)),
      fetch,
      wordsMayChange: values['words-may-change'] === true,
    })
    console.log(result.lines.join('\n'))
    return result.ok ? 0 : 1
  } catch (error) {
    console.log(`✖ check  ${reason(error)}`)
    return 1
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2), process.env)
