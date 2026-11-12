import { createHash } from 'node:crypto'
import type { Corpus } from '../../chat-api/src/corpus.ts'
import { contextOf } from '../../chat-api/src/prompt.ts'
import type { Asked } from './ask.ts'
import { type Case, SUITES, type Turn } from './cases.ts'
import { allowedMisses, checkAnswer, LIMITS } from './checks.ts'
import type { Fingerprint } from './fingerprint.ts'
import { JUDGE_MODEL, judgePrompt, parseVerdict, prepCorpusBlock, prepJudgePrompt, UNREADABLE } from './judge.ts'
import type { PrepAsked } from './prep-ask.ts'
import { PREP_SUITES, type PrepCase } from './prep-cases.ts'
import { checkPrepAnswer, notesFor, PREP_LIMITS } from './prep-checks.ts'
import type { CaseResult, Results } from './results.ts'

// The run (spec 023's Story 1): each case asked, checked and, when it states
// facts, judged; then results.json's object. The model and the judge come in
// from outside, so the tests script them and the eval file passes the real ones.

const KEY = 'ANTHROPIC_EVALS_KEY'

/** The evals workspace's key from the environment, or a throw before any call (S1.3, D192). */
export function keyFrom(env: Record<string, string | undefined>): string {
  const key = env[KEY]?.trim()
  if (key === undefined || key === '') {
    throw new Error(
      `${KEY} isn't set. The evals run only in CI, where the key is a repo secret (D192): push the commit to a branch named evals/… and download the run's results.`,
    )
  }
  return key
}

export interface RunnerOptions {
  ask: (turns: readonly Turn[], question: string) => Promise<Asked>
  /** The judge's raw reply to a prompt, and what it cost. */
  judge: (prompt: string) => Promise<{ text: string; costUsd: number }>
  /** Sends one posting to prep (spec 024). */
  askPrep?: (posting: string) => Promise<PrepAsked>
  /** The prep judge's raw reply: the cached corpus block, then the prompt. */
  judgePrep?: (corpus: string, prompt: string) => Promise<{ text: string; costUsd: number }>
  corpus: Corpus
  model: string
  fingerprint: Fingerprint
  commit: string
  runUrl?: string
  now?: () => Date
}

const round = (value: number) => Number(value.toFixed(6))

