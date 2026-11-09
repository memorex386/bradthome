import type { CaseResult, Results } from '../../../../evals/src/results.ts'

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
  'Every case must pass. A change to the prompt, the model or the cases can’t reach the site without a fresh run.',
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
    { value: `${results.totals.passed} of ${results.totals.cases}`, label: 'Cases passed' },
    { value: modelName(results.model), label: 'Model that answers' },
    { value: usd(results.totals.costUsd), label: 'Cost of the run' },
    { value: runDate(results.runAt), label: 'Run on' },
  ]
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
}

export function stateLabel(state: CaseResult['state']): string {
  return STATES[state]
}

/** The cases of one suite, failed ones first, so a failure is never buried. */
export function casesOf(results: Results, suite: string): CaseResult[] {
  const cases = results.cases.filter((item) => item.suite === suite)
  return [...cases.filter((item) => !item.pass), ...cases.filter((item) => item.pass)]
}
