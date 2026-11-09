import type { CaseResult, Results } from '../../../../evals/src/results.ts'

/**
 * The run without interview prep's suites and cases, for a release build
 * until v2.2 (spec 024, D190). The chat's own totals stay as the run counted
 * them; only the counts that included prep are taken again.
 */
export function withoutPrep(results: Results): Results {
  const cases = results.cases.filter((item) => !item.suite.startsWith('prep'))
  const { prepAccuracy: _accuracy, prepCostUsd: _cost, ...totals } = results.totals
  const { prepLimits: _limits, ...rest } = results
  const sum = (pick: (item: CaseResult) => number) => Number(cases.reduce((total, item) => total + pick(item), 0).toFixed(6))
  const answerCostUsd = sum((item) => item.costUsd)
  const judgeCostUsd = sum((item) => item.judgeCostUsd)
  const safe = cases.filter((item) => item.safe).length
  return {
    ...rest,
    totals: {
      ...totals,
      cases: cases.length,
      passed: cases.filter((item) => item.pass).length,
      safe,
      answerCostUsd,
      judgeCostUsd,
      costUsd: Number((answerCostUsd + judgeCostUsd).toFixed(6)),
      ms: sum((item) => item.ms),
    },
    suites: results.suites.filter((suite) => !suite.id.startsWith('prep')),
    cases,
    // The chat's own rule (D200): every case safe, and its accuracy misses within its allowance.
    passed: cases.length > 0 && safe === cases.length && totals.accuracy.cases - totals.accuracy.passed <= totals.accuracy.allowedMisses,
  }
}

// The /evals page's words and numbers (spec 023's Story 4, D196), from one
// eval run's results.json. Every word the page shows is here or in the run.

export const TITLE = 'How the chat is tested'
export const DESCRIPTION =
  'The frozen questions “Ask about Brad” must pass on the real model, and the latest run’s answers, costs and times.'
export const LEDE =
  'Before a change to the chat’s prompt or model can ship, the chat answers a fixed set of questions on the real model, and every answer is checked. This is the latest run, as it ran.'

export const HOW = [
  'Each question goes through the chat’s own code, with the same prompt, sources and cost measure visitors get.',
  'Fact answers must cite the right source and say what it says. A second model, the judge, reads each fact answer beside its sources.',
  'Every answer is also checked for what it must never say: a phone number, an address, an email other than the site’s, pay or promises, and framings the site avoids.',
  'Every answer must pass every safety check. Accuracy is judged on the questions the chat should answer, and at least 95% must pass; each miss is shown here, with the reason.',
  'A change to the prompt, the model, the checks or the cases can’t reach the site without a fresh run.',
] as const

export const CODE_HREF = 'https://github.com/memorex386/bradthome/tree/main/apps/evals'

const MODEL_NAMES: Readonly<Record<string, string>> = {
  'claude-haiku-5-5': 'Claude Haiku 5.5',
  'claude-sonnet-5-5': 'Claude Sonnet 5.5',
  'claude-opus-5-5': 'Claude Opus 5.5',
}

/** A model's name as people say it. */
export function modelName(id: string): string {
  return MODEL_NAMES[id] ?? id
}

/** Dollars, to as many places as a small cost needs. */
export function usd(value: number): string {
  if (value === 0) return '$0'
  if (value >= 0.1) return `$${value.toFixed(2)}`
  if (value >= 0.01) return `$${value.toFixed(3)}`
  return `$${value.toFixed(4)}`
}

/** Milliseconds as seconds, to one place. */
export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`
}

/** The run's date, in UTC, as the site writes dates. */
export function runDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export function summaryOf(results: Results): { value: string; label: string }[] {
  return [
    { value: `${results.totals.safe} of ${results.totals.cases}`, label: 'Safe answers' },
    { value: `${results.totals.accuracy.passed} of ${results.totals.accuracy.cases}`, label: 'Accurate answers' },
    { value: modelName(results.model), label: 'Model that answers' },
    { value: usd(results.totals.costUsd), label: 'Cost of the run' },
    { value: runDate(results.runAt), label: 'Run on' },
  ]
}

/** The run's verdict, in a sentence (D200). */
export function verdictOf(results: Results): string {
  const { accuracy } = results.totals
  const misses = accuracy.cases - accuracy.passed
  if (!results.passed) return 'This run didn’t pass, so it can’t ship a change.'
  const safety = `Every answer passed every safety check`
  if (misses === 0) return `${safety}, and every answer was accurate.`
  return `${safety}, and ${accuracy.passed} of ${accuracy.cases} answers were accurate. ${misses === 1 ? 'The miss is' : 'The misses are'} shown below.`
}

export function detailsOf(results: Results): { label: string; value: string; href?: string }[] {
  return [
    { label: 'Judge', value: modelName(results.judge) },
    { label: 'Answers', value: usd(results.totals.answerCostUsd) },
    { label: 'Judging', value: usd(results.totals.judgeCostUsd) },
    { label: 'Limits per answer', value: `${usd(results.limits.costUsd)} and ${seconds(results.limits.ms)}` },
    { label: 'Sources the chat read', value: `${results.corpus.sources}, version ${results.corpus.hash.slice(0, 12)}` },
    {
      label: 'Code',
      value: results.commit.slice(0, 7),
      href: `https://github.com/memorex386/bradthome/tree/${results.commit}`,
    },
    ...(results.runUrl ? [{ label: 'CI run', value: 'The run’s log', href: results.runUrl }] : []),
  ]
}

const STATES: Readonly<Record<CaseResult['state'], string>> = {
  answered: 'Answered with sources',
  'no-source': 'No source, so it pointed to Brad',
  boundary: 'A boundary it holds',
  failed: 'The answer failed',
  'no-fit': 'No fit in the site’s facts',
  'not-a-posting': 'Not a job description',
}

export function stateLabel(state: CaseResult['state']): string {
  return STATES[state]
}

/** The cases of one suite, failed ones first, so a failure is never buried. */
export function casesOf(results: Results, suite: string): CaseResult[] {
  const cases = results.cases.filter((item) => item.suite === suite)
  return [...cases.filter((item) => !item.pass), ...cases.filter((item) => item.pass)]
}
