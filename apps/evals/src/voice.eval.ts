import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { wrapLanguageModel } from 'ai'
import { afterAll, expect, test } from 'vitest'
import { MODEL } from '../../chat-api/src/constants.ts'
import { namesOfCorpus } from '../../chat-api/src/pills.ts'
import { createAnthropic } from '../../chat-api/src/testing.ts'
import { createAsker } from './ask.ts'
import { loadCorpus } from './corpus.ts'
import { keyFrom } from './run.ts'
import { repeatedOpenings, runVoice, type VoiceReply, type VoiceRun } from './voice.ts'

// The voice run (spec 045's S5.5, spec 046's S4.1): with EVALS_MODE=voice,
// the study's 14 questions, three common questions three times each, and one
// five-turn conversation, in order, so the first writes the corpus's cache and
// the rest read it. No judge, no retry: Brad reads every reply at Gate 2. The
// key is read here and passed to the provider, never printed or written.

const VOICE = process.env.EVALS_MODE === 'voice'
const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const OUT = path.join(ROOT, 'apps', 'evals', 'voice.json')

if (!VOICE) test.skip('the voice run asks only with EVALS_MODE=voice', () => {})
else {
  const anthropic = createAnthropic({ apiKey: keyFrom(process.env) })
  const corpus = loadCorpus()
  const names = namesOfCorpus(corpus)
  // Everything the model writes for the current ask, trailer included, kept only for an answer that came back
  // empty, so the record shows where its words went (spec 046). The questions are the run's own, never a visitor's.
  let raw = ''
  const model = wrapLanguageModel({
    model: anthropic(MODEL),
    middleware: {
      wrapStream: async ({ doStream }) => {
        raw = ''
        const { stream, ...rest } = await doStream()
        const tee = new TransformStream<typeof stream extends ReadableStream<infer T> ? T : never>({
          transform(part, controller) {
            if (part.type === 'text-delta') raw += part.delta
            controller.enqueue(part)
          },
        })
        return { stream: stream.pipeThrough(tee), ...rest }
      },
    },
  })
  const ask = createAsker({ model, modelId: MODEL, corpus })
  const replies: VoiceReply[] = []
  const env = process.env

  afterAll(() => {
    const run: VoiceRun = {
      version: 2,
      runAt: new Date().toISOString(),
      commit: env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      ...(env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
        ? { runUrl: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` }
        : {}),
      model: MODEL,
      costUsd: Number(replies.reduce((sum, reply) => sum + reply.costUsd, 0).toFixed(6)),
      replies,
      repeatedOpenings: repeatedOpenings(replies),
    }
    writeFileSync(OUT, `${JSON.stringify(run, null, 2)}\n`)
    console.log(`voice: ${replies.length} replies, $${run.costUsd.toFixed(4)}`)
  })

  test('every ask, once, with no failed check', { timeout: 600_000 }, async () => {
    // raw starts empty for each ask, so a request the API refused never carries the last ask's words.
    const fresh: typeof ask = (turns, question) => {
      raw = ''
      return ask(turns, question)
    }
    await runVoice(fresh, names, (reply) => replies.push(reply.text === '' && raw !== '' ? { ...reply, raw } : reply))
    const missed = replies.flatMap((reply) =>
      reply.checks.filter((check) => !check.pass).map((check) => `${reply.id}: ${check.name} (${check.detail})`),
    )
    expect(missed).toEqual([])
  })
}
