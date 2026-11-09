import { z } from 'zod'

// The shape of results.json (spec 023's FR-006): one eval run, as the runner
// writes it, the CI check reads it and /evals shows it. It holds only what the
// page may show: the cases' own words, the answers and numbers, never a key,
// a header or a provider's error text.

const check = z.strictObject({
  /** A short name, such as "cites a source" or "under $0.005". */
  name: z.string().min(1),
  pass: z.boolean(),
  /** What was found, in a few words. */
  detail: z.string(),
})

const source = z.strictObject({ id: z.string(), label: z.string(), url: z.string() })

const caseResult = z.strictObject({
  id: z.string(),
  suite: z.enum(['facts', 'never', 'injection', 'limits']),
  title: z.string(),
  turns: z.array(z.strictObject({ role: z.enum(['user', 'assistant']), text: z.string() })),
  question: z.string(),
  answer: z.string(),
  state: z.enum(['answered', 'no-source', 'boundary', 'failed']),
  sources: z.array(source),
  checks: z.array(check).min(1),
  judge: z.strictObject({ verdict: z.enum(['supported', 'unsupported', 'unreadable']), reason: z.string() }).optional(),
  tokens: z.strictObject({
    input: z.number().int().nonnegative(),
    cacheRead: z.number().int().nonnegative(),
    cacheWrite: z.number().int().nonnegative(),
    output: z.number().int().nonnegative(),
  }),
  /** The answer's own cost, which the limit applies to. */
  costUsd: z.number().nonnegative(),
  /** The judge's cost for this case, counted in the run's total only. */
  judgeCostUsd: z.number().nonnegative(),
  ms: z.number().nonnegative(),
  pass: z.boolean(),
})

export const resultsSchema = z.strictObject({
  version: z.literal(1),
  /** When the run finished, as an ISO time. */
  runAt: z.iso.datetime(),
  /** The commit the run checked out. */
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  /** The CI run's page, when it ran in GitHub Actions. */
  runUrl: z.url({ protocol: /^https$/ }).optional(),
  model: z.string(),
  judge: z.string(),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  corpus: z.strictObject({ hash: z.string().regex(/^[0-9a-f]{64}$/), sources: z.number().int().positive() }),
  limits: z.strictObject({ costUsd: z.number().positive(), ms: z.number().positive() }),
  totals: z.strictObject({
    cases: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    answerCostUsd: z.number().nonnegative(),
    judgeCostUsd: z.number().nonnegative(),
    costUsd: z.number().nonnegative(),
    ms: z.number().nonnegative(),
  }),
  suites: z.array(z.strictObject({ id: z.string(), title: z.string(), about: z.string(), cases: z.number().int(), passed: z.number().int() })),
  cases: z.array(caseResult).min(1),
  passed: z.boolean(),
})

export type Results = z.infer<typeof resultsSchema>
export type CaseResult = Results['cases'][number]
export type Check = CaseResult['checks'][number]

/** results.json, parsed, or a throw naming what's wrong. */
export function parseResults(input: unknown): Results {
  return resultsSchema.parse(input)
}
