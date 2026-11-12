import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { FINGERPRINT_FILES, fingerprintOf } from '../../../scripts/lib/fingerprint.ts'
import { evalsProblems, RESULTS_FILE } from '../../../scripts/lib/evals.ts'

// Spec 023, Story 3: a prompt or model change needs a fresh run (D194). The
// fingerprint reads files' text, so CI and the pre-push hook can check any
// commit, not only the working tree.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const real = (file: string): string | undefined => {
  try {
    return readFileSync(path.join(ROOT, file), 'utf8')
  } catch {
    return undefined
  }
}

/** The repo's files, with one replaced. */
const withFile = (file: string, change: (text: string) => string) => (name: string) => {
  const text = real(name)
  return name === file && text !== undefined ? change(text) : text
}

/** A passing results file whose fingerprint matches `read`. */
function resultsFor(read: (file: string) => string | undefined, over: Record<string, unknown> = {}): string {
  const base = JSON.parse(real(RESULTS_FILE) ?? '{}') as Record<string, unknown>
  return JSON.stringify({ ...base, fingerprint: fingerprintOf(read), passed: true, ...over })
}

const withResults = (read: (file: string) => string | undefined, results: string) => (file: string) =>
  file === RESULTS_FILE ? results : read(file)

describe('the fingerprint', () => {
  test('FR-007 hashes the prompt, the model settings, the judge, the checks and the cases, with line endings normalized', () => {
    expect(Object.values(FINGERPRINT_FILES).sort()).toEqual(
      [
        'apps/chat-api/src/constants.ts',
        'apps/chat-api/src/prompt.ts',
        'apps/chat-api/src/pronouns.ts',
        'apps/evals/src/cases.ts',
        'apps/evals/src/checks.ts',
        'apps/evals/src/judge.ts',
        'apps/evals/src/run.eval.ts',
        'apps/evals/src/run.ts',
        // Interview prep's prompt, shapes, checks and cases (spec 024's S7.6).
        'apps/chat-api/src/prep.ts',
        'apps/chat-api/src/prep-shape.ts',
        'apps/evals/src/prep-checks.ts',
        'apps/evals/src/prep-cases.ts',
      ].sort(),
    )
    const lf = fingerprintOf(real)
    const crlf = fingerprintOf((file) => real(file)?.replaceAll('\n', '\r\n'))
    expect(lf?.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(crlf).toEqual(lf)
  })

  test('S3.2 a commit with no chat API has no fingerprint, so there is nothing to check', () => {
    expect(fingerprintOf(() => undefined)).toBeUndefined()
  })
})

describe('the check', () => {
  const current = (read: (file: string) => string | undefined) => withResults(read, resultsFor(real))

  // Amended by spec 037 (D228): a prompt or model change no longer holds main back. The chat API's deploy waits for a
  // full run that passed with it instead, which tests/037 checks.
  test('S3.1 FR-008 passes when the system prompt, a fixed reply or the layout in prompt.ts changes, since the deploy checks it (spec 037)', () => {
    const read = current(withFile(FINGERPRINT_FILES.prompt, (text) => text.replace('Keep answers short', 'Keep answers brief')))
    expect(fingerprintOf(read)?.parts.prompt).not.toBe(fingerprintOf(real)?.parts.prompt)
    expect(evalsProblems(read)).toEqual([])
    // The pronoun rewriter counts as the prompt (D200).
    expect(evalsProblems(current(withFile(FINGERPRINT_FILES.pronouns, (text) => `${text}\n// changed\n`)))).toEqual([])
  })

  test('S3.1 FR-008 passes when the model, its thinking, effort or output limit changes, since the deploy checks it (spec 037)', () => {
    const swaps: [string, string][] = [
      ["MODEL = 'claude-haiku-5-5'", "MODEL = 'claude-sonnet-5-5'"],
      ["{ type: 'disabled' } as const", "{ type: 'enabled' } as const"],
      ["EFFORT = 'low'", "EFFORT = 'high'"],
      ['MAX_OUTPUT_TOKENS = 800', 'MAX_OUTPUT_TOKENS = 900'],
    ]
    for (const [from, to] of swaps) {
      expect(real(FINGERPRINT_FILES.constants)).toContain(from)
      const read = current(withFile(FINGERPRINT_FILES.constants, (text) => text.replace(from, to)))
      expect(fingerprintOf(read)?.parts.model, to).not.toBe(fingerprintOf(real)?.parts.model)
      expect(evalsProblems(read), to).toEqual([])
    }
  })

  // Amended by spec 037 (D228): only a case change needs a run before main, and only of the changed cases.
  test('S3.1 FR-008 passes when the judge or the checks change, and fails when a case changes with no changed run (spec 037)', () => {
    for (const file of [FINGERPRINT_FILES.judge, FINGERPRINT_FILES.checks]) {
      expect(evalsProblems(current(withFile(file, (text) => `${text}\n// changed\n`))), file).toEqual([])
    }
    const lines = evalsProblems(current(withFile(FINGERPRINT_FILES.cases, (text) => `${text}\n// changed\n`)))
    expect(lines[0]).toBe('✖ evals  the cases changed since the last full run')
    expect(lines.at(-1)).toMatch(/^ {2}Fix: push this commit to a branch named evals\/…/)
  })

  test('S3.2 passes when a limit, the log or a source’s words change', () => {
    expect(evalsProblems(current(real))).toEqual([])
    expect(
      evalsProblems(
        current(withFile(FINGERPRINT_FILES.constants, (text) => text.replace('QUESTIONS_PER_DAY = 20', 'QUESTIONS_PER_DAY = 25'))),
      ),
    ).toEqual([])
    expect(evalsProblems(current(withFile('apps/site/content/claims.yaml', (text) => `${text}\n`)))).toEqual([])
  })

  // Amended by spec 037 (D228): a full run that failed doesn't hold main back, since main needs only its cases checked;
  // the deploy needs it to pass, which tests/037 checks. A missing or malformed record still fails.
  test('S3.4 FR-008 fails when results.json is missing or malformed, and lets a failed full run through to main (spec 037)', () => {
    expect(evalsProblems(withResults(real, resultsFor(real, { passed: false })))).toEqual([])
    expect(evalsProblems((file) => (file === RESULTS_FILE ? undefined : real(file)))[0]).toBe('✖ evals  no eval run is recorded')
    expect(evalsProblems(withResults(real, '{"version":1}'))[0]).toBe("✖ evals  apps/evals/results.json isn't a run's results")
  })

  test('S3.4 the repo’s own results.json passes and matches the code', () => {
    expect(evalsProblems(real)).toEqual([])
  })
})
