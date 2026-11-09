import { createHash } from 'node:crypto'
import type { Corpus } from '../../chat-api/src/corpus.ts'
import type { Asked } from './ask.ts'
import { type Case, SUITES, type Turn } from './cases.ts'
import { checkAnswer, LIMITS } from './checks.ts'
import type { Fingerprint } from './fingerprint.ts'
import { JUDGE_MODEL, judgePrompt, parseVerdict, UNREADABLE } from './judge.ts'
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
        return source === undefined ? [] : [{ id, label: source.label, text: source.text }]
      })
      try {
        const reply = await options.judge(judgePrompt(c.question, asked.text, sources, c.turns ?? []))
        judge = parseVerdict(reply.text)
        judgeCostUsd = reply.costUsd
      } catch {
        judge = UNREADABLE
      }
      checks.push({ name: 'the judge finds it supported', pass: judge.verdict === 'supported', detail: judge.verdict })
    }
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
    return {
      version: 1,
      runAt: (options.now?.() ?? new Date()).toISOString(),
      commit: options.commit,
      ...(options.runUrl === undefined ? {} : { runUrl: options.runUrl }),
      model: options.model,
      judge: JUDGE_MODEL,
      fingerprint: options.fingerprint,
      corpus: { hash: createHash('sha256').update(JSON.stringify(options.corpus)).digest('hex'), sources: options.corpus.sources.length },
      limits: { costUsd: LIMITS.costUsd, ms: LIMITS.ms },
      totals: {
        cases: results.length,
        passed,
        answerCostUsd,
        judgeCostUsd,
        costUsd: round(answerCostUsd + judgeCostUsd),
        ms: sum((item) => item.ms),
      },
      suites: SUITES.map((suite) => ({
        ...suite,
        cases: results.filter((item) => item.suite === suite.id).length,
        passed: results.filter((item) => item.suite === suite.id && item.pass).length,
      })).filter((suite) => suite.cases > 0),
      cases: results,
      passed: results.length > 0 && passed === results.length,
    }
  }

  return { run, finish }
}
