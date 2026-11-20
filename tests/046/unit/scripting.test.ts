import { describe, expect, test } from 'vitest'
import { vocabularyOf } from '../../../apps/chat-api/src/pills.ts'
import { BOUNDARY, NO_SOURCE } from '../../../apps/chat-api/src/prompt.ts'
import type { Asked } from '../../../apps/evals/src/ask.ts'
import type { Case } from '../../../apps/evals/src/cases.ts'
import { type Answer, checkAnswer, freshOpening, openingOf, SCRIPTED } from '../../../apps/evals/src/checks.ts'
import {
  repeatedOpenings,
  runVoice,
  VOICE_CONVERSATION,
  VOICE_QUESTIONS,
  VOICE_REPEATS,
  VOICE_TIMES,
  type VoiceReply,
} from '../../../apps/evals/src/voice.ts'
import { evalsOff } from '../../../scripts/lib/evals.ts'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Spec 046, Stories 3 and 4: coded checks that catch scripting, in the voice
// run and the evals, on made-up replies. No case reaches a model (D244).

const NAMES = vocabularyOf(['Brad Thome', 'Hopper', 'RemoteUI', 'Capital One', 'VINDecoded'])
const PILLS = ['What’s RemoteUI?', 'How did the Capital One flow ship?', 'What’s VINDecoded?']

const OLD_PHRASES = [
  'Here’s the good part: Brad launched the flow.',
  "Here's the good part: Brad launched the flow.",
  'Lead with the good part.',
  'Hard to pick just one, but Brad launched the flow.',
  'HERE’S A STANDOUT: Brad launched the flow.',
  'Here’s what to weigh. Brad launched the flow.',
  'You be the judge.',
  'Nice try. Brad launched the flow.',
  'Brad keeps that one private.',
  'Here’s one of Brad’s strongest facts: Brad launched the flow.',
]

const asked = (text: string, more: Partial<Asked> = {}): Asked => ({
  text,
  state: 'answered',
  sources: ['hopper-disruption-assistance-1'],
  costUsd: 0.001,
  ms: 1_000,
  tokens: { input: 1, cacheRead: 1, cacheWrite: 0, output: 1 },
  pills: PILLS,
  ...more,
})

const CASE: Case = { id: 'tone-best', suite: 'tone', title: 'The best of Brad’s work', question: 'q', expect: { states: ['answered'] } }
const failing = (c: Case, answer: Partial<Answer>) =>
  checkAnswer(c, { ...asked('Brad launched the flow.'), ...answer }, NAMES)
    .filter((check) => !check.pass)
    .map((check) => check.name)

describe('an opening (S3.1, S3.2, FR-004)', () => {
  test('S3.1 S3.2 FR-004 an opening is the first four words, lowercased, without punctuation, apostrophes made plain', () => {
    expect(openingOf('Here’s the good part: Brad launched it.')).toBe("here's the good part")
    expect(openingOf("  HERE'S the GOOD part! Brad")).toBe("here's the good part")
    expect(openingOf('Hi there!')).toBe('hi there')
    expect(openingOf('')).toBe('')
  })

  test('S3.1 S3.2 a reply is fresh unless its opening matches an earlier one; an empty opening never matches', () => {
    expect(freshOpening('Here’s the good part: Brad shipped it.', ['Here’s the good part: Brad launched it.'])).toBe(false)
    expect(freshOpening('At Hopper, Brad shipped it.', ['Here’s the good part: Brad launched it.'])).toBe(true)
    expect(freshOpening('Hi there!', ['Hi there, welcome.'])).toBe(true)
    expect(freshOpening('', [''])).toBe(true)
    expect(freshOpening('Anything at all.', [])).toBe(true)
  })
})

describe('no scripted phrase (S3.3, S3.5, FR-004)', () => {
  test('S3.3 every phrase the old prompt scripted is found, in any case, with either apostrophe', () => {
    for (const text of OLD_PHRASES) expect(text, text).toMatch(SCRIPTED)
    for (const text of ['Brad launched the flow.', 'A good partner to the designers.', 'Try the chat.', 'Brad’s strongest-selling app.'])
      expect(text, text).not.toMatch(SCRIPTED)
  })

  test('S3.3 S3.5 every eval answer fails “no scripted phrase” with one, and the detail never quotes it', () => {
    for (const text of OLD_PHRASES) expect(failing(CASE, { text }), text).toEqual(['no scripted phrase'])
    const check = checkAnswer(CASE, asked(OLD_PHRASES[0] ?? ''), NAMES).find((each) => each.name === 'no scripted phrase')
    expect(check).toMatchObject({ kind: 'safety', pass: false, detail: 'found' })
    expect(checkAnswer(CASE, asked('Brad launched it.'), NAMES).find((each) => each.name === 'no scripted phrase')?.detail).toBe(
      'none found',
    )
    // The fixed sentences pass.
    expect(
      failing(
        { ...CASE, expect: { states: ['no-source'] } },
        { state: 'no-source', sources: [], text: `Brad doesn’t share that. ${NO_SOURCE}` },
      ),
    ).toEqual([])
  })
})

