import { createHash } from 'node:crypto'

// The fingerprint of what decides an answer (spec 023's FR-007, D194). It's
// built from files' text, so CI and the pre-push hook can check any commit:
// prompt.ts whole, the model's settings from constants.ts (not its limits),
// and the judge, the checks and the cases. A run records it, and a commit
// whose fingerprint differs needs a fresh run.

export const FINGERPRINT_FILES = {
  prompt: 'apps/chat-api/src/prompt.ts',
  constants: 'apps/chat-api/src/constants.ts',
  judge: 'apps/evals/src/judge.ts',
  checks: 'apps/evals/src/checks.ts',
  cases: 'apps/evals/src/cases.ts',
} as const

/** The settings in constants.ts that change an answer. */
export const MODEL_SETTINGS = ['MODEL', 'THINKING', 'EFFORT', 'MAX_OUTPUT_TOKENS'] as const

export interface Fingerprint {
  hash: string
  parts: { prompt: string; model: string; judge: string; checks: string; cases: string }
}

/** What each part is called in the check's message. */
export const PART_NAMES: Readonly<Record<keyof Fingerprint['parts'], string>> = {
  prompt: 'the prompt',
  model: 'the model',
  judge: 'the judge',
  checks: 'the checks',
  cases: 'the cases',
}

const sha = (text: string) => createHash('sha256').update(text).digest('hex')
const lf = (text: string) => text.replaceAll('\r\n', '\n')

/** The model's settings, one line each, from constants.ts's text. */
export function modelSettings(constants: string): string {
  return MODEL_SETTINGS.map((name) => {
    const line = new RegExp(`^export const ${name} = .+$`, 'm').exec(lf(constants))?.[0]
    if (line === undefined) throw new Error(`constants.ts has no ${name}, so the fingerprint can't be taken.`)
    return line.trim()
  }).join('\n')
}

/** The fingerprint of the files `read` gives, or undefined for a commit with no chat API. */
export function fingerprintOf(read: (file: string) => string | undefined): Fingerprint | undefined {
  const text = (file: string) => {
    const value = read(file)
    return value === undefined ? undefined : lf(value)
  }
  const prompt = text(FINGERPRINT_FILES.prompt)
  const constants = text(FINGERPRINT_FILES.constants)
  if (prompt === undefined || constants === undefined) return undefined
  const parts = {
    prompt: sha(prompt),
    model: sha(modelSettings(constants)),
    judge: sha(text(FINGERPRINT_FILES.judge) ?? ''),
    checks: sha(text(FINGERPRINT_FILES.checks) ?? ''),
    cases: sha(text(FINGERPRINT_FILES.cases) ?? ''),
  }
  return { hash: sha(JSON.stringify(parts)), parts }
}

/** The parts that differ between a run's fingerprint and the code's. */
export function changedParts(run: Fingerprint, code: Fingerprint): (keyof Fingerprint['parts'])[] {
  return (Object.keys(code.parts) as (keyof Fingerprint['parts'])[]).filter((part) => run.parts[part] !== code.parts[part])
}
