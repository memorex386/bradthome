import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { MODEL } from '../../../apps/chat-api/src/constants.ts'
import { VOICE_CONVERSATION, VOICE_QUESTIONS, VOICE_REPEATS, VOICE_TIMES, type VoiceRun } from '../../../apps/evals/src/voice.ts'

// Spec 046's SC-001 and Story 4: the real model answered the run's three
// groups once with this slice's prompt, from the evals workflow's voice run,
// and the record is committed for Brad's Gate 2, beside spec 045's.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const read = (file: string) => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8')) as VoiceRun

describe('the voice run on the lighter prompt (S4.1–S4.5, SC-001, FR-006)', () => {
  const run = read('apps/evals/voice.json')

  test('S4.1 S4.3 FR-006 the real model answered every ask once, for about $0.03', () => {
    expect(run.version).toBe(2)
    expect(run.model).toBe(MODEL)
    expect(run.replies.map((reply) => reply.question)).toEqual([
      ...VOICE_QUESTIONS.map((question) => question.question),
      ...VOICE_REPEATS.flatMap((question) => Array<string>(VOICE_TIMES).fill(question)),
      ...VOICE_CONVERSATION,
    ])
    expect(run.costUsd).toBeLessThan(0.05)
    for (const reply of run.replies) {
      expect(reply.text.length, reply.id).toBeGreaterThan(0)
      expect(reply.pills, reply.id).toHaveLength(3)
    }
  })

  // Amended at Gate 2, on Brad's card ("Ship, fix it next"): run 6's two first-person quotes of Brad's own words, from
  // the essay and a want, are known, and a follow-up slice rewrites them in code. C5's "cites a fact" failed only
  // because the check then wanted the answered state; it cited 4 facts, and the check now counts sources alone.
  const KNOWN: Record<string, string[]> = { S7: ['never speaks as Brad'], C5: ['never speaks as Brad', 'cites a fact'] }

  test('SC-001 S3.1 S3.2 S3.3 no repeated opening, no scripted phrase, and no broken guardrail but the two Brad accepted', () => {
    for (const reply of run.replies)
      expect(
        reply.checks.filter((check) => !check.pass).map((check) => check.name),
        reply.id,
      ).toEqual(KNOWN[reply.id] ?? [])
    expect(run.replies.find((reply) => reply.id === 'S9')?.state).toBe('boundary')
  })

  test('S4.4 every follow-up in the conversation cites a fact', () => {
    for (const id of ['C2', 'C3', 'C4', 'C5']) {
      const reply = run.replies.find((each) => each.id === id)
      expect(reply?.sources.length, id).toBeGreaterThan(0)
    }
  })

  test('S4.2 S4.5 the record lists the openings that repeat anywhere, and spec 045’s run sits beside it', () => {
    expect(Array.isArray(run.repeatedOpenings)).toBe(true)
    const before = read('specs/045-chat-voice/voice.json')
    expect(before.replies.map((reply) => reply.question)).toEqual(VOICE_QUESTIONS.map((question) => question.question))
  })
})
