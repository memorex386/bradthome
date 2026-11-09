import { changedParts, fingerprintOf, PART_NAMES } from '../../apps/evals/src/fingerprint.ts'
import { parseResults, type Results } from '../../apps/evals/src/results.ts'

// The fresh-run check (spec 023's Story 3, D194), shared by ci / evals and the
// pre-push hook. It reads files through `read`, so the hook can check the
// commit being pushed, not the working tree. Its lines end with the fix.

export const RESULTS_FILE = 'apps/evals/results.json'

const FIX_LINE = '  Fix: push this commit to a branch named evals/… to run the evals in CI (D193), then commit apps/evals/results.json from the run’s artifact.'

/** Nothing when the last run passed and matches the code; otherwise the problem's lines. */
export function evalsProblems(read: (file: string) => string | undefined): string[] {
  const code = fingerprintOf(read)
  if (code === undefined) return []
  const text = read(RESULTS_FILE)
  if (text === undefined) return ['✖ evals  no eval run is recorded', `  ${RESULTS_FILE} is missing.`, FIX_LINE]
  let results: Results
  try {
    results = parseResults(JSON.parse(text) as unknown)
  } catch {
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
