import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { parseResults } from '../../../apps/evals/src/results.ts'
import { caseHash } from '../../../apps/evals/src/run.ts'
import { evalsProblems } from '../../../scripts/lib/evals.ts'
import { fingerprintOf } from '../../../scripts/lib/fingerprint.ts'

// Spec 036's eval run (S7.3, SC-006), amended by D228 (spec 037): the three
// "Ask about this" cases are new, so a changed run asks them, and only them,
// before the slice lands. It passes when every case it asks passes, each after
// at most one retry. results.json stays the last full run, spec 035's.
//
// Amended by spec 038 (D229, D230): its sparkles' new cases need a changed run
// too, and a changed run asks every case new or edited since the last full run
// (D228), which these three still are. So spec 038's run, which replaces this
// slice's in changed.json, asks them again beside its own. This asks that the
// changed run hold the three as the code has them, each passed and safe.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')
const real = (file: string): string | undefined => (existsSync(path.join(ROOT, file)) ? read(file) : undefined)

const NEW_CASES = ['facts-tile-mobile', 'facts-tile-fullstack', 'facts-tile-ai'] as const

describe("spec 036's eval run", () => {
  test('S7.3 SC-006 FR-011 a changed run asked the three "Ask about this" cases as the code has them, each passed and safe, and the gate passes', () => {
    const changed = parseResults(JSON.parse(read('apps/evals/changed.json')) as unknown)
    expect(changed.mode).toBe('changed')
    expect(changed.passed).toBe(true)
    expect(changed.fingerprint.parts.cases).toBe(fingerprintOf(real)?.parts.cases)
    // Amended by spec 038 (D229, D230): the run may ask other new cases beside these three, as spec 038's does.
    expect(changed.cases.map((item) => item.id)).toEqual(expect.arrayContaining([...NEW_CASES]))
    for (const id of NEW_CASES) {
      const definition = CASES.find((c) => c.id === id)
      expect(definition, id).toBeDefined()
      expect(changed.cases.find((item) => item.id === id), id).toMatchObject({
        safe: true,
        pass: true,
        hash: definition === undefined ? 'missing' : caseHash(definition),
      })
    }
    expect(evalsProblems(real)).toEqual([])
  })
})
