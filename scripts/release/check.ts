import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { CHAT_API_ORIGIN } from '../../apps/chat-api/src/constants.ts'
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
//   home page may lose its Work list's second item (D111), and a title Brad
//   renamed may change (TITLE_CHANGES, spec 019). The values the build counts
//   and dates, marked data-record, read as placeholders on both sides, so a
//   new record or a new day is never a change of words (spec 033). For the
//   pages in wordsMayChange, a difference is reported and allowed.
//
// The CSP may add only the sources in ADDED_SOURCES, beyond exact hashes, and
// the candidate must send each redirect in EXPECTED_REDIRECTS.
//
// pnpm release:check --live <url> --candidate <url> [--words-may-change |
// --home-words-may-change] runs it by hand, reading the live paths from the
// channel the --live address serves. The release workflow's stage job runs it
// on every release.

export interface CheckOptions {
  liveBase: string
  candidateBase: string
  livePaths: readonly string[]
  fetch: Fetch
  /** The word pages whose words may differ, such as ['/'] when only the home's change. */
  wordsMayChange: readonly string[]
  /**
   * firebase.json's Strict-Transport-Security value. On Hosting's own
   * domains Hosting sends its own in place of firebase.json's (D99), so for a
   * candidate there the check reads this instead (spec 019).
   */
  configHsts?: string
  /** Where configHsts came from, for the note, such as "firebase.json at 1af5cd5". */
  configSource?: string
}

/** Whether an address is on one of Hosting's own domains, where Hosting sets HSTS itself. */
export const onHostingDomain = (base: string): boolean => /\.(?:web\.app|firebaseapp\.com)$/.test(new URL(base).hostname)

/**
 * firebase.json's Strict-Transport-Security, when one rule for `**` sets it
 * and no other rule does, so every path is served that one value. Otherwise
 * undefined, which the check reads as a dropped header, so it fails closed.
 */
export function configHstsOf(config: string): string | undefined {
  const rules =
    (JSON.parse(config) as { hosting?: { headers?: { source?: string; headers?: { key: string; value: string }[] }[] } }).hosting
      ?.headers ?? []
  const setting = rules.flatMap((rule) =>
    (rule.headers ?? [])
      .filter((header) => header.key.toLowerCase() === 'strict-transport-security')
      .map((header) => ({ source: rule.source, value: header.value })),
  )
  return setting.length === 1 && setting[0]?.source === '**' ? setting[0].value : undefined
}

/** The word pages, whose visible words the check compares (S3.4). */
export const WORD_PAGES = ['/', '/vindecoded-agents'] as const

/** Which word pages may change, from the release's words-may-change input or flag. */
export function wordsMayChangeOf(value: string | undefined): string[] {
  if (value === 'true' || value === 'home-and-essay') return [...WORD_PAGES]
  if (value === 'home') return ['/']
  return []
}

/**
 * Titles Brad renamed on purpose, by page: the live title may read as the old
 * one, and nothing else on the page may change. The essay's is D163's.
 */
export const TITLE_CHANGES: Readonly<Record<string, readonly { from: string; to: string }[]>> = {
  '/vindecoded-agents': [
    { from: 'How one person runs a 1.4M-download product with AI agents', to: 'Running a 1.4M-download product with AI agents' },
  ],
}

/**
 * Sources the CSP may add beyond live's, by directive: the two hosts the site
 * connects to, Umami's API (D155, D159) and, from v2.1, the chat API (D198).
 */
export const ADDED_SOURCES: Readonly<Record<string, readonly string[]>> = {
  'connect-src': ['https://gateway.umami.is', CHAT_API_ORIGIN],
}

/** Redirects the candidate must send, whatever live answers: `/v2`, where the new home grew, to the home (D162). */
export const EXPECTED_REDIRECTS: Readonly<Record<string, string>> = { '/v2': '/' }

/** A page's visible words with each renamed title read as its new one. Headings may use non-breaking hyphens. */
export function withTitlesRenamed(text: string, at: string): string {
  let renamed = text
  for (const change of TITLE_CHANGES[at] ?? []) {
    for (const hyphen of ['-', '‑']) {
      renamed = renamed.replaceAll(change.from.replaceAll('-', hyphen), change.to.replaceAll('-', hyphen))
    }
  }
  return renamed
}

interface Page {
  status: number
  location: string | undefined
  headers: Headers
  body: string
}

const PROBES = ['/robots.txt', '/sitemap-index.xml', '/sitemap.xml', '/favicon.ico', '/index.html']
const MISSING = '/release-check-missing-page'
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
/** A script or style hash, or a nonce: a CSP source that names one exact resource, so adding one loosens nothing. */
const EXACT_SOURCE = /^'(?:sha256|sha384|sha512|nonce)-[^']+'$/i

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

/**
 * What the build counts and dates (spec 033): a count, marked
 * data-record="decisions", "specs" or "releases", holding a number, and the
 * date, marked data-record="counted", holding a day such as "Nov 11, 2026".
 * Anything else, marked or not, is compared as it reads, so the check fails
 * closed.
 */
const BUILD_COUNT = /(<([a-z][a-z0-9]*)\b[^>]*\sdata-record="(?:decisions|specs|releases)"[^>]*>)\d{1,6}(<\/\2>)/g
const BUILD_DAY = /(<([a-z][a-z0-9]*)\b[^>]*\sdata-record="counted"[^>]*>)[A-Z][a-z]{2} \d{1,2}, \d{4}(<\/\2>)/g