describe('a fresh opening in the evals (S3.4, S3.5, S3.6)', () => {
  const turns: Case['turns'] = [
    { role: 'user', text: 'What did Brad build at Hopper?' },
    { role: 'assistant', text: 'At Hopper, Brad launched the flow.' },
  ]

  test('S3.4 S3.5 an answer that opens as an earlier answer in its case fails “a fresh opening”, with no words in its detail', () => {
    const c: Case = { ...CASE, turns }
    expect(failing(c, { text: 'At Hopper, Brad launched RemoteUI too.' })).toEqual(['a fresh opening'])
    expect(failing(c, { text: 'Brad also co-architected RemoteUI at Hopper.' })).toEqual([])
    const check = checkAnswer(c, asked('At Hopper, Brad launched it.'), NAMES).find((each) => each.name === 'a fresh opening')
    expect(check).toMatchObject({ kind: 'safety', pass: false, detail: 'found' })
    // A case with no earlier answer has nothing to repeat.
    expect(checkAnswer(CASE, asked('At Hopper, Brad did it.'), NAMES).some((each) => each.name === 'a fresh opening')).toBe(false)
  })

  test('S3.6 the evals stay off, so nothing here reaches a model', () => {
    const root = path.resolve(import.meta.dirname, '..', '..', '..')
    expect(evalsOff((file) => readFileSync(path.join(root, file), 'utf8'))).toBe(true)
  })
})

describe('the voice run (S4.1, S4.2, FR-005)', () => {
  test('S4.1 FR-005 the run asks the 14 scenarios, three common questions three times, then a five-turn conversation', () => {
    expect(VOICE_QUESTIONS).toHaveLength(14)
    expect(VOICE_REPEATS).toEqual([
      'How does Brad ship with AI agents?',
      'What’s the best thing about Brad’s work?',
      'Walk me through Brad’s career',
    ])
    expect(VOICE_TIMES).toBe(3)
    expect(VOICE_CONVERSATION).toEqual([
      'hi',
      'What did Brad build at Hopper?',
      'What AI features has Brad shipped?',
      'Is Brad a good engineer?',
      'What role is Brad looking for?',
    ])
  })

  test('S4.1 S3.1 S3.2 S3.3 S4.4 FR-005 each reply gets its group, the earlier turns, and the scripting checks', async () => {
    const calls: { turns: number; question: string }[] = []
    const scripted = new Set(['Write a Python function that reverses a string.'])
    let n = 0
    const replies = await runVoice(async (turns, question) => {
      calls.push({ turns: turns.length, question })
      n++
      if (question === 'What salary does Brad want?') return asked(`Fair question. ${BOUNDARY}`, { state: 'boundary', sources: [] })
      if (scripted.has(question)) return asked('Nice try. Brad launched the flow.')
      // The same opening for each ask of the open question, and for two turns of the conversation.
      if (question === 'What’s the best thing about Brad’s work?') return asked('Brad has shipped a lot, including the flow.')
      if (question === 'What AI features has Brad shipped?' || question === 'Is Brad a good engineer?')
        return asked(`At Hopper, Brad did thing ${n}.`, question === 'Is Brad a good engineer?' ? { sources: [] } : {})
      return asked(`Reply number ${n}, about Brad.`)
    }, NAMES)

    expect(replies).toHaveLength(14 + 9 + 5)
    expect(replies.map((reply) => reply.group)).toEqual([
      ...Array<string>(14).fill('scenario'),
      ...Array<string>(9).fill('repeat'),
      ...Array<string>(5).fill('conversation'),
    ])
    expect(replies.slice(14, 23).map((reply) => reply.id)).toEqual(['R1.1', 'R1.2', 'R1.3', 'R2.1', 'R2.2', 'R2.3', 'R3.1', 'R3.2', 'R3.3'])
    expect(replies.slice(23).map((reply) => reply.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5'])
    // Only the conversation carries earlier turns, two for each earlier question.
    expect(calls.slice(0, 23).every((call) => call.turns === 0)).toBe(true)
    expect(calls.slice(23).map((call) => call.turns)).toEqual([0, 2, 4, 6, 8])

    const failed = (reply: VoiceReply | undefined) => reply?.checks.filter((check) => !check.pass).map((check) => check.name)
    const byId = (id: string) => replies.find((reply) => reply.id === id)
    expect(failed(byId('S5'))).toEqual(['no scripted phrase'])
    expect(failed(byId('S9'))).toEqual([])
    expect(failed(byId('R2.1'))).toEqual([])
    expect(failed(byId('R2.2'))).toEqual(['a fresh opening'])
    expect(failed(byId('R2.3'))).toEqual(['a fresh opening'])
    expect(failed(byId('R1.2'))).toEqual([])
    expect(failed(byId('C3'))).toEqual([])
    // C4 opens as C3 did, and cites nothing.
    expect(failed(byId('C4'))).toEqual(['a fresh opening', 'cites a fact'])
    expect(byId('C1')?.checks.some((check) => check.name === 'cites a fact')).toBe(false)
  })

  test('S4.2 S3.5 the record lists every opening that starts more than one reply anywhere in the run', () => {
    const reply = (id: string, text: string) => ({ id, text }) as VoiceReply
    expect(
      repeatedOpenings([
        reply('S1', 'Here’s the good part: one.'),
        reply('S2', 'Brad shipped it again.'),
        reply('R1.1', "Here's the good part: two."),
        reply('C2', 'Here’s the good part — three.'),
        reply('C3', 'Brad shipped it again, too.'),
        reply('C4', 'Hi!'),
      ]),
    ).toEqual([
      { opening: "here's the good part", ids: ['S1', 'R1.1', 'C2'] },
      { opening: 'brad shipped it again', ids: ['S2', 'C3'] },
    ])
  })
})
