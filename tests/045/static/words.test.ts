import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { MAX_CONVERSATION_CHARS } from '../../../apps/chat-api/src/conversation.ts'
import {
  DAY_LIMIT_USD,
  MAX_ANSWER_CHARS,
  MAX_MESSAGES,
  MAX_OUTPUT_TOKENS,
  MAX_QUESTION_CHARS,
  MODEL,
  MONTH_LIMIT_USD,
  QUESTIONS_PER_DAY,
} from '../../../apps/chat-api/src/constants.ts'
import { MAX_PILL_CHARS, MAX_TRAILER_CHARS, PILLS } from '../../../apps/chat-api/src/pills.ts'
import { PREP_REMINDER, PREP_SYSTEM } from '../../../apps/chat-api/src/prep.ts'
import { costOf } from '../../../apps/chat-api/src/spend.ts'
import { stateLabel } from '../../../apps/site/src/components/evals/evals.ts'
import { SECTIONS } from '../../../apps/site/src/components/privacy/privacy.ts'

// Spec 045: the words elsewhere, interview prep left as it was, and the caps'
// arithmetic.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')
const tracked = () => execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)

describe('the words elsewhere (S3.6, FR-012)', () => {
  test('S3.6 the off-topic sentence is gone from the API, the window and the evals, and /evals names the chat state', () => {
    for (const dir of ['apps/chat-api/src', 'apps/site/src', 'apps/evals/src']) {
      for (const file of tracked().filter((name) => name.startsWith(dir))) {
        const text = read(file)
        expect(text, file).not.toContain('OFF_TOPIC')
        expect(text, file).not.toContain('This chat only answers questions about Brad’s work')
      }
    }
    expect(stateLabel('chat')).toBe('Small talk, with no source')
  })

  test('FR-012 /privacy says the log counts the dropped pills, and specs 021–023 point to spec 045', () => {
    const chat = SECTIONS.find((section) => section.id === 'chat')
    expect(chat?.items?.join(' ')).toContain('how many of its suggested next questions it dropped')
    for (const spec of ['021-chat-api', '022-chat-window', '023-evals']) expect(read('specs', spec, 'spec.md'), spec).toContain('spec 045')
  })

  test('FR-012 nothing in the repo links to the private study', () => {
    for (const file of tracked().filter((name) => /\.(md|ts|tsx|astro|json|yml)$/.test(name)))
      expect(read(file), file).not.toMatch(/claude\.ai\/artifact/)
  })
})

describe('interview prep (S6.4)', () => {
  test('S6.4 prep’s prompt keeps main’s words before spec 045', () => {
    expect(createHash('sha256').update(`${PREP_SYSTEM}\n${PREP_REMINDER}`).digest('hex')).toBe(
      'ad214017d5e8b8bdd196630422657ad2ae3eeda0848d57240f331d46d9dfdcaa',
    )
  })
})

describe('the caps (S4.2, S4.3, SC-003)', () => {
  test('S4.3 the visitor’s 20 questions and the day and month limits hold', () => {
    expect([QUESTIONS_PER_DAY, DAY_LIMIT_USD, MONTH_LIMIT_USD, MAX_MESSAGES]).toEqual([20, 2.5, 20, 10])
    expect([MAX_CONVERSATION_CHARS, MAX_OUTPUT_TOKENS, PILLS, MAX_PILL_CHARS, MAX_TRAILER_CHARS]).toEqual([12_000, 800, 3, 60, 400])
  })

  test('SC-003 at worst an answer costs at most $0.0035, and a visitor’s 20 questions at most $0.07', () => {
    // A follow-up reads the whole corpus uncached (about 24,900 tokens in the last full run), plus the
    // conversation at its cap, at a generous 3.5 characters a token, and writes every output token it may.
    const corpus = 24_900
    const conversation = Math.ceil(MAX_CONVERSATION_CHARS / 3.5)
    const worst = costOf(MODEL, { noCache: corpus + conversation, cacheRead: 0, cacheWrite: 0, output: MAX_OUTPUT_TOKENS })
    expect(worst).toBeLessThanOrEqual(0.0035)
    expect(worst * QUESTIONS_PER_DAY).toBeLessThanOrEqual(0.07)
    // Before spec 045 the conversation could reach five questions and five answers at their own caps.
    const before = costOf(MODEL, {
      noCache: corpus + Math.ceil(((MAX_MESSAGES / 2) * (MAX_QUESTION_CHARS + MAX_ANSWER_CHARS)) / 3.5),
      cacheRead: 0,
      cacheWrite: 0,
      output: MAX_OUTPUT_TOKENS,
    })
    expect(worst).toBeLessThan(before)
  })
})
