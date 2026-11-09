import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { generateText } from 'ai'
import { afterAll, describe, expect, test } from 'vitest'
import { MODEL } from '../../chat-api/src/constants.ts'
import { costOf } from '../../chat-api/src/spend.ts'
import { createAnthropic } from '../../chat-api/src/testing.ts'
import { createAsker } from './ask.ts'
import { CASES } from './cases.ts'
import { loadCorpus } from './corpus.ts'
import { fingerprintOf } from './fingerprint.ts'
import { JUDGE_MAX_OUTPUT_TOKENS, JUDGE_MODEL, parseVerdict, RUBRIC } from './judge.ts'
import { createRunner, keyFrom } from './run.ts'

// The eval run (spec 023): every frozen case on the real model, in the
// bradthome-evals workspace, one after another, so the first answer writes
// the corpus's cache and the rest read it. It runs only in CI, where the key
// is (D192), through `pnpm evals`, and writes apps/evals/results.json even
// when a case fails (S1.2). The key is read here and passed to the provider,
// never printed or written.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const OUT = path.join(ROOT, 'apps', 'evals', 'results.json')

const key = keyFrom(process.env)
const anthropic = createAnthropic({ apiKey: key })
const corpus = loadCorpus()
const read = (file: string) => {
  try {
    return readFileSync(path.join(ROOT, file), 'utf8')
  } catch {
    return undefined
  }
}
const fingerprint = fingerprintOf(read)
if (fingerprint === undefined) throw new Error('The chat API’s prompt is missing, so there is nothing to evaluate.')

const env = process.env
const commit = env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()
const runUrl =
  env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
    : undefined

const runner = createRunner({
  ask: createAsker({ model: anthropic(MODEL), modelId: MODEL, corpus }),
  judge: async (prompt) => {
    const result = await generateText({
      model: anthropic(JUDGE_MODEL),
      system: RUBRIC,
      prompt,
      maxOutputTokens: JUDGE_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      providerOptions: { anthropic: { effort: 'low' } },
    })
    const usage = result.usage
    const costUsd = costOf(JUDGE_MODEL, {
      noCache: usage.inputTokenDetails.noCacheTokens ?? usage.inputTokens ?? 0,
      cacheRead: usage.inputTokenDetails.cacheReadTokens ?? 0,
      cacheWrite: usage.inputTokenDetails.cacheWriteTokens ?? 0,
      output: usage.outputTokens ?? 0,
    })
    // An unreadable verdict fails its case; the log says why, for the next fix.
    if (parseVerdict(result.text).verdict === 'unreadable') {
      console.warn(`judge: unreadable reply, finish ${result.finishReason}, ${result.text.length} characters: ${result.text.slice(0, 300)}`)
    }
    return { text: result.text, costUsd }
  },
  corpus,
  model: MODEL,
  fingerprint,
  commit,
  ...(runUrl === undefined ? {} : { runUrl }),
})

afterAll(() => {
  const results = runner.finish()
  writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`)
  const { totals } = results
  console.log(
    `evals: ${totals.safe} of ${totals.cases} safe, accuracy ${totals.accuracy.passed} of ${totals.accuracy.cases} (${totals.accuracy.allowedMisses} may miss), $${totals.costUsd.toFixed(4)} ($${totals.answerCostUsd.toFixed(4)} answers, $${totals.judgeCostUsd.toFixed(4)} judging)`,
  )
})

// D200: a case's test fails on a safety check; an accuracy miss is logged, and
// the last test fails when the misses pass the run's allowance.
describe('Ask about Brad', () => {
  for (const c of CASES) {
    test(`${c.suite}: ${c.id}`, async () => {
      const result = await runner.run(c)
      const missed = result.checks.filter((check) => check.kind === 'accuracy' && !check.pass)
      if (missed.length > 0)
        console.warn(`accuracy miss ${c.id}: ${missed.map((check) => check.name).join(', ')}. ${result.judge?.reason ?? ''}`)
      const unsafe = result.checks
        .filter((check) => check.kind === 'safety' && !check.pass)
        .map((check) => `${check.name} (${check.detail})`)
      expect(unsafe).toEqual([])
    })
  }

  test('accuracy: at most 5% of the accuracy cases miss, rounded up', () => {
    const { accuracy } = runner.finish().totals
    expect(accuracy.cases - accuracy.passed).toBeLessThanOrEqual(accuracy.allowedMisses)
  })
})
