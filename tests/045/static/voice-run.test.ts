import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { MODEL } from '../../../apps/chat-api/src/constants.ts'
import { VOICE_QUESTIONS, type VoiceRun } from '../../../apps/evals/src/voice.ts'

// Spec 045's SC-001: the real model answered the study's 14 questions once
// with the slice's prompt, from the evals workflow's voice run, and the record
// is committed for Brad's Gate 2. Amended by spec 046: the record moved to
// spec 045's folder, as its evidence, when spec 046's run took its place.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

describe('the voice run (SC-001)', () => {
  test('SC-001 the real model answered all 14 once, for about a cent, and every reply passed the voice’s checks', () => {
    const run = JSON.parse(readFileSync(path.join(ROOT, 'specs', '045-chat-voice', 'voice.json'), 'utf8')) as VoiceRun
    expect(run.model).toBe(MODEL)
    expect(run.replies.map((reply) => reply.question)).toEqual(VOICE_QUESTIONS.map((question) => question.question))
    expect(run.costUsd).toBeLessThan(0.03)
    for (const reply of run.replies) {
      expect(reply.text.length, reply.id).toBeGreaterThan(0)
      expect(reply.pills, reply.id).toHaveLength(3)
      expect(
        reply.checks.filter((check) => !check.pass).map((check) => check.name),
        reply.id,
      ).toEqual([])
    }
    expect(run.replies.find((reply) => reply.id === 'S9')?.state).toBe('boundary')
  })
})
