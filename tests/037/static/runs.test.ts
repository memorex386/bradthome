import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { PREP_CASES } from '../../../apps/evals/src/prep-cases.ts'
import { parseResults } from '../../../apps/evals/src/results.ts'
import { caseHash } from '../../../apps/evals/src/run.ts'
import { fingerprintOf } from '../../../scripts/lib/fingerprint.ts'

// Spec 037's workflow, eval file and record (D228): a push runs a changed run,
// only a run by hand with full set runs every case, the eval file's tests hold
// each kind to its own bar, and results.json carries each case's hash.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')
const real = (file: string): string | undefined => {
  try {
    return read(file)
  } catch {
    return undefined
  }
}

interface Step {
  name?: string
  run?: string
  uses?: string
  if?: string
  env?: Record<string, string>
  with?: Record<string, unknown>
}
interface Workflow {
  on: { push?: { branches?: string[] }; workflow_dispatch?: { inputs?: Record<string, { type?: string; default?: unknown }> } }
  jobs: Record<string, { steps: Step[] }>
}

describe('the workflow and the eval file (S1.1, S3.1, S3.2)', () => {
  test('S1.1 S3.1 FR-005 a push to evals/** runs a changed run, and only a run by hand with full set runs every case', () => {
    const evals = parse(read('.github', 'workflows', 'evals.yml')) as Workflow
    expect(evals.on.push?.branches).toEqual(['evals/**'])
    expect(evals.on.workflow_dispatch?.inputs?.full).toMatchObject({ type: 'boolean', default: false })
    const steps = evals.jobs.run?.steps ?? []
    const run = steps.find((step) => step.run === 'pnpm evals')
    expect(run?.env?.EVALS_MODE).toBe("${{ inputs.full && 'full' || 'changed' }}")
    const upload = steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'))
    expect(upload?.if).toBe('always()')
    expect(upload?.with?.path).toBe("apps/evals/${{ inputs.full && 'results' || 'changed' }}.json")
  })

  test('S1.1 S3.2 FR-003 FR-008 the eval file asks only the changed cases unless full is set, and holds each kind of run to its own bar', () => {
    const file = read('apps', 'evals', 'src', 'run.eval.ts')
    expect(file).toContain("process.env.EVALS_MODE === 'full'")
    expect(file).toMatch(/changedCases\(CASES,/)
    expect(file).toMatch(/changedCases\(PREP_CASES,/)
    expect(file).toContain("'changed.json'")
    // D221's pooled bar alone for a full run: no suite keeps a bar of its own.
    expect(file).not.toContain('accuracy: at most 5% of the accuracy cases miss')
    expect(file).not.toContain("accuracy: at most 5% of prep's accuracy cases miss")
    expect(file).toContain('runner.finish().passed')
  })
})

describe('the record (S7.1)', () => {
  test('S7.1 FR-009 results.json’s cases each carry the hash main’s cases give, since its cases fingerprint is the code’s', () => {
    const results = parseResults(JSON.parse(read('apps', 'evals', 'results.json')))
    expect(results.fingerprint.parts.cases).toBe(fingerprintOf(real)?.parts.cases)
    const byId = new Map([...CASES, ...PREP_CASES].map((c) => [c.id, c]))
    for (const item of results.cases) {
      const definition = byId.get(item.id)
      expect(definition, item.id).toBeDefined()
      expect(item.hash, item.id).toBe(definition === undefined ? 'missing' : caseHash(definition))
    }
    expect(results.cases).toHaveLength(byId.size)
  })
})
