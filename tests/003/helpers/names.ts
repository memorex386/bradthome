import { readFileSync } from 'node:fs'
import { testFilesUnder, testNamesIn } from '../../001/helpers/test-names.ts'

// Test names, read as text the way pnpm trace reads them (D78). pnpm trace
// counts the spec IDs at the start of a name and stops at the first token that
// isn't an ID it knows. Spec 003's names put the spec IDs first, then the mock
// states: S1.2 FR-003 P2 ….

export const SPEC_ID = /^(?:S\d+\.\d+|FR-\d{3}|SC-\d{3})$/
/** Spec 003's mock states: P1–P6, C0–C6, V1–V3 and N1. */
export const MOCK_STATE = /^(?:P\d+|C\d+|V\d+|N\d+)$/

/** The IDs a name starts with: spec IDs, then mock states. */
export function leadingIds(name: string): string[] {
  const ids: string[] = []
  for (const token of name.split(/\s+/)) {
    if (!SPEC_ID.test(token) && !MOCK_STATE.test(token)) break
    ids.push(token)
  }
  return ids
}

export interface NamedTest {
  file: string
  name: string
}

export function namedTests(dir: string): NamedTest[] {
  return testFilesUnder(dir).flatMap((file) => testNamesIn(readFileSync(file, 'utf8')).map((name) => ({ file, name })))
}
