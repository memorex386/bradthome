import { readFileSync } from 'node:fs'
import path from 'node:path'
import { git, splitZ } from './git.ts'

// Traceability (FR-013, D78): every S, FR and SC ID a spec defines, and how many
// test names in the spec's test folder start with each one. It reads the names
// as text, so it works before the code exists. Mock states such as G3 or S3
// lead names too, but they aren't spec IDs.

/** A spec defines an ID where it's bold: **S1.1**, **FR-001**, **SC-001**. */
const DEFINED = /\*\*(S\d+\.\d+|FR-\d{3}|SC-\d{3})\*\*/g
const SPEC_ID = /^(?:S\d+\.\d+|FR-\d{3}|SC-\d{3})$/
const LEADING_TOKEN = /^(?:S\d+\.\d+|FR-\d{3}|SC-\d{3}|[GSCE]\d+)$/
/** A test's name: the first argument of test(…) or it(…), in any kind of quotes. */
const TEST_NAME = /(?<![.\w$])(?:test|it)(?:\.\w+)*\(\s*(['"`])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g

export interface Trace {
  /** The spec's IDs, in the order the spec defines them. */
  ids: string[]
  /** How many test names each ID leads. */
  counts: Map<string, number>
  /** The IDs no test name leads. */
  missing: string[]
  /** The spec's test folder, such as tests/001. */
  folder: string
}

/** A spec folder's number, such as 001 for specs/001-name, or undefined when it has none. */
export function specFolderNumber(spec: string): string | undefined {
  return /^(\d{3})-/.exec(path.basename(spec))?.[1]
}

function leadingIds(name: string): string[] {
  const ids: string[] = []
  for (const token of name.split(/\s+/)) {
    if (!LEADING_TOKEN.test(token)) break
    if (SPEC_ID.test(token)) ids.push(token)
  }
  return ids
}

/** Traces a spec, given its folder relative to the checkout's root, as in specs/001-name. */
export function traceSpec(root: string, spec: string, number: string): Trace {
  const ids = [...new Set([...readFileSync(path.join(root, spec, 'spec.md'), 'utf8').matchAll(DEFINED)].map((m) => m[1] ?? ''))]
  const folder = `tests/${number}`
  const counts = new Map<string, number>()
  const files = splitZ(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', folder], { cwd: root }))
  for (const file of new Set(files)) {
    if (!file.endsWith('.test.ts')) continue
    let source: string
    try {
      source = readFileSync(path.join(root, file), 'utf8')
    } catch {
      continue
    }
    for (const match of source.matchAll(TEST_NAME)) {
      for (const id of leadingIds(match[2] ?? '')) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  return { ids, counts, missing: ids.filter((id) => !counts.has(id)), folder }
}
