import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { generateText, Output } from 'ai'
import { afterAll, describe, expect, test } from 'vitest'
import { MODEL } from '../../chat-api/src/constants.ts'
import { costOf } from '../../chat-api/src/spend.ts'
import { createAnthropic } from '../../chat-api/src/testing.ts'
import { createAsker } from './ask.ts'
import { createPrepAsker } from './prep-ask.ts'
import { PREP_CASES } from './prep-cases.ts'
import { CASES } from './cases.ts'
import { loadCorpus } from './corpus.ts'
import { fingerprintOf } from './fingerprint.ts'
import { JUDGE_MAX_OUTPUT_TOKENS, JUDGE_MODEL, judgeOutputSchema, PREP_RUBRIC, parseVerdict, RUBRIC, verdictText } from './judge.ts'
import { parseResults } from './results.ts'
import { changedCases, createRunner, keyFrom } from './run.ts'

// The eval run (spec 023): every frozen case on the real model, in the
// bradthome-evals workspace, one after another, so the first answer writes
// the corpus's cache and the rest read it. It runs only in CI, where the key
// is (D192), through `pnpm evals`, and writes apps/evals/results.json even
// when a case fails (S1.2). The key is read here and passed to the provider,
// never printed or written.
//
// Since spec 037 (D228) there are two kinds of run. A push to an evals/ branch
// runs a changed run: only the cases new or edited since the last full run,
// by their hashes in results.json, written to changed.json. A run by hand with
// full set asks every case and writes results.json.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const MODE = process.env.EVALS_MODE === 'full' ? 'full' : 'changed'
const OUT = path.join(ROOT, 'apps', 'evals', MODE === 'full' ? 'results.json' : 'changed.json')

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

/** The last full run's cases, with their hashes; none when it's missing or unreadable, so every case counts as new. */
const lastFull = (() => {
  try {
    return parseResults(JSON.parse(read('apps/evals/results.json') ?? '')).cases
  } catch {
    return undefined
  }
})()
const chatCases = MODE === 'full' ? CASES : changedCases(CASES, lastFull)
const prepCases = MODE === 'full' ? PREP_CASES : changedCases(PREP_CASES, lastFull)
if (chatCases.length + prepCases.length === 0)
  console.log('evals: no case is new or edited since the last full run, so this changed run asks none.')

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
      output: Output.object({ schema: judgeOutputSchema }),
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
    return { text: verdictText(result.output), costUsd }
  },
  askPrep: createPrepAsker({ model: anthropic(MODEL), modelId: MODEL, corpus }),
  judgePrep: async (block, prompt) => {
    // The corpus block is the same for every prep case, so it's cached after the first (spec 024's plan).
    const result = await generateText({
      model: anthropic(JUDGE_MODEL),
      system: PREP_RUBRIC,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: block, providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      output: Output.object({ schema: judgeOutputSchema }),
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
    if (parseVerdict(result.text).verdict === 'unreadable') {
      console.warn(
        `prep judge: unreadable reply, finish ${result.finishReason}, ${result.text.length} characters: ${result.text.slice(0, 300)}`,
      )
    }
    return { text: verdictText(result.output), costUsd }
  },
  corpus,
  model: MODEL,
  fingerprint,
  commit,
  ...(runUrl === undefined ? {} : { runUrl }),
  mode: MODE,
})

/** Every case the run asks, which each needs a result before the run can pass. */
const asked = chatCases.length + prepCases.length
/** Two tries of a case, each up to the chat API's one-minute limit, and their judging. */
const TWO_TRIES_MS = 150_000

afterAll(() => {
  const results = runner.finish()
  // A case whose test timed out left no result, so the run can't pass without it (D228).
  if (results.cases.length < asked) results.passed = false
  writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`)
  const { totals } = results
  console.log(
    `evals (${MODE}): ${results.passed ? 'passed' : 'failed'}, ${totals.safe} of ${totals.cases} safe, accuracy ${totals.accuracy.passed} of ${totals.accuracy.cases} (${totals.accuracy.allowedMisses} may miss), prep ${totals.prepAccuracy?.passed ?? 0} of ${totals.prepAccuracy?.cases ?? 0} (${totals.prepAccuracy?.allowedMisses ?? 0} may miss), $${totals.costUsd.toFixed(4)} ($${totals.answerCostUsd.toFixed(4)} answers, $${(totals.prepCostUsd ?? 0).toFixed(4)} of them prep, $${totals.judgeCostUsd.toFixed(4)} judging)`,
  )
})

// D200: a case's test fails on a safety check, and an accuracy miss is logged. The
// last test holds the run to its bar: a full run to D221's pooled 5% of every
// judged answer, and a changed run to every case it asks (D228).
// A suite with no case to ask isn't registered, since a suite with no test fails the run (D228's S1.2).
if (chatCases.length > 0)
  describe('Ask about Brad', () => {
    for (const c of chatCases) {
      test(
        `${c.suite}: ${c.id}`,
        async () => {
          const result = await runner.run(c)
          const missed = result.checks.filter((check) => check.kind === 'accuracy' && !check.pass)
          if (missed.length > 0)
            console.warn(`accuracy miss ${c.id}: ${missed.map((check) => check.name).join(', ')}. ${result.judge?.reason ?? ''}`)
          const unsafe = result.checks
            .filter((check) => check.kind === 'safety' && !check.pass)
            .map((check) => `${check.name} (${check.detail})`)
          expect(unsafe).toEqual([])
        },
        TWO_TRIES_MS,
      )
    }
  })

// Spec 024: interview prep's cases, held to the same bar as the chat's (D221, D228).
if (prepCases.length > 0)
  describe('Interview prep', () => {
    for (const c of prepCases) {
      test(
        `${c.suite}: ${c.id}`,
        async () => {
          const result = await runner.runPrep(c)
          const missed = result.checks.filter((check) => check.kind === 'accuracy' && !check.pass)
          if (missed.length > 0)
            console.warn(`accuracy miss ${c.id}: ${missed.map((check) => check.name).join(', ')}. ${result.judge?.reason ?? ''}`)
          const unsafe = result.checks
            .filter((check) => check.kind === 'safety' && !check.pass)
            .map((check) => `${check.name} (${check.detail})`)
          expect(unsafe).toEqual([])
        },
        TWO_TRIES_MS,
      )
    }
  })

test(`the ${MODE} run passes its bar`, () => {
  const { totals, cases } = runner.finish()
  expect(cases.length, 'every case the run asked has a result').toBe(asked)
  const judged = totals.judged ?? totals.accuracy
  expect(
    runner.finish().passed,
    `${totals.passed} of ${totals.cases} cases passed, ${judged.passed} of ${judged.cases} judged answers accurate`,
  ).toBe(true)
})
