import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { deploy } from '../../../scripts/chat-api/deploy.ts'
import { CHANGED_FILE, deployProblems, evalsProblems, RESULTS_FILE } from '../../../scripts/lib/evals.ts'
import { FINGERPRINT_FILES, fingerprintOf } from '../../../scripts/lib/fingerprint.ts'

// Spec 037's gate and deploy check (D228). The gate, which ci / hygiene and the
// pre-push hook run, checks only the cases: main needs the last full run's
// cases, or a passing changed run's, to match the code's. The chat API's
// deploy needs a passing full run with the code's prompt and model.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const real = (file: string): string | undefined => {
  try {
    return readFileSync(path.join(ROOT, file), 'utf8')
  } catch {
    return undefined
  }
}

/** The repo's files, with one changed. */
const withFile = (file: string, change: (text: string) => string) => (name: string) => {
  const text = real(name)
  return name === file && text !== undefined ? change(text) : text
}

/** A run's record whose fingerprint is the one `read` gives. */
function runFor(read: (file: string) => string | undefined, over: Record<string, unknown> = {}): string {
  const base = JSON.parse(real(RESULTS_FILE) ?? '{}') as Record<string, unknown>
  return JSON.stringify({ ...base, fingerprint: fingerprintOf(read), passed: true, ...over })
}

/** `read`, with the full run's and the changed run's records replaced; undefined leaves a file missing. */
const withRuns =
  (read: (file: string) => string | undefined, full: string | undefined, changed?: string) =>
  (file: string): string | undefined =>
    file === RESULTS_FILE ? full : file === CHANGED_FILE ? changed : read(file)

const editedCases = withFile(FINGERPRINT_FILES.cases, (text) => `${text}\n// an edited case\n`)

describe('the gate (S2.1–S2.3)', () => {
  test('S2.1 FR-004 SC-002 passes when the cases match the last full run’s, whatever changed in the prompt, the model, the judge or the checks', () => {
    const run = runFor(real)
    expect(evalsProblems(withRuns(real, run))).toEqual([])
    for (const file of [FINGERPRINT_FILES.prompt, FINGERPRINT_FILES.judge, FINGERPRINT_FILES.checks, FINGERPRINT_FILES.runner]) {
      expect(evalsProblems(withRuns(withFile(file, (text) => `${text}\n// changed\n`), run)), file).toEqual([])
    }
    const model = withFile(FINGERPRINT_FILES.constants, (text) => text.replace("MODEL = 'claude-haiku-5-5'", "MODEL = 'claude-sonnet-5-5'"))
    expect(fingerprintOf(model)?.parts.model).not.toBe(fingerprintOf(real)?.parts.model)
    expect(evalsProblems(withRuns(model, run))).toEqual([])
  })

  test('S2.1 FR-004 a full run that failed doesn’t hold main back when its cases match: the deploy needs it to pass, not main', () => {
    expect(evalsProblems(withRuns(real, runFor(real, { passed: false })))).toEqual([])
  })

  test('S2.2 FR-004 fails when a case changed and no changed run matches, saying how to run the changed cases', () => {
    const lines = evalsProblems(withRuns(editedCases, runFor(real)))
    expect(lines[0]).toBe('✖ evals  the cases changed since the last full run')
    expect(lines.at(-1)).toMatch(/^ {2}Fix: push this commit to a branch named evals\/…, then commit apps\/evals\/changed\.json from the run’s artifact\.$/)
  })

  test('S2.2 FR-004 passes when a passing changed run matches the code’s cases, and not when it matches other cases', () => {
    const full = runFor(real)
    expect(evalsProblems(withRuns(editedCases, full, runFor(editedCases, { mode: 'changed', cases: [] })))).toEqual([])
    const stale = runFor(real, { mode: 'changed', cases: [] })
    expect(evalsProblems(withRuns(editedCases, full, stale))[0]).toBe('✖ evals  the cases changed since the last full run')
  })

  test('S2.3 FR-004 fails when the changed run failed, saying how many of its cases passed', () => {
    const changed = runFor(editedCases, { mode: 'changed', passed: false, totals: { cases: 3, passed: 1 } })
    const lines = evalsProblems(withRuns(editedCases, runFor(real), changed))
    expect(lines[0]).toBe('✖ evals  the changed run failed')
    expect(lines.join('\n')).toContain('1 of 3 cases passed')
  })

  test('S2.2 FR-004 fails closed: no full run, or a record that isn’t a run’s results, even a changed run’s', () => {
    expect(evalsProblems(withRuns(real, undefined))[0]).toBe('✖ evals  no eval run is recorded')
    expect(evalsProblems(withRuns(real, '{"version":1}'))[0]).toBe("✖ evals  apps/evals/results.json isn't a run's results")
    expect(evalsProblems(withRuns(real, 'not json'))[0]).toBe("✖ evals  apps/evals/results.json isn't a run's results")
    expect(evalsProblems(withRuns(editedCases, runFor(real), '{"version":1}'))[0]).toBe("✖ evals  apps/evals/changed.json isn't a run's results")
  })

  test('S2.1 a commit with no chat API has nothing to check', () => {
    expect(evalsProblems(() => undefined)).toEqual([])
  })
})

