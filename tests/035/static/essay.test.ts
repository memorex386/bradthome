import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// Spec 035, Story 1: the essay's two framing lines say what Brad does, in
// Brad's words from the session's card (D222), and every other word of the
// essay stays as it was.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')
const ESSAY = 'apps/site/src/pages/vindecoded-agents.mdx'
const FIXTURE = 'tests/006/fixtures/article.txt'

const SUMMARY =
  'I run VINDecoded, a profitable vehicle-research product on Android, iOS and the web, where AI agents write most of the code and I review and approve the work.'
const CONSTRAINT = 'The constraint is that the work waits for my review and approval.'

/** Each new sentence, with the words it replaced. */
const SWAPS = [
  [
    'where AI agents write most of the code and I review and approve the work.',
    'as a one-person engineering team where AI agents write most of the code.',
  ],
  [CONSTRAINT, 'The constraint is that I am the whole engineering team.'],
] as const

/** The SHA-256 of spec 006's article fixture before this spec, at 9adafd8. */
const FIXTURE_BEFORE = '0bd9bbf0fa6847ad9843bd808b224d6261f552847bdd75b73811172f33ddaf05'

/** The framings the essay avoids (D163, D199, D222). */
const AVOIDED = /one[-‑]person|whole engineering team|one engineer|team of AI agents|\bsolo\b/i

/** A section's paragraphs: the text under its level-2 heading, split at blank lines. */
function paragraphsOf(source: string, heading: string): string[] {
  const start = source.indexOf(`## ${heading}\n`)
  expect(start, heading).toBeGreaterThan(-1)
  const body = source.slice(start + heading.length + 4)
  const end = body.indexOf('\n## ')
  return (end === -1 ? body : body.slice(0, end))
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}

describe('the essay says what Brad does (story 1)', () => {
  test('S1.1 FR-001 the summary opens with the sentence Brad chose', () => {
    const [first] = paragraphsOf(read(ESSAY), 'Summary')
    expect(first?.startsWith(`${SUMMARY} `)).toBe(true)
  })

  test('S1.2 FR-001 the constraint section’s third paragraph opens with the sentence Brad chose', () => {
    const paragraphs = paragraphsOf(read(ESSAY), 'The product and the constraint')
    expect(paragraphs[2]?.startsWith(`${CONSTRAINT} `)).toBe(true)
  })

  test('S1.3 FR-002 no text in the essay reads one-person, whole engineering team, one engineer, a team of AI agents or solo', () => {
    expect(read(ESSAY)).not.toMatch(AVOIDED)
    expect(read(FIXTURE)).not.toMatch(AVOIDED)
  })

  test("S1.3 FR-001 SC-001 spec 006's fixture holds the two new sentences and differs from the old one only there", () => {
    let fixture = read(FIXTURE)
    expect(fixture).toContain(SUMMARY)
    expect(fixture).toContain(CONSTRAINT)
    for (const [now, before] of SWAPS) {
      expect(fixture.split(now)).toHaveLength(2)
      fixture = fixture.replace(now, before)
    }
    expect(createHash('sha256').update(fixture).digest('hex')).toBe(FIXTURE_BEFORE)
  })
})
