import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { loadCorpus } from '../../../apps/evals/src/corpus.ts'
import { parseResults } from '../../../apps/evals/src/results.ts'
import { fingerprintOf } from '../../../scripts/lib/fingerprint.ts'

// Spec 036's eval run (S7.3, SC-006): the three "Ask about this" cases change
// the cases, and the years claims the corpus, so a fresh run on this code must
// pass under D200 and D221, with each new case answered, citing its role, and
// safe. The chat's prompt and model, the judge and the checks don't change.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')
const fingerprint = () => fingerprintOf((file) => (existsSync(path.join(ROOT, file)) ? read(file) : undefined))

/** The fingerprint's parts before this spec: spec 035's passing run on main at 7155368 (43224635686). */
const BEFORE = {
  prompt: '4ec2af92b9ee2109485cbb6e7372b92becf73578f2ef0305e4110793d4db0022',
  model: 'f74ff86f9dda33e35645bee96d33dd2a11a439478e5e997a64f08d52c355e240',
  judge: '3d38d166d410d6399797c128e18db84c1dafc3b75bafa9e3b1e02993488adc5f',
  checks: 'e4549cd56a15ee775b0efb1748ef8956afd2ba958600354b86a80c20b7febdeb',
  cases: 'da144556ab8afebd59d0e7a6a255790a83bff92587eb79028dc9b7a14cc739b7',
} as const

const NEW_CASES = ['facts-tile-mobile', 'facts-tile-fullstack', 'facts-tile-ai'] as const

describe("spec 036's eval run", () => {
  test('S7.3 SC-006 FR-011 the committed run holds the three "Ask about this" cases, answered and safe, and passes under D200 and D221 on this code', () => {
    const results = parseResults(JSON.parse(read('apps/evals/results.json')) as unknown)
    const code = fingerprint()
    const { cases, ...unchanged } = code?.parts ?? BEFORE
    const { cases: casesBefore, ...unchangedBefore } = BEFORE
    expect(unchanged).toEqual(unchangedBefore)
    expect(cases).not.toBe(casesBefore)
    expect(results.fingerprint).toEqual(code)
    for (const id of NEW_CASES) {
      expect(CASES.some((c) => c.id === id), id).toBe(true)
      expect(results.cases.find((entry) => entry.id === id), id).toMatchObject({ safe: true, pass: true })
    }
    expect(results.passed).toBe(true)
    expect(results.totals.safe).toBe(results.totals.cases)
    // D221: one allowance across every judged answer, the chat's and interview prep's together.
    const { cases: judged, passed, allowedMisses } = results.totals.judged ?? { cases: 0, passed: 0, allowedMisses: -1 }
    expect(judged - passed).toBeLessThanOrEqual(allowedMisses)
    expect(allowedMisses).toBe(Math.ceil(judged * 0.05))
    expect(results.corpus.sources).toBe(loadCorpus(ROOT).sources.length)
  })
})
