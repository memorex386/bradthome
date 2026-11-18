import { describe, expect, test } from 'vitest'
import { MAX_CONVERSATION_CHARS } from '../../../apps/chat-api/src/conversation.ts'
import { MAX_OUTPUT_TOKENS } from '../../../apps/chat-api/src/constants.ts'
import { LOG_FIELDS } from '../../../apps/chat-api/src/log.ts'
import { STARTERS } from '../../../apps/chat-api/src/pills.ts'
import { BOUNDARY, NO_SOURCE, stateOf } from '../../../apps/chat-api/src/prompt.ts'
import { ask, harness, logged, partsOf, question, reply } from '../../021/helpers/fakes.ts'

// Spec 045, Stories 2–4 through the API's real code: a fake model streams a
// scripted reply, trailer included, and the tests read the stream and the log.

const TRAILER = '\n<next>\nWhat did he build at Hopper?\nWhat’s Brad’s phone number?\nHow did the Disruption Assistance flow ship?\n</next>'

async function answer(text: string[], cites: string[] = [], messages?: unknown[]) {
  const h = harness({ script: { text, cites } })
  const parts = await partsOf(await ask(h, messages === undefined ? {} : { messages }))
  const words = parts
    .filter((part) => part.type === 'text-delta')
    .map((part) => part.delta)
    .join('')
  const pills = parts.find((part) => part.type === 'data-pills')?.data as { pills: string[]; written: number } | undefined
  const meta = parts.find((part) => part.type === 'data-meta')?.data as { state: string } | undefined
  return { h, parts, words, pills, meta, line: logged(h).at(-1) ?? {} }
}

describe('the pills on the stream (S2.1, S2.4, FR-004–FR-006)', () => {
  test('S2.1 FR-004 the answer streams as one text part without its trailer, then sources, then one pills part, then the numbers', async () => {
    const { parts, words, pills } = await answer(['Brad launched ', 'a purchase flow.', TRAILER], ['hopper-disruption-assistance-1'])
    expect(words).toBe('Brad launched a purchase flow.\n')
    expect(JSON.stringify(parts.filter((part) => String(part.type).startsWith('text')))).not.toMatch(/next|phone/)
    const ids = new Set(parts.filter((part) => String(part.type).startsWith('text')).map((part) => part.id))
    expect(ids.size).toBe(1)
    const order = parts
      .map((part) => String(part.type))
      .filter((type) => ['text-end', 'source-url', 'data-pills', 'data-meta'].includes(type))
    expect(order).toEqual(['text-end', 'source-url', 'data-pills', 'data-meta'])
    // The harness asks "What did Brad build at Hopper?", so the first, rewritten, is a repeat; the phone question is private.
    expect(pills).toEqual({ pills: ['How did the Disruption Assistance flow ship?', STARTERS[0], STARTERS[1]], written: 1 })
  })

  test('S2.4 FR-004 a tag split across the model’s chunks never shows', async () => {
    const { words, pills } = await answer(['Brad shipped it.\n<ne', 'xt>\nWhat’s', ' RemoteUI?\n</ne', 'xt>'], ['job-hopper'])
    expect(words).toBe('Brad shipped it.\n')
    expect(pills?.written).toBe(0)
    // The harness asks the third starter, so the fill skips it.
    expect(pills?.pills).toEqual([STARTERS[0], STARTERS[1], STARTERS[3]])
  })

  test('S2.3 FR-006 a reply with no trailer still gets three pills, none of them the question asked', async () => {
    const { pills } = await answer(['Brad built it at Hopper.'], ['job-hopper'], [question(STARTERS[2])])
    expect(pills).toEqual({ pills: [STARTERS[0], STARTERS[1], STARTERS[3]], written: 0 })
  })

  test('S2.2 FR-005 FR-006 the questions asked earlier in the conversation are never offered again', async () => {
    const { pills } = await answer(
      ['Brad built it.', '<next>\nWhat did Brad build at Hopper?\n</next>'],
      ['job-hopper'],
      [question('What did Brad build at Hopper?'), reply('At Hopper, Brad built it.'), question('More?', 'm2')],
    )
    expect(pills?.pills).not.toContain('What did Brad build at Hopper?')
    expect(pills?.written).toBe(0)
  })

  test('S2.1 every kind of reply ends with three pills', async () => {
    for (const [text, cites] of [
      [['Brad built it.'], ['job-hopper']],
      [[`Brad keeps that one private. ${NO_SOURCE}`], []],
      [[`Fair question! ${BOUNDARY}`], []],
      [['Hi, glad you stopped by!'], []],
    ] as const) {
      const { pills } = await answer([...text], [...cites])
      expect(pills?.pills, text.join('')).toHaveLength(3)
    }
  })
})

