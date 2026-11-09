import { changedParts, type Fingerprint, fingerprintOf, PART_NAMES } from './fingerprint.ts'

// The fresh-run check (spec 023's Story 3, D194), shared by ci's hygiene job
// and the pre-push hook. It reads files through `read`, so the hook can check
// the commit being pushed, not the working tree. Like every hook library, it
// uses only Node's built-ins (spec 001's FR-029), so it reads only the parts
// of results.json it needs; the site's build parses the whole file with
// apps/evals/src/results.ts. Its lines end with the fix.

export const RESULTS_FILE = 'apps/evals/results.json'

const FIX_LINE =
  '  Fix: push this commit to a branch named evals/… to run the evals in CI (D193), then commit apps/evals/results.json from the run’s artifact.'

interface Recorded {
  fingerprint: Fingerprint
  passed: boolean
  totals: { cases: number; passed: number }
}

const HEX64 = /^[0-9a-f]{64}$/

/** The parts of a run the check reads, or undefined when they aren't there. */
function recordedOf(input: unknown): Recorded | undefined {
  const run = input as Partial<Recorded> | null
  if (run === null || typeof run !== 'object' || (run as { version?: unknown }).version !== 1) return undefined
  const { fingerprint, passed, totals } = run
  if (typeof passed !== 'boolean' || typeof totals?.cases !== 'number' || typeof totals.passed !== 'number') return undefined
  if (typeof fingerprint?.hash !== 'string' || !HEX64.test(fingerprint.hash) || typeof fingerprint.parts !== 'object') return undefined
  for (const part of Object.keys(PART_NAMES)) {
    if (typeof (fingerprint.parts as Record<string, unknown>)[part] !== 'string') return undefined
  }
  return { fingerprint, passed, totals }
}

/** Nothing when the last run passed and matches the code; otherwise the problem's lines. */
export function evalsProblems(read: (file: string) => string | undefined): string[] {
  const code = fingerprintOf(read)
  if (code === undefined) return []
  const text = read(RESULTS_FILE)
  if (text === undefined) return ['✖ evals  no eval run is recorded', `  ${RESULTS_FILE} is missing.`, FIX_LINE]
  let results: Recorded | undefined
  try {
    results = recordedOf(JSON.parse(text) as unknown)
  } catch {
    results = undefined
  }
  if (results === undefined) {
    return [`✖ evals  ${RESULTS_FILE} isn't a run's results`, '  It doesn’t match the schema in apps/evals/src/results.ts.', FIX_LINE]
  }
  const changed = changedParts(results.fingerprint, code)
  if (changed.length > 0 || results.fingerprint.hash !== code.hash) {
    return [
      '✖ evals  the last eval run is out of date',
      `  Changed since the run: ${changed.map((part) => PART_NAMES[part]).join(', ') || 'the fingerprint'}.`,
      '  A prompt, model, judge, check or case change needs a fresh run before it reaches main (D194).',
      FIX_LINE,
    ]
  }
  if (!results.passed) {
    return [
      '✖ evals  the last eval run failed',
      `  ${results.totals.passed} of ${results.totals.cases} cases passed. Every case must pass (D197).`,
      '  Fix: make the failing cases pass, then run the evals again.',
    ]
  }
  return []
}

export function evalsPass(results: string): string {
  return `✓ evals  the last run passed and matches the prompt, model, judge, checks and cases · ${results}`
}