export function createRunner(options: RunnerOptions) {
  const results: CaseResult[] = []
  const byId = new Map(options.corpus.sources.map((source) => [source.id, source]))

  async function run(c: Case): Promise<CaseResult> {
    let asked: Asked
    try {
      asked = await options.ask(c.turns ?? [], c.question)
    } catch {
      asked = { text: '', state: 'failed', sources: [], costUsd: 0, ms: 0, tokens: { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 } }
    }
    const checks = checkAnswer(c, asked)
    let judge: CaseResult['judge']
    let judgeCostUsd = 0
    if (asked.state === 'answered') {
      const sources = asked.sources.flatMap((id) => {
        const source = byId.get(id)
        return source === undefined ? [] : [{ id, label: contextOf(options.corpus, source), text: source.text }]
      })
      try {
        const reply = await options.judge(judgePrompt(c.question, asked.text, sources, c.turns ?? []))
        judge = parseVerdict(reply.text)
        judgeCostUsd = reply.costUsd
      } catch {
        judge = UNREADABLE
      }
      checks.push({ name: 'the judge finds it supported', kind: 'accuracy', pass: judge.verdict === 'supported', detail: judge.verdict })
    }
    const accuracy = checks.filter((check) => check.kind === 'accuracy')
    const result: CaseResult = {
      id: c.id,
      suite: c.suite,
      title: c.title,
      turns: (c.turns ?? []).map((turn) => ({ role: turn.role, text: turn.text })),
      question: c.question,
      answer: asked.text,
      state: asked.state,
      sources: asked.sources.flatMap((id) => {
        const source = byId.get(id)
        return source === undefined ? [] : [{ id, label: source.label, url: source.url }]
      }),
      checks,
      ...(judge === undefined ? {} : { judge }),
      tokens: asked.tokens,
      costUsd: round(asked.costUsd),
      judgeCostUsd: round(judgeCostUsd),
      ms: Math.round(asked.ms),
      safe: checks.every((check) => check.kind !== 'safety' || check.pass),
      accurate: accuracy.length === 0 ? null : accuracy.every((check) => check.pass),
      pass: checks.every((check) => check.pass),
    }
    results.push(result)
    return result
  }

  const corpusBlock = prepCorpusBlock(
    options.corpus.sources.map((source) => ({ id: source.id, label: contextOf(options.corpus, source), text: source.text })),
  )
  const prepIds = new Set<string>()

  /** One prep case: sent, checked and, with matches or gaps, judged against the whole corpus (spec 024's Story 7). */
  async function runPrep(c: PrepCase): Promise<CaseResult> {
    prepIds.add(c.id)
    let asked: PrepAsked
    try {
      if (options.askPrep === undefined) throw new Error('no prep asker')
      asked = await options.askPrep(c.posting)
    } catch {
      asked = { state: 'failed', costUsd: 0, ms: 0, tokens: { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }, lines: [] }
    }
    const checks = checkPrepAnswer(c, asked)
    let judge: CaseResult['judge']
    let judgeCostUsd = 0
    const answer = asked.answer
    if (answer !== undefined && answer.state !== 'not-a-posting' && (answer.matches.length > 0 || answer.gaps.length > 0)) {
      try {
        if (options.judgePrep === undefined) throw new Error('no prep judge')
        const reply = await options.judgePrep(corpusBlock, prepJudgePrompt(c.posting, answer))
        judge = parseVerdict(reply.text)
        judgeCostUsd = reply.costUsd
      } catch {
        judge = UNREADABLE
      }
      checks.push({ name: 'the judge finds it supported', kind: 'accuracy', pass: judge.verdict === 'supported', detail: judge.verdict })
    }
    const accuracy = checks.filter((check) => check.kind === 'accuracy')
    const words = c.posting.match(/\S+/g)?.length ?? 0
    const result: CaseResult = {
      id: c.id,
      suite: c.suite,
      title: c.title,
      turns: [],
      // A long posting is shortened for /evals; the case file holds it whole.
      question:
        c.posting.length <= 700 ? c.posting : `${c.posting.slice(0, 600).trimEnd()}… (${words.toLocaleString('en-US')} words in all)`,
      answer:
        answer === undefined
          ? ''
          : answer.state === 'not-a-posting'
            ? 'Not a job description: it asks for a posting or a role.'
            : notesFor(answer),
      state: asked.state,
      sources: [...new Set(answer?.matches.flatMap((match) => match.sources.map((source) => source.id)) ?? [])].flatMap((id) => {
        const source = byId.get(id)
        return source === undefined ? [] : [{ id, label: source.label, url: source.url }]
      }),
      checks,
      ...(judge === undefined ? {} : { judge }),
      tokens: asked.tokens,
      costUsd: round(asked.costUsd),
      judgeCostUsd: round(judgeCostUsd),
      ms: Math.round(asked.ms),
      safe: checks.every((check) => check.kind !== 'safety' || check.pass),
      accurate: accuracy.length === 0 ? null : accuracy.every((check) => check.pass),
      pass: checks.every((check) => check.pass),
    }
    results.push(result)
    return result
  }

  function finish(): Results {
    const sum = (pick: (item: CaseResult) => number) => round(results.reduce((total, item) => total + pick(item), 0))
    const answerCostUsd = sum((item) => item.costUsd)
    const judgeCostUsd = sum((item) => item.judgeCostUsd)
    const passed = results.filter((item) => item.pass).length
    const safe = results.filter((item) => item.safe).length
    // The chat and prep each have their own accuracy allowance (spec 024's S7.4).
    const judged = results.filter((item) => item.accurate !== null && !prepIds.has(item.id))
    const accuracy = {
      cases: judged.length,
      passed: judged.filter((item) => item.accurate === true).length,
      allowedMisses: allowedMisses(judged.length),
    }
    const prepJudged = results.filter((item) => item.accurate !== null && prepIds.has(item.id))
    const prepAccuracy = {
      cases: prepJudged.length,
      passed: prepJudged.filter((item) => item.accurate === true).length,
      allowedMisses: allowedMisses(prepJudged.length),
    }
    const hasPrep = prepIds.size > 0
    return {
      version: 1,
      runAt: (options.now?.() ?? new Date()).toISOString(),
      commit: options.commit,
      ...(options.runUrl === undefined ? {} : { runUrl: options.runUrl }),
      model: options.model,
      judge: JUDGE_MODEL,
      fingerprint: options.fingerprint,
      corpus: { hash: createHash('sha256').update(JSON.stringify(options.corpus)).digest('hex'), sources: options.corpus.sources.length },
      limits: { costUsd: LIMITS.costUsd, cacheWriteUsd: LIMITS.cacheWriteUsd, ms: LIMITS.ms },
      ...(hasPrep ? { prepLimits: { costUsd: PREP_LIMITS.costUsd, ms: PREP_LIMITS.ms } } : {}),
      totals: {
        cases: results.length,
        passed,
        safe,
        accuracy,
        ...(hasPrep ? { prepAccuracy, prepCostUsd: sum((item) => (prepIds.has(item.id) ? item.costUsd : 0)) } : {}),
        answerCostUsd,
        judgeCostUsd,
        costUsd: round(answerCostUsd + judgeCostUsd),
        ms: sum((item) => item.ms),
      },
      suites: [...SUITES, ...PREP_SUITES]
        .map((suite) => ({
          ...suite,
          cases: results.filter((item) => item.suite === suite.id).length,
          passed: results.filter((item) => item.suite === suite.id && item.pass).length,
        }))
        .filter((suite) => suite.cases > 0),
      cases: results,
      // D200: every case safe, and accuracy misses within 5% of the accuracy cases, rounded up.
      passed:
        results.length > 0 &&
        safe === results.length &&
        accuracy.cases - accuracy.passed <= accuracy.allowedMisses &&
        prepAccuracy.cases - prepAccuracy.passed <= prepAccuracy.allowedMisses,
    }
  }

  return { run, runPrep, finish }
}
