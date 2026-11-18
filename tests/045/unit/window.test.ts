import { describe, expect, test } from 'vitest'
import { MAX_CONVERSATION_CHARS } from '../../../apps/chat-api/src/conversation.ts'
import { MAX_ANSWER_CHARS } from '../../../apps/chat-api/src/constants.ts'
import { STARTERS as API_STARTERS } from '../../../apps/chat-api/src/pills.ts'
import { messagesOf } from '../../../apps/site/src/components/chat/api.ts'
import { HELD, META, NEXT, VOICED } from '../../../apps/site/src/components/chat/fixtures.ts'
import { eventOf } from '../../../apps/site/src/components/chat/stream.ts'
import type { Turn } from '../../../apps/site/src/components/chat/types.ts'
import { INSPECT, NEXT as NEXT_WORDS, PROGRESS, STARTERS } from '../../../apps/site/src/components/chat/words.ts'

// Spec 045: the window's pieces that need no browser. The e2e tests drive the
// pills, the hand-offs and the look in the pinned container.

const done = (id: string, question: string, text: string): Turn => ({ id, question, status: 'done', text, sources: [], meta: META })

describe('the stream reader (S2.1, FR-007)', () => {
  test('S2.1 FR-007 the pills part reads as the next questions; a malformed one is skipped, never an error', () => {
    expect(eventOf(JSON.stringify({ type: 'data-pills', data: NEXT }))).toEqual({ type: 'next', next: NEXT })
    for (const data of [{ pills: 'x', written: 1 }, { pills: [1], written: 1 }, { pills: ['a', 'b', 'c', 'd'], written: 0 }, { pills: [] }])
      expect(eventOf(JSON.stringify({ type: 'data-pills', data })), JSON.stringify(data)).toBeUndefined()
  })

  test('S3.4 FR-008 a reply’s numbers read with the chat state', () => {
    expect(eventOf(JSON.stringify({ type: 'data-meta', data: { ...META, state: 'chat' } }))).toEqual({
      type: 'meta',
      meta: { ...META, state: 'chat' },
    })
  })
})

describe('the words (S2.5, S2.7, S2.8)', () => {
  test('S2.5 the heading is “Ask next”, and the window and the API share one list of starters', () => {
    expect(NEXT_WORDS.heading).toBe('Ask next')
    expect(STARTERS).toBe(API_STARTERS)
  })

  test('S2.7 the status line counts the pills for screen readers', () => {
    expect(PROGRESS.ready(2, 3)).toBe('The answer is ready, with 2 sources and 3 questions to ask next.')
    expect(PROGRESS.ready(1, 1)).toBe('The answer is ready, with 1 source and 1 question to ask next.')
    expect(PROGRESS.ready(0)).toBe('The answer is ready, with 0 sources.')
  })

  test('S2.8 Inspect says how many pills the model wrote and how many came from the starters', () => {
    expect(INSPECT.next).toBe('Checked the questions to ask next')
    expect(INSPECT.nextDetail(3, 3)).toBe('3 written, each one checked')
    expect(INSPECT.nextDetail(1, 3)).toBe('1 written and checked, 2 from the starters')
  })
})

describe('the conversation’s cap in the window (S4.1, FR-010)', () => {
  test('S4.1 FR-010 the oldest finished turns go first, until the conversation fits 12,000 characters', () => {
    const long = 'y'.repeat(MAX_ANSWER_CHARS - 100)
    const turns = [1, 2, 3, 4].map((n) => done(`t${n}`, `Question ${n}?`, long))
    const sent = messagesOf('Newest?', turns)
    const size = sent.reduce((sum, message) => sum + message.parts.reduce((n, part) => n + part.text.length, 0), 0)
    expect(size).toBeLessThanOrEqual(MAX_CONVERSATION_CHARS)
    expect(sent.at(-1)?.parts[0]?.text).toBe('Newest?')
    // The newest pairs stay; the oldest went.
    expect(sent.map((message) => message.parts[0]?.text.slice(0, 11))).toEqual([
      'Question 2?',
      'y'.repeat(11),
      'Question 3?',
      'y'.repeat(11),
      'Question 4?',
      'y'.repeat(11),
      'Newest?',
    ])
    // A short conversation is sent whole, as before.
    expect(messagesOf('Next?', [done('a', 'Hi?', 'Hello.')])).toHaveLength(3)
  })
})

describe('the gallery (SC-002)', () => {
  test('SC-002 the study’s six scenarios are held states, each with three pills and its state', () => {
    const states = Object.fromEntries(Object.entries(VOICED).map(([id, turn]) => [id, turn.meta?.state]))
    expect(states).toEqual({ V1: 'answered', V2: 'answered', V3: 'chat', V7: 'answered', V9: 'boundary', V14: 'answered' })
    for (const turn of Object.values(VOICED)) expect(turn.next?.pills).toHaveLength(3)
    for (const id of Object.keys(VOICED)) expect(HELD.some((state) => state.id === id)).toBe(true)
    for (const turn of Object.values(VOICED)) expect(turn.text).not.toMatch(/\bdocuments?\b|\p{Extended_Pictographic}/iu)
  })
})