describe('the states (S3.1–S3.5, FR-003, FR-009)', () => {
  test('S3.1 S3.2 S3.3 S3.4 FR-003 boundary, no-source, answered and chat, by the fixed sentences and the sources', async () => {
    const cases: [string[], string[], string][] = [
      [[`Fair question! ${BOUNDARY}`], [], 'boundary'],
      [[`Brad keeps that one private. ${NO_SOURCE}`], [], 'no-source'],
      [['Rust isn’t one of Brad’s stops. ', NO_SOURCE], ['job-hopper'], 'no-source'],
      [['At Hopper, Brad shipped it.'], ['job-hopper'], 'answered'],
      [['Hi, glad you stopped by!'], [], 'chat'],
      [['Anytime! Brad’s at brad@bradthome.com.'], [], 'chat'],
    ]
    for (const [text, cites, state] of cases) {
      const { meta, line } = await answer(text, cites)
      expect(meta?.state, text.join('')).toBe(state)
      expect(line.state).toBe(state)
    }
    // The words match with straight or curly apostrophes and any spacing.
    expect(stateOf(`Fair question!  ${BOUNDARY.replace('’', "'")}`, [])).toBe('boundary')
  })

  test('S3.5 FR-009 S6.5 the log line is numbers only, with the count of dropped pills and none of their words', async () => {
    const { line } = await answer(['Brad built it.', TRAILER], ['job-hopper'])
    expect(Object.keys(line).sort()).toEqual([...LOG_FIELDS].sort())
    // The harness's own question, repeated, and the phone question.
    expect(line.pillsDropped).toBe(2)
    const text = JSON.stringify(line)
    for (const words of ['phone', 'Hopper?', 'Disruption Assistance flow', 'What did']) expect(text).not.toContain(words)
  })
})

describe('the caps (S4.1, S4.2, FR-010)', () => {
  test('S4.1 FR-010 a conversation over 12,000 characters in all is refused as invalid; one at the cap is answered', async () => {
    const long = 'x'.repeat(3_600)
    const at = [question('a'.repeat(999)), reply(long), question('b'), reply(long), question('c'), reply(long), question('d', 'm9')]
    const total = 999 + 3 * 3_600 + 3
    expect(total).toBeLessThanOrEqual(MAX_CONVERSATION_CHARS)
    const h = harness({ script: { cites: ['job-hopper'] } })
    expect((await ask(h, { messages: at })).status).toBe(200)
    const over = [...at.slice(0, -1), question('d'.repeat(MAX_CONVERSATION_CHARS - total + 2), 'm9')]
    const refused = await ask(harness(), { messages: over })
    expect(refused.status).toBe(400)
    expect(await refused.json()).toMatchObject({ state: 'invalid' })
  })

  test('S4.2 the model writes at most 800 tokens, as before', async () => {
    const { h } = await answer(['Brad built it.'], ['job-hopper'])
    expect(MAX_OUTPUT_TOKENS).toBe(800)
    expect(h.model.doStreamCalls[0]?.maxOutputTokens).toBe(800)
  })
})
