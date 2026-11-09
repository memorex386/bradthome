import { describe, expect, test } from 'vitest'
import { LOG_RETENTION_DAYS, QUESTIONS_PER_DAY } from '../../../apps/chat-api/src/constants.ts'
import { SECTIONS, UPDATED } from '../../../apps/site/src/components/privacy/privacy.ts'

// Spec 021, Story 9: the privacy note's chat section (FR-011, D175).

const chat = SECTIONS.find((section) => section.id === 'chat')
const words = [chat?.heading, ...(chat?.paragraphs ?? []), ...(chat?.items ?? [])].join(' ')

describe("the privacy note's chat section", () => {
  test('S9.1 FR-011 says what a question sends to Anthropic, that nothing typed is stored, what a log line holds for how long, the daily code, and ALTCHA', () => {
    expect(chat).toBeDefined()
    expect(words).toMatch(/Anthropic/)
    expect(words).toMatch(/doesn’t store what you type/)
    for (const fact of ['tokens', 'cost', 'time', 'model', 'sources', 'declined']) expect(words, fact).toContain(fact)
    expect(words).toContain(`${LOG_RETENTION_DAYS} days`)
    expect(words).toContain(`${QUESTIONS_PER_DAY} questions a day`)
    expect(words).toMatch(/one-way code that changes every day/)
    expect(words).toMatch(/memory only/)
    expect(words).toMatch(/ALTCHA/)
    expect(words).toMatch(/no cookies/)
  })

  test("S9.2 FR-011 S6.4 FR-015 calls Brad Brad, describes the chat as live since v2.1, and the note's date moved", () => {
    expect(words).toMatch(/\bBrad\b/)
    expect(words).not.toMatch(/\b(he|him|his)\b/i)
    expect(words).not.toMatch(/\byet\b|when it is/i)
    expect(words).toMatch(/When you ask the chat a question/)
    expect(UPDATED >= '2026-11-09').toBe(true)
  })
})