/** The page with each build-dated value read as "#", so only the words around it are compared (spec 033). */
export function withoutBuildRecords(html: string): string {
  return html.replace(BUILD_COUNT, '$1#$3').replace(BUILD_DAY, '$1#$3')
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
    map.set((match[1] ?? '').toLowerCase(), (match[2] ?? '').trim())
  return map
}

/** A Permissions-Policy allowlist's origins: () is none, * is any. */
const origins = (allow: string): Set<string> =>
  new Set(
    allow
      .replace(/^\(|\)$/g, '')
      .split(/\s+/)
      .filter((origin) => origin !== '')
      .map((origin) => origin.toLowerCase()),
  )

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
        const inherited = before.get(directive) ?? before.get('default-src')
        // A directive live doesn't have and can't inherit allows anything, so any list is stricter.
        if (inherited === undefined) continue
        const allowed = new Set([...inherited, ...(ADDED_SOURCES[directive] ?? [])].map((source) => source.toLowerCase()))
        const blocked = allowed.size === 1 && allowed.has("'none'")
        const loose = sources.find((source) => {
          const lower = source.toLowerCase()
          if (allowed.has(lower) || lower === "'none'") return false
          return blocked || !EXACT_SOURCE.test(source)
        })
        if (loose !== undefined) return `${name} adds ${loose} to ${directive}`
      }
      return undefined
    }
    case 'permissions-policy': {
      const before = permissions(live)
      const after = permissions(candidate)
      for (const [feature, allow] of before) {
        const now = after.get(feature)
        if (now === undefined) return `${name} drops ${feature}, which then falls back to the browser's default`
        const live = origins(allow)
        if (live.has('*')) continue
        const extra = [...origins(now)].find((origin) => !live.has(origin))
        if (extra !== undefined) return `${name} allows ${feature} for ${extra}, which live doesn't`
      }
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
  const hostingHsts = onHostingDomain(options.candidateBase)
  if (hostingHsts)
    notes.push(
      `– check  Hosting sets its own HSTS on ${new URL(options.candidateBase).hostname}, so the check reads ${options.configSource ?? 'firebase.json'}'s: ${options.configHsts ?? '(none, or set by more than one rule)'}`,
    )
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
        const fromConfig = name === 'strict-transport-security' && hostingHsts
        const why = looser(name, value, fromConfig ? (options.configHsts ?? null) : after.headers.get(name))
        if (why !== undefined) problems.push(`${at}  ${why}`)
      }
    } else if (isRedirect(before.status)) {
      const from = targetPath(options.liveBase, before.location)
      const to = targetPath(options.candidateBase, after.location)
      if (after.status !== before.status || from !== to)
        problems.push(`${at}  live ${before.status} to ${from}, candidate ${after.status} to ${to}`)
    }
  }

  for (const [from, to] of Object.entries(EXPECTED_REDIRECTS)) {
    const answer = await get(options.fetch, options.candidateBase, from)
    const target = targetPath(options.candidateBase, answer.location)
    if (answer.status !== 301 || target !== to) problems.push(`${from}  candidate ${answer.status} to ${target}, not 301 to ${to}`)
  }

  const missing = await get(options.fetch, options.candidateBase, MISSING)
  if (missing.status !== 404) problems.push(`missing page ${MISSING} answered ${missing.status}, not 404`)

  for (const at of WORD_PAGES) {
    const before = live.get(at) ?? (await get(options.fetch, options.liveBase, at))
    const after = candidate.get(at) ?? (await get(options.fetch, options.candidateBase, at))
    if (before.status !== 200 || after.status !== 200) {
      // A page whose words can't be compared is a miss, never a silent pass (S3.4).
      const line = `words can't be compared on ${at}: live answered ${before.status}, candidate ${after.status}`
      if (options.wordsMayChange.includes(at)) notes.push(`– check  ${line} (this run allows it)`)
      else problems.push(line)
      continue
    }
    const now = visibleText(withoutBuildRecords(after.body))
    const asIs = withTitlesRenamed(visibleText(withoutBuildRecords(before.body)), at)
    const allowed =
      at === '/' ? [asIs, withTitlesRenamed(visibleText(withoutSecondWorkItem(withoutBuildRecords(before.body))), at)] : [asIs]
    if (allowed.includes(now)) continue
    const line = `words differ on ${at}: ${firstDifference(asIs, now)}`
    if (options.wordsMayChange.includes(at)) notes.push(`– check  ${line} (this run allows it)`)
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
      `  Fix: change the build so each line above passes, or, for an intended change of words, run the release with words-may-change set to the pages that change. Nothing was released.`,
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
    const values = flags(argv, {
      live: { type: 'string' },
      candidate: { type: 'string' },
      'words-may-change': { type: 'boolean' },
      'home-words-may-change': { type: 'boolean' },
    })
    const liveBase = typeof values.live === 'string' ? values.live.replace(/\/$/, '') : LIVE_URL
    if (typeof values.candidate !== 'string') {
      console.log('✖ check  Usage: pnpm release:check --candidate <url> [--live <url>] [--words-may-change | --home-words-may-change]')
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
      wordsMayChange: wordsMayChangeOf(
        values['words-may-change'] === true ? 'true' : values['home-words-may-change'] === true ? 'home' : undefined,
      ),
      configHsts: configHstsOf(readFileSync('firebase.json', 'utf8')),
      configSource: `firebase.json at ${spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim() || 'this checkout'}`,
    })
    console.log(result.lines.join('\n'))
    return result.ok ? 0 : 1
  } catch (error) {
    console.log(`✖ check  ${reason(error)}`)
    return 1
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2), process.env)
