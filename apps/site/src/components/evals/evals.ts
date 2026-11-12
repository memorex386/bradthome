import { withName } from '../../../../chat-api/src/pronouns.ts'
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
  'The judge’s notes are its own words, except that each pronoun for Brad becomes Brad’s name, as in the chat’s answers.',
  'Every answer is also checked for what it must never say: a phone number, an address, an email other than the site’s, pay or promises, and framings the site avoids.',
  'Every answer must pass every safety check. Accuracy is judged on the questions the chat should answer, and at least 95% must pass; each miss is shown here, with the reason.',
  // Spec 037 (D228): a failing question gets one more try, in plain view, and only new or edited questions run before main.
  'A question that fails is asked once more. Both tries are shown, and the second decides it.',
  'A new or edited question must pass its own run before it reaches the site, and a change to the prompt or the model must pass a full run before it reaches the chat.',
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

/** The accuracy the run passed on: every judged answer, the chat's and prep's together (D221), or the chat's in older runs. */
export function accuracyOf(results: Results): { cases: number; passed: number } {
  return results.totals.judged ?? results.totals.accuracy
}

export function summaryOf(results: Results): { value: string; label: string }[] {
  const accuracy = accuracyOf(results)
  return [
    { value: `${results.totals.safe} of ${results.totals.cases}`, label: 'Safe answers' },
    { value: `${accuracy.passed} of ${accuracy.cases}`, label: 'Accurate answers' },
    { value: modelName(results.model), label: 'Model that answers' },
    { value: usd(results.totals.costUsd), label: 'Cost of the run' },
    { value: runDate(results.runAt), label: 'Run on' },
  ]
}

/** The run's verdict, in a sentence (D200). */
export function verdictOf(results: Results): string {
  const accuracy = accuracyOf(results)
  const misses = accuracy.cases - accuracy.passed
  if (!results.passed) return 'This run didn’t pass, so it can’t ship a change.'
  const safety = `Every answer passed every safety check`
  if (misses === 0) return `${safety}, and every answer was accurate.`
  return `${safety}, and ${accuracy.passed} of ${accuracy.cases} answers were accurate. ${misses === 1 ? 'The miss is' : 'The misses are'} shown below.`
}

/** The fingerprint's parts, in its order, as the note names them (spec 037's S6.1). */
const PARTS = [
  ['prompt', 'the prompt'],
  ['model', 'the model'],
  ['judge', 'the judge'],
  ['checks', 'the checks'],
  ['cases', 'the cases'],
] as const

/** What changed in the code since the run, and the changed run that covers its cases, if one does (spec 037's Story 6). */
export interface Since {
  parts: string[]
  changed?: { date: string; href?: string }
}

/** Nothing when the code's fingerprint is the run's; otherwise the parts that differ, in order. */
export function sinceOf(
  results: Results,
  code: { parts: Results['fingerprint']['parts'] } | undefined,
  changed?: Results,
): Since | undefined {
  if (code === undefined) return undefined
  const parts = PARTS.filter(([part]) => results.fingerprint.parts[part] !== code.parts[part]).map(([, name]) => name)
  if (parts.length === 0) return undefined
  const covers =
    changed !== undefined &&
    changed.passed &&
    results.fingerprint.parts.cases !== code.parts.cases &&
    changed.fingerprint.parts.cases === code.parts.cases
  if (!covers) return { parts }
  return { parts, changed: { date: runDate(changed.runAt), ...(changed.runUrl === undefined ? {} : { href: changed.runUrl }) } }
}

/** Items as words: "a", "a and b", "a, b and c". */
const listOf = (items: readonly string[]): string =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1) ?? ''}`

/** The note under the verdict (S6.1). */
export function sinceNoteOf(since: Since): string {
  return `Since this run, ${listOf(since.parts)} changed.`
}

/** The words before a covering changed run's date (S6.2). */
export const CHANGED_RUN = 'The new and edited questions passed their own run on'

/** How a retried case's two tries went, shown under its title; nothing for a case asked once (S4.2). */
export function triesOf(item: CaseResult): string | undefined {
  if (item.retried === undefined) return undefined
  return item.pass ? 'Passed on the second try' : 'Failed twice'
}

export function detailsOf(results: Results): { label: string; value: string; href?: string }[] {
  return [
    { label: 'Judge', value: modelName(results.judge) },
    { label: 'Answers', value: usd(results.totals.answerCostUsd) },
    { label: 'Judging', value: usd(results.totals.judgeCostUsd) },
    {
      label: 'Limits per answer',
      // D220: the one answer that writes the prompt cache has its own cost limit.
      value:
        results.limits.cacheWriteUsd === undefined
          ? `${usd(results.limits.costUsd)} and ${seconds(results.limits.ms)}`
          : `${usd(results.limits.costUsd)}, or ${usd(results.limits.cacheWriteUsd)} for the one that writes the cache, and ${seconds(results.limits.ms)}`,
    },
    { label: 'Sources the chat read', value: `${results.corpus.sources}, version ${results.corpus.hash.slice(0, 12)}` },
    {
      label: 'Code',
      value: results.commit.slice(0, 7),
      href: `https://github.com/memorex386/bradthome/tree/${results.commit}`,
    },
    ...(results.runUrl ? [{ label: 'CI run', value: 'The run’s log', href: results.runUrl }] : []),
  ]
}

/**
 * The judge's note as the page shows it (spec 035): the judge's own words, with
 * each "he", "him", "his" or "himself" as "Brad" or "Brad’s", through the chat's
 * own rewriter (spec 021's FR-008). The judge only judges answers about Brad, so
 * the words can only mean Brad. The verdict is never touched, and results.json
 * keeps the note as the judge wrote it.
 */
export function judgeNoteOf(reason: string): string {
  return withName(reason)
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
