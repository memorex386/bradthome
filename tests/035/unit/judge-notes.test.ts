import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { HOW, judgeNoteOf } from '../../../apps/site/src/components/evals/evals.ts'

// Spec 035, Story 3: /evals shows each judge's note through the chat's own
// pronoun rewriter (spec 021's FR-008), so it calls Brad "Brad". Verdicts,
// checks and results.json keep what the run recorded, and the page says how
// the notes' words differ from the judge's.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')

describe("the judge's notes on /evals (story 3)", () => {
  test('S3.1 FR-005 each he, him, his or himself in a note shows as Brad, or Brad’s for his', () => {
    // The note slice 5.9's run recorded for facts-fintech-ai, and the kinds live's run had.
    expect(judgeNoteOf('The sources state he was founding engineer on the Fintech app.')).toBe(
      'The sources state Brad was founding engineer on the Fintech app.',
    )
    expect(judgeNoteOf('It ran on his desktop, as the essay says.')).toBe('It ran on Brad’s desktop, as the essay says.')
    expect(judgeNoteOf('He built it. The sources credit him, and he describes himself as its builder.')).toBe(
      'Brad built it. The sources credit Brad, and Brad describes Brad as its builder.',
    )
    expect(judgeNoteOf('His role is stated.')).not.toMatch(/\b(?:he|him|his|himself)\b/i)
  })

  test('S3.1 FR-005 a word that only holds the letters, and they or their for the sources, stay as written', () => {
    const note = 'The theme of this history follows from them; they say their claims hold, and the answer matches the sources.'
    expect(judgeNoteOf(note)).toBe(note)
  })

  test('S3.2 FR-005 the page passes only the note through the rewriter: verdicts, checks and results.json stay as the run recorded them', () => {
    const page = read('apps/site/src/pages/evals.astro')
    expect(page).toContain('{judgeNoteOf(item.judge.reason)}')
    expect(page.match(/judgeNoteOf\(/g)).toHaveLength(1)
    expect(page).toContain("{item.pass ? 'Passed' : 'Failed'}")
    expect(page).toContain("{check.pass ? 'Pass' : 'Fail'}")
    // The run writes the judge's words as they came: nothing in the evals' code rewrites them. run.eval.ts
    // builds each note from the judge's reply and writes results.json.
    for (const file of ['apps/evals/src/judge.ts', 'apps/evals/src/run.ts', 'apps/evals/src/run.eval.ts', 'apps/evals/src/results.ts']) {
      expect(read(file), file).not.toMatch(/pronouns|withName|judgeNoteOf/)
    }
  })

  test("S3.3 FR-006 How it works says the notes are the judge's words, with Brad's name for each pronoun", () => {
    expect(HOW).toContain(
      'The judge’s notes are its own words, except that each pronoun for Brad becomes Brad’s name, as in the chat’s answers.',
    )
  })
})
