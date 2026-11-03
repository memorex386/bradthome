import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// pnpm csp: firebase.json's Content-Security-Policy from Astro's hashes (FR-019,
// S4.1, C6). Astro's security.csp writes each page's script and style hashes in
// a meta tag. This gathers them into one policy for every path, which allows
// the site's own files and inline code only by hash. pnpm csp writes it into
// firebase.json, and pnpm csp --check fails the build job when it's stale.

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const DIST = path.join(ROOT, 'apps', 'site', 'dist')
const CONFIG = path.join(ROOT, 'firebase.json')
const HEADER = 'Content-Security-Policy'

/** The directives every page gets, before the hashes. */
const BASE = ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"]
const HASH = /^'sha(?:256|384|512)-[A-Za-z0-9+/]+={0,2}'$/

interface Header {
  key: string
  value: string
}

interface Rule {
  source?: string
  headers?: Header[]
}

interface Config {
  hosting?: { headers?: Rule[] } & Record<string, unknown>
}

/** The hashes a page's CSP meta tag lists for one directive. */
function metaHashes(html: string, directive: string): string[] {
  const hashes: string[] = []
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/http-equiv=["']?content-security-policy["']?/i.test(tag)) continue
    const content = /\bcontent="([^"]*)"/i.exec(tag)?.[1] ?? /\bcontent='([^']*)'/i.exec(tag)?.[1] ?? ''
    for (const part of content.split(';')) {
      const [name, ...values] = part.trim().split(/\s+/)
      if (name?.toLowerCase() === directive) hashes.push(...values.filter((value) => HASH.test(value)))
    }
  }
  return hashes
}

/** The policy for every built page, from the hashes in each page's CSP meta tag. */
export function pagePolicy(pages: readonly string[]): string {
  const sources = (directive: string): string => {
    const hashes = [...new Set(pages.flatMap((html) => metaHashes(html, directive)))].sort()
    return [`${directive} 'self'`, ...hashes].join(' ')
  }
  return [...BASE, sources('script-src'), sources('style-src')].join('; ')
}

function everyPathRule(config: Config): Rule | undefined {
  return config.hosting?.headers?.find((rule) => rule.source === '**')
}

/** firebase.json's parsed config with the policy as the Content-Security-Policy header on every path (**). */
export function applyPolicy(config: unknown, policy: string): unknown {
  const copy = structuredClone(config ?? {}) as Config
  copy.hosting ??= {}
  copy.hosting.headers ??= []
  let rule = everyPathRule(copy)
  if (rule === undefined) {
    rule = { source: '**', headers: [] }
    copy.hosting.headers.push(rule)
  }
  rule.headers ??= []
  const header = rule.headers.find((entry) => entry.key.toLowerCase() === HEADER.toLowerCase())
  if (header === undefined) rule.headers.unshift({ key: HEADER, value: policy })
  else header.value = policy
  return copy
}

/** No lines when the config already holds the policy, or the build job's failure lines. */
export function policyProblems(config: unknown, policy: string): string[] {
  const header = everyPathRule((config ?? {}) as Config)?.headers?.find((entry) => entry.key.toLowerCase() === HEADER.toLowerCase())
  if (header?.value === policy) return []
  return [
    `✖ build  firebase.json's ${HEADER} doesn't match the build's hashes`,
    header === undefined ? '  firebase.json sets no policy for every path (**)' : "  firebase.json's policy is out of date",
    '  Fix: pnpm csp after pnpm site:build, then commit firebase.json.',
  ]
}

function builtPages(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => readFileSync(path.join(entry.parentPath, entry.name), 'utf8'))
}

function main(args: readonly string[]): number {
  if (!existsSync(DIST)) {
    console.log(['✖ build  no built site in apps/site/dist', '  Fix: pnpm site:build, then pnpm csp.'].join('\n'))
    return 1
  }
  const policy = pagePolicy(builtPages(DIST))
  const config: unknown = JSON.parse(readFileSync(CONFIG, 'utf8'))
  if (args.includes('--check')) {
    const problems = policyProblems(config, policy)
    console.log(problems.length === 0 ? `✓ build  ${HEADER} in firebase.json matches the build` : problems.join('\n'))
    return problems.length === 0 ? 0 : 1
  }
  writeFileSync(CONFIG, `${JSON.stringify(applyPolicy(config, policy), null, 2)}\n`)
  console.log(`✓ csp  wrote the build's ${HEADER} into firebase.json`)
  return 0
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2))
