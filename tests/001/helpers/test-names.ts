import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Test names read from the source text, the way the traceability check reads
// them, so they can be checked before any test runs (D78).

const NAME = /(?<![.\w$])(?:test|it)(?:\.\w+)*\(\s*(['"`])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g

/** A token that's a spec ID or a mock state: S1.1, FR-001, SC-001, G3, S1, C7, E1. */
export const ID_TOKEN = /^(?:S\d+\.\d+|FR-\d{3}|SC-\d{3}|[GSCE]\d+)$/

export function testNamesIn(source: string): string[] {
  return [...source.matchAll(NAME)].map((match) => match[2] ?? '')
}

/** The IDs a test name starts with. */
export function leadingIds(name: string): string[] {
  const ids: string[] = []
  for (const token of name.split(/\s+/)) {
    if (!ID_TOKEN.test(token)) break
    ids.push(token)
  }
  return ids
}

/** Every *.test.ts file under a folder. */
export function testFilesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.ts'))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
}

/** Every ID that leads a test name in the folder's test files. */
export function idsLeadingTestNames(dir: string): Set<string> {
  const ids = new Set<string>()
  for (const file of testFilesUnder(dir)) {
    for (const name of testNamesIn(readFileSync(file, 'utf8'))) for (const id of leadingIds(name)) ids.add(id)
  }
  return ids
}
