import { readdirSync, readFileSync } from 'node:fs'
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
    // A changed run may ask no prep case, or none at all: a suite with no case to ask isn't registered (S1.2).
    expect(file).toMatch(/if \(chatCases\.length > 0\)\s*describe\('Ask about Brad'/)
    expect(file).toMatch(/if \(prepCases\.length > 0\)\s*describe\('Interview prep'/)
  })

  test('S1.3 FR-003 a run without a result for every case it asked, as when a case times out, can’t pass', () => {
    const file = read('apps', 'evals', 'src', 'run.eval.ts')
    expect(file).toContain('if (results.cases.length < asked) results.passed = false')
    expect(file).toContain("expect(cases.length, 'every case the run asked has a result').toBe(asked)")
    // Two tries of a case fit in its test's time.
    expect(file).toContain('const TWO_TRIES_MS = 150_000')
  })
})

describe('the docs (S7.2)', () => {
  test('S7.2 FR-009 D228 records Brad’s choice, the records it amends note it, and AGENTS.md and the plan describe both kinds of run', () => {
    const record = read('docs', 'decisions', '0228-evals-run-the-cases-a-change-touches.md')
    expect(record).toContain('log-id: D228')
    expect(record).toContain('Chosen option 1')
    const records = readdirSync(path.join(ROOT, 'docs', 'decisions'))
    for (const id of ['0193', '0194', '0197', '0200', '0221']) {
      const file = records.find((name) => name.startsWith(`${id}-`)) ?? id
      expect(read('docs', 'decisions', file), id).toContain('- Amended by [D228](0228-evals-run-the-cases-a-change-touches.md), 2026-11-12:')
    }
    expect(read('docs', 'decisions', 'README.md')).toContain('[0228](0228-evals-run-the-cases-a-change-touches.md)')
    expect(read('AGENTS.md')).toMatch(/a push to an `evals\/…` branch runs a changed run/)
    expect(read('AGENTS.md')).toMatch(/a run by hand with `full` set asks every case/)
    expect(read('docs', 'plan.md')).toContain('[D228](decisions/0228-evals-run-the-cases-a-change-touches.md)')
  })
})

describe('the record (S7.1)', () => {
  // While the full run's cases are still the code's, each hash must be the code's; once a changed run lands new or edited
  // cases, the record's hashes stay as its run took them, so a changed run can tell which cases changed (S2.2).
  test('S7.1 FR-009 results.json’s cases each carry a hash, the one the code’s cases give while its cases fingerprint is the code’s', () => {
    const results = parseResults(JSON.parse(read('apps', 'evals', 'results.json')))
    for (const item of results.cases) expect(item.hash, item.id).toMatch(/^[0-9a-f]{64}$/)
    if (results.fingerprint.parts.cases !== fingerprintOf(real)?.parts.cases) return
    const byId = new Map([...CASES, ...PREP_CASES].map((c) => [c.id, c]))
    for (const item of results.cases) {
      const definition = byId.get(item.id)
      expect(definition, item.id).toBeDefined()
      expect(item.hash, item.id).toBe(definition === undefined ? 'missing' : caseHash(definition))
    }
    expect(results.cases).toHaveLength(byId.size)
  })
})
