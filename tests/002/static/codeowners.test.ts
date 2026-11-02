import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { BRAD_LOGIN, GITHUB } from '../helpers/paths.ts'

// .github/CODEOWNERS names Brad for every path (S5.4, D81). GitHub uses the
// last pattern that matches a path, so one line for every path, and no other
// line, keeps Brad the owner of everything.

describe('code owners', () => {
  test("S5.4 FR-016 R1 CODEOWNERS names Brad's account as the owner of every path, and no one else", () => {
    const lines = readFileSync(GITHUB.codeowners, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+#.*$/, '').trim())
      .filter((line) => line !== '' && !line.startsWith('#'))
    expect(lines).toEqual([`* @${BRAD_LOGIN}`])
  })
})
