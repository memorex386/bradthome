import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { MODEL } from '../../chat-api/src/constants.ts'
import { namesOfCorpus } from '../../chat-api/src/pills.ts'
import { createAnthropic } from '../../chat-api/src/testing.ts'
import { createAsker } from './ask.ts'
import { loadCorpus } from './corpus.ts'
import { keyFrom } from './run.ts'
import { VOICE_QUESTIONS, type VoiceReply, type VoiceRun, voiceReplyOf } from './voice.ts'

// The voice run (spec 045's S5.5): with EVALS_MODE=voice, the study's 14
// questions, once each, in order, so the first writes the corpus's cache and
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
  const ask = createAsker({ model: anthropic(MODEL), modelId: MODEL, corpus })
  const replies: VoiceReply[] = []
  const env = process.env

  afterAll(() => {
    const run: VoiceRun = {
      version: 1,
      runAt: new Date().toISOString(),
      commit: env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      ...(env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
        ? { runUrl: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` }
        : {}),
      model: MODEL,
      costUsd: Number(replies.reduce((sum, reply) => sum + reply.costUsd, 0).toFixed(6)),
      replies,
    }
    writeFileSync(OUT, `${JSON.stringify(run, null, 2)}\n`)
    console.log(`voice: ${replies.length} replies, $${run.costUsd.toFixed(4)}`)
  })

  describe('the study’s 14 questions', () => {
    for (const question of VOICE_QUESTIONS) {
      test(`${question.id}: ${question.name}`, async () => {
        const reply = voiceReplyOf(question, await ask([], question.question), names)
        replies.push(reply)
        const missed = reply.checks.filter((check) => !check.pass).map((check) => `${check.name} (${check.detail})`)
        expect(missed).toEqual([])
      })
    }
  })
}
