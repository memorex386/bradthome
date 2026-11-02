import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { leadingIds, MOCK_STATE, namedTests, SPEC_ID } from '../helpers/names.ts'
import { SPEC_DIR, TESTS_DIR } from '../helpers/paths.ts'

// Coverage of spec 002 by test names, read as text (D78). pnpm trace checks
// the spec IDs too. This also checks the mock states, which pnpm trace doesn't
// know, and that each name puts its spec IDs before its mock states, so pnpm
// trace counts them.

/** The states only GitHub's own page shows: M1 now, and M2 from slice 1.5. They're checked on GitHub, not here. */
const SHOWN_ONLY_ON_GITHUB = ['M1', 'M2']

describe('coverage of spec 002', () => {
  test('FR-012 every S, FR and SC ID in spec 002 leads at least one test name', () => {
    const spec = readFileSync(path.join(SPEC_DIR, 'spec.md'), 'utf8')
    const ids = [...new Set([...spec.matchAll(/\*\*(S\d+\.\d+|FR-\d{3}|SC-\d{3})\*\*/g)].map((match) => match[1] ?? ''))]
    expect(ids).toHaveLength(50)
    const covered = new Set(namedTests(TESTS_DIR).flatMap((test) => leadingIds(test.name)))
    expect(ids.filter((id) => !covered.has(id))).toEqual([])
  })

  test("FR-012 each of the 17 states in the mocks leads a test name, apart from the two only GitHub's page shows", () => {
    const mocks = readFileSync(path.join(SPEC_DIR, 'mocks', 'README.md'), 'utf8')
    const states = [...mocks.matchAll(/^\| \[([A-Z]\d+)\]\(#[a-z0-9]+\) \|/gm)].map((match) => match[1] ?? '')
    expect(states).toHaveLength(17)
    const covered = new Set(namedTests(TESTS_DIR).flatMap((test) => leadingIds(test.name)))
    expect(states.filter((state) => !SHOWN_ONLY_ON_GITHUB.includes(state) && !covered.has(state))).toEqual([])
  })

  test('FR-012 every test name starts with a spec ID, and its mock states come after its spec IDs', () => {
    for (const { file, name } of namedTests(TESTS_DIR)) {
      const where = `${path.relative(TESTS_DIR, file)}: ${name}`
      const ids = leadingIds(name)
      expect(SPEC_ID.test(ids[0] ?? ''), where).toBe(true)
      const firstState = ids.findIndex((id) => !SPEC_ID.test(id))
      if (firstState >= 0) expect(ids.slice(firstState).every((id) => MOCK_STATE.test(id)), where).toBe(true)
    }
  })
})