describe('the deploy check (S5.1, S5.2)', () => {
  test('S5.1 FR-006 stops when there’s no full run, it didn’t pass, or its prompt or model differs from the code’s, naming what differs', () => {
    expect(deployProblems(withRuns(real, undefined))[0]).toBe('✖ evals  no full eval run is recorded')
    expect(deployProblems(withRuns(real, runFor(real, { passed: false })))[0]).toBe('✖ evals  the last full run didn’t pass')
    const prompt = withFile(FINGERPRINT_FILES.prompt, (text) => `${text}\n// changed\n`)
    const lines = deployProblems(withRuns(prompt, runFor(real)))
    expect(lines[0]).toBe('✖ evals  the prompt or model changed since the last full run')
    expect(lines.join('\n')).toContain('Changed since the run: the prompt.')
    const model = withFile(FINGERPRINT_FILES.constants, (text) => text.replace('MAX_OUTPUT_TOKENS = 800', 'MAX_OUTPUT_TOKENS = 900'))
    expect(deployProblems(withRuns(model, runFor(real))).join('\n')).toContain('Changed since the run: the model.')
    expect(lines.at(-1)).toMatch(/^ {2}Fix: run the evals by hand with full set, then commit apps\/evals\/results\.json from the run’s artifact\.$/)
  })

  test('S5.2 FR-006 goes on when the full run passed with the code’s prompt and model, whatever changed in the judge, the checks or the cases', () => {
    const run = runFor(real)
    expect(deployProblems(withRuns(real, run))).toEqual([])
    for (const file of [FINGERPRINT_FILES.judge, FINGERPRINT_FILES.checks, FINGERPRINT_FILES.cases]) {
      expect(deployProblems(withRuns(withFile(file, (text) => `${text}\n// changed\n`), run)), file).toEqual([])
    }
  })

  test('S5.1 FR-006 a deploy whose full run didn’t pass prints why and runs no command', async () => {
    const calls: string[] = []
    const printed: string[] = []
    const code = await deploy([], {
      root: path.resolve('/repo'),
      run: (command, args) => {
        calls.push([command, ...args].join(' '))
        return { status: 0, stdout: '', stderr: '' }
      },
      fetchCorpus: async () => {
        throw new Error('the deploy took the corpus')
      },
      writeFile: () => {
        throw new Error('the deploy wrote a file')
      },
      print: (line) => void printed.push(line),
      readRepo: withRuns(real, runFor(real, { passed: false })),
    })
    expect(code).toBe(1)
    expect(calls).toEqual([])
    expect(printed[0]).toBe('✖ evals  the last full run didn’t pass')
    expect(printed.at(-1)).toMatch(/^ {2}Fix: run the evals by hand with full set/)
  })

  test('S5.1 FR-006 the deploy script checks the run before it builds or changes anything', () => {
    const script = real('scripts/chat-api/deploy.ts') ?? ''
    const body = script.slice(script.indexOf('export async function deploy('))
    const check = body.indexOf('deployProblems(')
    expect(check).toBeGreaterThan(-1)
    // Before it takes live's corpus, bundles, writes a file or calls gcloud.
    for (const step of ['fetchCorpus(', 'deps.bundle', 'deps.writeFile', "'gcloud'"]) {
      expect(body.indexOf(step), step).toBeGreaterThan(-1)
      expect(check, step).toBeLessThan(body.indexOf(step))
    }
  })
})
