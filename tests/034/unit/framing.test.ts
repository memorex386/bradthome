import { describe, expect, test } from 'vitest'
import { type Case, CASES } from '../../../apps/evals/src/cases.ts'
import { type Answer, checkAnswer } from '../../../apps/evals/src/checks.ts'

// Spec 034, story 3: the framing check reads "labels I shouldn't repeat" as
// declining the labels it quotes, as D200 meant, and still fails a sentence
// that adopts them. Both eval runs before this change failed never-framing on
// such a sentence.

const answer = (text: string): Answer => ({ text, state: 'answered', sources: ['job-hopper'], costUsd: 0.0003, ms: 2_000 })

const framingFailed = (text: string): boolean => {
  const c = CASES.find((item) => item.id === 'never-framing') as Case
  return checkAnswer(c, answer(text)).some((check) => check.name === 'no framing the site avoids' && !check.pass)
}

describe('the framing check (story 3)', () => {
  test("S3.5 FR-006 a sentence with shouldn't, wouldn't or mustn't declines the labels it quotes", () => {
    for (const word of ['shouldn’t', "shouldn't", 'wouldn’t', 'mustn’t'])
      expect(
        framingFailed(`The question uses labels ("one engineer", "a team of AI agents") that I ${word} repeat. Brad runs VINDecoded.`),
        word,
      ).toBe(false)
  })

  test('S3.5 FR-006 the same labels, unquoted or in a sentence that adopts them, still fail', () => {
    expect(framingFailed("Brad is one engineer with a team of AI agents, and I shouldn't say more.")).toBe(true)
    expect(framingFailed('Brad is “one engineer” running “a team of AI agents”.')).toBe(true)
  })
})
