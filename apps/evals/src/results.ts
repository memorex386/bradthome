// The shape of results.json (spec 023's FR-006): one eval run, as the runner
// writes it, the CI check reads it and /evals shows it. It holds only what the
// page may show: the cases' own words, the answers and numbers, never a key,
// a header or a provider's error text. The site's build reads this file, so it
// imports nothing, not even zod: the site resolves only its own packages
// (spec 003's scratch-site checks), as with the chat API's constants.

export interface Check {
  /** A short name, such as "cites a right source" or "costs $0.005 or less". */
  name: string
  /** A safety check must pass on every case; accuracy may miss within the run's allowance (D200). */
  kind: 'safety' | 'accuracy'
  pass: boolean
  /** What was found, in a few words. */
  detail: string
}

export interface CaseResult {
  id: string
  suite: 'facts' | 'never' | 'injection' | 'limits' | 'prep-fit' | 'prep-injection'
  title: string
  turns: { role: 'user' | 'assistant'; text: string }[]
  question: string
  answer: string
  state: 'answered' | 'no-source' | 'boundary' | 'failed' | 'no-fit' | 'not-a-posting'
  sources: { id: string; label: string; url: string }[]
  checks: Check[]
  judge?: { verdict: 'supported' | 'unsupported' | 'unreadable'; reason: string }
  tokens: { input: number; cacheRead: number; cacheWrite: number; output: number }
  /** The answer's own cost, which the limit applies to. */
  costUsd: number
  /** The judge's cost for this case, counted in the run's total only. */
  judgeCostUsd: number
  ms: number
  /** Every safety check passed. */
  safe: boolean
  /** Whether its accuracy checks passed, or null when it has none. */
  accurate: boolean | null
  /** Every check passed. */
  pass: boolean
}

export interface Results {
  version: 1
  /** When the run finished, as an ISO time. */
  runAt: string
  /** The commit the run checked out. */
  commit: string
  /** The CI run's page, when it ran in GitHub Actions. */
  runUrl?: string
  model: string
  judge: string
  fingerprint: { hash: string; parts: { prompt: string; model: string; judge: string; checks: string; cases: string } }
  corpus: { hash: string; sources: number }
  limits: { costUsd: number; ms: number }
  /** Interview prep's own limits (spec 024). */
  prepLimits?: { costUsd: number; ms: number }
  totals: {
    cases: number
    passed: number
    safe: number
    accuracy: { cases: number; passed: number; allowedMisses: number }
    /** Prep's accuracy, with its own allowance (spec 024's S7.4). */
    prepAccuracy?: { cases: number; passed: number; allowedMisses: number }
    /** What prep's answers cost, within answerCostUsd. */
    prepCostUsd?: number
    answerCostUsd: number
    judgeCostUsd: number
    costUsd: number
    ms: number
  }
  suites: { id: string; title: string; about: string; cases: number; passed: number }[]
  cases: CaseResult[]
  passed: boolean
}

type Rule = (value: unknown, at: string) => void

const fail = (at: string, what: string): never => {
  throw new Error(`results.json: ${at} ${what}`)
}
const str: Rule = (value, at) => {
  if (typeof value !== 'string') fail(at, 'is not text')
}
const bool: Rule = (value, at) => {
  if (typeof value !== 'boolean') fail(at, 'is not true or false')
}
const count: Rule = (value, at) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) fail(at, 'is not a count')
}
const amount: Rule = (value, at) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(at, 'is not a number of zero or more')
}
const matching =
  (pattern: RegExp, what: string): Rule =>
  (value, at) => {
    if (typeof value !== 'string' || !pattern.test(value)) fail(at, `is not ${what}`)
  }
const oneOf =
  (...allowed: readonly unknown[]): Rule =>
  (value, at) => {
    if (!allowed.includes(value)) fail(at, `is not one of ${allowed.join(', ')}`)
  }
const nullable =
  (rule: Rule): Rule =>
  (value, at) => {
    if (value !== null) rule(value, at)
  }
const list =
  (rule: Rule, min = 0): Rule =>
  (value, at) => {
    if (!Array.isArray(value)) return fail(at, 'is not a list')
    if (value.length < min) fail(at, `has fewer than ${min}`)
    value.forEach((item, index) => rule(item, `${at}[${index}]`))
  }
/** An object with exactly these keys; a key whose name ends in ? may be missing. */
const shape =
  (fields: Record<string, Rule>): Rule =>
  (value, at) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return fail(at, 'is not an object')
    const record = value as Record<string, unknown>
    const names = new Set(Object.keys(fields).map((key) => key.replace(/\?$/, '')))
    for (const key of Object.keys(record)) if (!names.has(key)) fail(`${at}.${key}`, 'is not expected')
    for (const [key, rule] of Object.entries(fields)) {
      const name = key.replace(/\?$/, '')
      if (key.endsWith('?') && record[name] === undefined) continue
      if (!(name in record)) fail(`${at}.${name}`, 'is missing')
      rule(record[name], `${at}.${name}`)
    }
  }

const HEX64 = matching(/^[0-9a-f]{64}$/, 'a SHA-256')

const caseRule = shape({
  id: str,
  suite: oneOf('facts', 'never', 'injection', 'limits', 'prep-fit', 'prep-injection'),
  title: str,
  turns: list(shape({ role: oneOf('user', 'assistant'), text: str })),
  question: str,
  answer: str,
  state: oneOf('answered', 'no-source', 'boundary', 'failed', 'no-fit', 'not-a-posting'),
  sources: list(shape({ id: str, label: str, url: str })),
  checks: list(shape({ name: matching(/./, 'a name'), kind: oneOf('safety', 'accuracy'), pass: bool, detail: str }), 1),
  'judge?': shape({ verdict: oneOf('supported', 'unsupported', 'unreadable'), reason: str }),
  tokens: shape({ input: count, cacheRead: count, cacheWrite: count, output: count }),
  costUsd: amount,
  judgeCostUsd: amount,
  ms: amount,
  safe: bool,
  accurate: nullable(bool),
  pass: bool,
})

const resultsRule = shape({
  version: oneOf(1),
  runAt: matching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, 'an ISO time'),
  commit: matching(/^[0-9a-f]{40}$/, 'a commit'),
  'runUrl?': matching(/^https:\/\/\S+$/, 'an https address'),
  model: str,
  judge: str,
  fingerprint: shape({ hash: HEX64, parts: shape({ prompt: str, model: str, judge: str, checks: str, cases: str }) }),
  corpus: shape({ hash: HEX64, sources: count }),
  limits: shape({ costUsd: amount, ms: amount }),
  'prepLimits?': shape({ costUsd: amount, ms: amount }),
  totals: shape({
    cases: count,
    passed: count,
    safe: count,
    accuracy: shape({ cases: count, passed: count, allowedMisses: count }),
    'prepAccuracy?': shape({ cases: count, passed: count, allowedMisses: count }),
    'prepCostUsd?': amount,
    answerCostUsd: amount,
    judgeCostUsd: amount,
    costUsd: amount,
    ms: amount,
  }),
  suites: list(shape({ id: str, title: str, about: str, cases: count, passed: count })),
  cases: list(caseRule, 1),
  passed: bool,
})

/** results.json, checked, or a throw naming what's wrong (FR-009). */
export function parseResults(input: unknown): Results {
  resultsRule(input, 'run')
  return input as Results
}
