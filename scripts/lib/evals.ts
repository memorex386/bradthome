import { type Fingerprint, fingerprintOf, PART_NAMES } from './fingerprint.ts'

// The evals' checks, shared by ci's hygiene job, the pre-push hook and the
// chat API's deploy. They read files through `read`, so the hook can check the
// commit being pushed, not the working tree. Like every hook library, this one
// uses only Node's built-ins (spec 001's FR-029), so it reads only the parts of
// a run's record it needs; the site's build parses the whole file with
// apps/evals/src/results.ts. Each failure's lines end with the fix.
//
// Since spec 037 (D228), main needs only the cases to be checked: the last full
// run's cases fingerprint, or a passing changed run's, must match the code's.
// A prompt, model, judge or check change doesn't hold main back. The chat API's
// deploy needs the last full run to have passed with the code's prompt and model.

export const RESULTS_FILE = 'apps/evals/results.json'
export const CHANGED_FILE = 'apps/evals/changed.json'

const FIX_FULL = '  Fix: run the evals by hand with full set, then commit apps/evals/results.json from the run’s artifact.'
const FIX_CHANGED = '  Fix: push this commit to a branch named evals/…, then commit apps/evals/changed.json from the run’s artifact.'
const SCHEMA = '  It doesn’t match the schema in apps/evals/src/results.ts.'

interface Recorded {
  fingerprint: Fingerprint
  passed: boolean
  totals: { cases: number; passed: number }
}

const HEX64 = /^[0-9a-f]{64}$/

/** The parts of a run the checks read, or undefined when they aren't there. */
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

/** A run's record, or why it can't be read. */
function readRun(read: (file: string) => string | undefined, file: string): Recorded | 'missing' | 'unreadable' {
  const text = read(file)
  if (text === undefined) return 'missing'
  try {
    return recordedOf(JSON.parse(text) as unknown) ?? 'unreadable'
  } catch {
    return 'unreadable'
  }
}

/** Nothing when every case is checked by a run that passed it; otherwise the problem's lines (D228). */
export function evalsProblems(read: (file: string) => string | undefined): string[] {
  const code = fingerprintOf(read)
  if (code === undefined) return []
  const full = readRun(read, RESULTS_FILE)
  if (full === 'missing') return ['✖ evals  no eval run is recorded', `  ${RESULTS_FILE} is missing.`, FIX_FULL]
  if (full === 'unreadable') return [`✖ evals  ${RESULTS_FILE} isn't a run's results`, SCHEMA, FIX_FULL]
  if (full.fingerprint.parts.cases === code.parts.cases) return []
  const changed = readRun(read, CHANGED_FILE)
  if (changed === 'unreadable') return [`✖ evals  ${CHANGED_FILE} isn't a run's results`, SCHEMA, FIX_CHANGED]
  if (changed === 'missing' || changed.fingerprint.parts.cases !== code.parts.cases) {
    return [
      '✖ evals  the cases changed since the last full run',
      '  A new or edited case must pass a changed run before it reaches main (D228).',
      FIX_CHANGED,
    ]
  }
  if (!changed.passed) {
    return [
      '✖ evals  the changed run failed',
      `  ${changed.totals.passed} of ${changed.totals.cases} cases passed. Every case a changed run asks must pass (D228).`,
      '  Fix: make the failing cases pass, then push to evals/… again and commit apps/evals/changed.json from the run’s artifact.',
    ]
  }
  return []
}

export function evalsPass(file: string): string {
  return `✓ evals  the cases match the last full run's in ${file}, or a passing changed run's`
}

/** Nothing when the last full run passed with the code's prompt and model; otherwise why the deploy stops (D228). */
export function deployProblems(read: (file: string) => string | undefined): string[] {
  const code = fingerprintOf(read)
  if (code === undefined)
    return ['✖ evals  the chat API’s prompt is missing, so no run can be checked', '  Fix: deploy from the repo’s root.']
  const full = readRun(read, RESULTS_FILE)
  if (full === 'missing') return ['✖ evals  no full eval run is recorded', `  ${RESULTS_FILE} is missing.`, FIX_FULL]
  if (full === 'unreadable') return [`✖ evals  ${RESULTS_FILE} isn't a run's results`, SCHEMA, FIX_FULL]
  if (!full.passed) {
    return ['✖ evals  the last full run didn’t pass', `  ${full.totals.passed} of ${full.totals.cases} cases passed.`, FIX_FULL]
  }
  const changed = (['prompt', 'model'] as const).filter((part) => full.fingerprint.parts[part] !== code.parts[part])
  if (changed.length > 0) {
    return [
      '✖ evals  the prompt or model changed since the last full run',
      `  Changed since the run: ${changed.map((part) => PART_NAMES[part]).join(' and ')}.`,
      '  A prompt or model change reaches the chat only after a full run passes with it (D228).',
      FIX_FULL,
    ]
  }
  return []
}
