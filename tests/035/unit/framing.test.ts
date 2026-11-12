import { describe, expect, test } from 'vitest'
import { type Case, CASES } from '../../../apps/evals/src/cases.ts'
import { type Answer, checkAnswer, claimChecks } from '../../../apps/evals/src/checks.ts'

// Spec 035, Story 2: the framing check fails the essay's old framings,
// "one-person" and "whole engineering team", in every suite, and still passes
// a label quoted in a sentence that turns it down (D200, D222).

const FRAMING = 'no framing the site avoids'

const answer = (text: string): Answer => ({ text, state: 'answered', sources: ['essay-summary'], costUsd: 0.0003, ms: 2_000 })

/** Whether the chat's framing case fails the framing check on this answer. */
const chatFailed = (text: string): boolean => {
  const c = CASES.find((item) => item.id === 'never-framing') as Case
  return checkAnswer(c, answer(text)).some((check) => check.name === FRAMING && !check.pass)
}

/** Whether the never-claims that interview prep's answers meet fail the framing check on this text. */
const prepFailed = (text: string): boolean => claimChecks(text).some((check) => check.name === FRAMING && !check.pass)

const OLD = [
  'Brad runs VINDecoded as a one-person engineering team.',
  'Brad runs VINDecoded as a one‑person team, with a non-breaking hyphen.',
  'At VINDecoded, Brad is the whole engineering team.',
  'One-person shops like Brad’s ship fast.',
]

describe('the framing check (story 2)', () => {
  test('S2.1 FR-003 an answer that says one-person or whole engineering team fails, in the chat and in interview prep', () => {
    for (const text of OLD) {
      expect(chatFailed(text), text).toBe(true)
      expect(prepFailed(text), text).toBe(true)
    }
    // As "one engineer" always has.
    expect(chatFailed('Brad is one engineer.')).toBe(true)
  })

  test('S2.2 FR-003 the phrases quoted in a sentence that turns them down pass, and the essay’s own words pass', () => {
    for (const text of [
      'The documents don’t call Brad “one-person”. AI agents write most of the code, and Brad reviews and approves the work.',
      'The essay doesn’t say Brad is “the whole engineering team”; it says the work waits for Brad’s review and approval.',
      // D199's line, which the essay still holds, isn't hyphenated.
      'A hosted run on every pull request mostly repeated checks, with one person reviewing.',
      'I run VINDecoded, where AI agents write most of the code and I review and approve the work.',
    ]) {
      expect(chatFailed(text), text).toBe(false)
      expect(prepFailed(text), text).toBe(false)
    }
  })

  test('S2.2 FR-003 the phrases quoted in a sentence that adopts them still fail', () => {
    expect(chatFailed('Brad describes VINDecoded as “a one-person engineering team”.')).toBe(true)
    expect(chatFailed('Brad is “the whole engineering team”.')).toBe(true)
  })
})
