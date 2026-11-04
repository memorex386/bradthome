import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { stringify } from 'yaml'
import { type Claim, claimSchemaFor, subjectsIn } from '../../apps/site/src/content/schema.ts'
import { gate } from '../lib/output.ts'
import { envValue, loadTerms, termLines } from '../lib/terms.ts'

// pnpm content:export (spec 005, D44, D108). Reads Brad's notes from the folder
// --notes or BRADTHOME_NOTES names, keeps the bullets tagged exactly public,
// and writes them as claims for the job or project their heading names. It
// checks the claims with the site's schema and the private-term list before
// writing, and its report gives counts, never a dropped bullet's text.

export const VARIABLE = 'BRADTHOME_NOTES'
export const CLAIMS_FILE = 'claims.yaml'

const HEADER =
  '# Written by pnpm content:export (spec 005) from the notes tagged public.\n# Change the notes and export again, rather than editing this file.\n'

/** The tag at a bullet's end: *(source · who may see it)*. */
const TAG = /\s*\*\(([\s\S]*)\)\*\s*$/
/** Any tag's start. A bullet with more than one is ambiguous, so it's dropped. */
const TAG_START = /\*\(/g
const LINK = /\bhttps?:\/\/[^\s,;()`\\]+/g

type Who = 'public' | 'interview' | 'private' | 'none' | 'other'

export interface Report {
  written: Map<string, number>
  dropped: Record<Exclude<Who, 'public'>, number>
  unmatched: Map<string, number>
  http: number
}

interface Bullet {
  lines: string[]
  h1: string | undefined
  h2: string | undefined
}

/** A heading's name in lowercase words joined by hyphens, as job and project IDs are. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** The part of a heading before any " · ". */
const headingName = (heading: string) => (heading.split(' · ')[0] ?? heading).trim()

/** Splits a notes file into top-level bullets, each with the headings above it. */
function bullets(text: string): Bullet[] {
  const found: Bullet[] = []
  let h1: string | undefined
  let h2: string | undefined
  let current: Bullet | undefined
  for (const line of text.split(/\r?\n/)) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading !== null) {
      current = undefined
      const level = heading[1]?.length ?? 0
      const name = (heading[2] ?? '').trim()
      if (level === 1) [h1, h2] = [name, undefined]
      else if (level === 2) h2 = name
      continue
    }
    if (line.startsWith('- ')) {
      current = { lines: [line.slice(2)], h1, h2 }
      found.push(current)
    } else if (current !== undefined && (line.trim() === '' || /^\s/.test(line))) {
      current.lines.push(line.replace(/^ {1,2}/, ''))
    } else {
      current = undefined
    }
  }
  return found
}

/** A bullet's text without its tag, the tag's source, and who may see it. */
function readTag(bullet: Bullet): { text: string; source: string; who: Who } {
  const whole = bullet.lines.join('\n').trimEnd()
  const tag = TAG.exec(whole)
  if (tag === null) return { text: whole, source: '', who: 'none' }
  // A nested item with its own tag would let one tag speak for the whole
  // bullet, so a bullet holding two tags counts as other and is never written.
  if ((whole.match(TAG_START) ?? []).length > 1) return { text: whole, source: '', who: 'other' }
  const inner = (tag[1] ?? '').trim()
  const split = inner.lastIndexOf(' · ')
  const source = split === -1 ? '' : inner.slice(0, split)
  const label = (split === -1 ? inner : inner.slice(split + 3)).trim()
  const who: Who = label === 'public' || label === 'interview' || label === 'private' ? label : 'other'
  return { text: whole.slice(0, tag.index).trimEnd(), source, who }
}

/** The https links in a source, and how many http ones it held. */
function links(source: string): { evidence: string[]; http: number } {
  const evidence: string[] = []
  let http = 0
  for (const match of source.matchAll(LINK)) {
    const url = match[0].replace(/[.]+$/, '')
    if (url.startsWith('https://')) {
      if (!evidence.includes(url)) evidence.push(url)
    } else {
      http += 1
    }
  }
  return { evidence, http }
}

/** Turns notes files into claims, keyed by ID and sorted by subject, with the report (FR-009–FR-012, FR-014). */
export function parseNotes(
  files: readonly { text: string }[],
  subjects: ReadonlySet<string>,
): { claims: [string, Claim][]; report: Report } {
  const report: Report = { written: new Map(), dropped: { interview: 0, private: 0, none: 0, other: 0 }, unmatched: new Map(), http: 0 }
  const bySubject = new Map<string, [string, Claim][]>()
  const counters = new Map<string, number>()

  for (const file of files) {
    for (const bullet of bullets(file.text)) {
      const { text, source, who } = readTag(bullet)
      if (who !== 'public') {
        report.dropped[who] += 1
        continue
      }
      const h2 = bullet.h2 === undefined ? undefined : headingName(bullet.h2)
      const h1 = bullet.h1 === undefined ? undefined : headingName(bullet.h1)
      let subject: string
      let topic: string | undefined
      if (h2 !== undefined && subjects.has(slug(h2))) {
        subject = slug(h2)
      } else if (h1 !== undefined && subjects.has(slug(h1))) {
        subject = slug(h1)
        topic = h2
      } else {
        const under = h2 ?? h1 ?? '(no heading)'
        report.unmatched.set(under, (report.unmatched.get(under) ?? 0) + 1)
        continue
      }
      const { evidence, http } = links(source)
      report.http += http
      const stem = topic === undefined ? subject : `${subject}-${slug(topic)}`
      const n = (counters.get(stem) ?? 0) + 1
      counters.set(stem, n)
      const list = bySubject.get(subject) ?? []
      const claim: Claim = {
        subject,
        ...(topic === undefined ? {} : { topic }),
        order: list.length + 1,
        text,
        evidence,
        visibility: 'public',
      }
      list.push([`${stem}-${n}`, claim])
      bySubject.set(subject, list)
    }
  }

  const claims = [...bySubject.keys()].sort().flatMap((subject) => bySubject.get(subject) ?? [])
  for (const [, claim] of claims) report.written.set(claim.subject, (report.written.get(claim.subject) ?? 0) + 1)
  return { claims, report }
}

/** The claims file's text: a fixed header, then one entry per claim, never folded (FR-012). */
export function renderClaims(claims: readonly [string, Claim][]): string {
  return `${HEADER}${stringify(Object.fromEntries(claims), { lineWidth: 0, singleQuote: true })}`
}

function reportLines(report: Report, total: number): string[] {
  const rows = (entries: Iterable<[string, number]>) => [...entries].map(([name, count]) => `    ${name}  ${count}`)
  return [
    `✓ content:export  wrote ${total} ${total === 1 ? 'claim' : 'claims'} to ${CLAIMS_FILE}`,
    '  written',
    ...rows([...report.written].sort(([a], [b]) => a.localeCompare(b))),
    '  dropped by tag',
    ...rows([
      ['interview', report.dropped.interview],
      ['private', report.dropped.private],
      ['no tag', report.dropped.none],
      ['other tag', report.dropped.other],
    ]),
    '  public, but not written: no job or project heading',
    ...(report.unmatched.size === 0 ? ['    none'] : rows(report.unmatched)),
    '  links not kept as evidence',
    ...rows([['http link', report.http]]),
  ]
}

function notesFolder(args: readonly string[], env: NodeJS.ProcessEnv): string | undefined {
  const index = args.indexOf('--notes')
  const fromArg = index === -1 ? args.find((arg) => arg.startsWith('--notes='))?.slice('--notes='.length) : args[index + 1]
  const folder = fromArg ?? envValue(env, VARIABLE)
  return folder === undefined || folder === '' ? undefined : folder
}

/** Runs the export. Writes claims.yaml in contentDir only when every check passes (FR-008, FR-013). */
export function exportContent(options: { args: readonly string[]; env: NodeJS.ProcessEnv; contentDir: string; cwd: string }): {
  code: number
  lines: string[]
} {
  const fail = (...lines: string[]) => ({ code: 1, lines })
  const folder = notesFolder(options.args, options.env)
  if (folder === undefined) return fail(`✖ content:export  name the notes folder: pnpm content:export --notes <folder>, or set ${VARIABLE}`)
  if (!existsSync(folder) || !statSync(folder).isDirectory())
    return fail(`✖ content:export  the notes folder doesn't exist. Check --notes or ${VARIABLE}`)

  // Only the top-level topic files: never README.md, and never a subfolder such as raw/.
  const files = readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md')
    .map((entry) => entry.name)
    .sort()
    .map((name) => ({ text: readFileSync(path.join(folder, name), 'utf8') }))

  const subjects = subjectsIn(options.contentDir)
  const { claims, report } = parseNotes(files, subjects)

  const loaded = loadTerms(options.env, options.cwd)
  if ('problem' in loaded)
    return fail(`✖ content:export  the private-term list isn't ${loaded.problem === 'empty' ? 'filled in' : 'found'}. Nothing was written`)
  const terms = loaded.terms

  const schema = claimSchemaFor(subjects)
  const invalid = claims.flatMap(([id, claim]) => {
    const result = schema.safeParse(claim)
    return result.success ? [] : result.error.issues.map((issue) => `  ${id}: ${issue.path.join('.') || '(claim)'} ${issue.message}`)
  })
  if (invalid.length > 0)
    return { code: 1, lines: gate(["✖ content:export  claims that fail the site's schema. Nothing was written", ...invalid], terms) }

  const output = renderClaims(claims)
  const found = termLines(output, terms)
  if (found.length > 0) {
    return fail(
      '✖ content:export  the claims would hold a private term. Nothing was written',
      ...found.map((line) => `  line ${line} of ${CLAIMS_FILE}`),
    )
  }

  const target = path.join(options.contentDir, CLAIMS_FILE)
  const temporary = `${target}.${process.pid}.tmp`
  writeFileSync(temporary, output)
  renameSync(temporary, target)
  return { code: 0, lines: gate(reportLines(report, claims.length), terms) }
}
