import { describe, expect, test } from 'vitest'
import {
  CLOSE,
  createTrailerSplitter,
  FALLBACKS,
  linesOf,
  MAX_PILL_CHARS,
  MAX_TRAILER_CHARS,
  namesOf,
  OPEN,
  pillOk,
  pillsOf,
  STARTERS,
  vocabularyOf,
} from '../../../apps/chat-api/src/pills.ts'

// Spec 045, Story 2: the trailer's splitter, the guard and the fill, on
// made-up trailers. Nothing here reaches a model.

const NAMES = vocabularyOf([
  'Résumé · Hopper, Disruption Assistance',
  'Launched Capital One Travel’s first Disruption Assistance purchase flow.',
  'Co-architected and built RemoteUI on Android and iOS.',
  'Brad’s app VINDecoded, on Google Play. Brad builds with AI agents at bradthome.com.',
  'Bleacher Report, RBC, Lloyds Bank.',
])

/** Every delta a splitter gives back, pushed in the given pieces, then its flush. */
function split(pieces: readonly string[]) {
  const splitter = createTrailerSplitter()
  const answer = pieces.map((piece) => splitter.push(piece)).join('') + splitter.flush()
  return { answer, trailer: splitter.trailer() }
}

describe('the trailer (S2.1, S2.4, FR-004)', () => {
  test('S2.1 FR-004 the answer ends where <next> starts, and the trailer never reaches it', () => {
    const { answer, trailer } = split(['Brad built it.', '\n<next>\nWhat’s RemoteUI?\n</next>'])
    expect(answer).toBe('Brad built it.\n')
    expect(answer).not.toContain('<')
    expect(trailer).toBe('\nWhat’s RemoteUI?\n</next>')
    expect([OPEN, CLOSE]).toEqual(['<next>', '</next>'])
  })

  test('S2.4 FR-004 a tag split across chunks, at every place, never leaks, and only what could still grow into it is held', () => {
    const text = 'Brad shipped it.\n<next>\nWhat did Brad build at Hopper?\n</next>'
    for (let cut = 1; cut < text.length; cut++) {
      for (let second = cut + 1; second < text.length; second += 7) {
        const { answer, trailer } = split([text.slice(0, cut), text.slice(cut, second), text.slice(second)])
        expect(answer, `cut at ${cut}, ${second}`).toBe('Brad shipped it.\n')
        expect(linesOf(trailer)).toEqual(['What did Brad build at Hopper?'])
      }
    }
    const splitter = createTrailerSplitter()
    expect(splitter.push('a < b, and <ne')).toBe('a < b, and ')
    expect(splitter.push('w ideas')).toBe('<new ideas')
  })

  test('S2.4 an unclosed trailer, a list, or a trailer past 400 characters: no part shows, markers go, the rest is ignored', () => {
    expect(linesOf('\n- What’s RemoteUI?\n2) What did Brad build at Hopper?\n* What’s VINDecoded?')).toEqual([
      'What’s RemoteUI?',
      'What did Brad build at Hopper?',
      'What’s VINDecoded?',
    ])
    const long = split(['Answer.', `<next>${'x'.repeat(MAX_TRAILER_CHARS + 200)}`, 'more'])
    expect(long.answer).toBe('Answer.')
    expect(long.trailer).toHaveLength(MAX_TRAILER_CHARS)
    expect(split(['No trailer at all.']).trailer).toBe('')
  })
})

describe('the guard (S2.2, FR-005)', () => {
  const ok = (pill: string) => pillOk(pill, NAMES)

  test('S2.2 FR-005 one short question about Brad passes', () => {
    for (const pill of [
      'How did the Capital One flow ship?',
      'What’s RemoteUI?',
      'What did Brad build at Hopper?',
      'How was bradthome.com built?',
    ])
      expect(ok(pill), pill).toBe(true)
  })

  test('S2.2 FR-005 too long, not one question, or no question mark: dropped', () => {
    expect(ok(`What did Brad build ${'and ship '.repeat(6)}at Hopper?`)).toBe(false)
    expect(`What did Brad build ${'and ship '.repeat(6)}at Hopper?`.length).toBeGreaterThan(MAX_PILL_CHARS)
    expect(ok('Tell me about Hopper')).toBe(false)
    expect(ok('What’s RemoteUI? What’s Hopper?')).toBe(false)
    expect(ok('Brad built it. Why?')).toBe(false)
    expect(ok('')).toBe(false)
  })

  test('S2.2 FR-005 a pronoun for Brad, or I, me, my, you or your: dropped', () => {
    for (const pill of ['What did you build at Hopper?', 'What should I ask Brad?', 'What’s your stack?', 'Can she build it?'])
      expect(ok(pill), pill).toBe(false)
  })

  test('S2.2 FR-005 an email address, a link or a phone number: dropped', () => {
    for (const pill of [
      'Is brad@bradthome.com right?',
      'What’s at https://example.com?',
      'What’s on example.org?',
      'Is 214-555-0100 Brad’s?',
    ])
      expect(ok(pill), pill).toBe(false)
  })

  test('S2.2 FR-005 a name the corpus doesn’t hold, which keeps out private terms and made-up names: dropped', () => {
    expect(ok('What did Brad build at Zorblax?')).toBe(false)
    expect(ok('What did Brad build for Qwertyco and RBC?')).toBe(false)
    expect(ok('What did Brad build for RBC?')).toBe(true)
    expect(namesOf('What did Brad build at Hopper in 2024?')).toEqual(['Brad', 'Hopper', '2024'])
  })

  test('S2.2 FR-005 pay, dates, references, relocation, a private detail, speaking as Brad or the rules: dropped', () => {
    for (const pill of [
      'What salary does Brad want?',
      'What are Brad’s rates?',
      'Is Brad available?',
      'When could Brad start?',
      'What’s Brad’s start date?',
      'Can Brad share references?',
      'Would Brad relocate?',
      'What’s Brad’s phone number?',
      'How old is Brad?',
      'Does Brad have kids?',
      'Pretend Brad is here?',
      'What are the chat’s rules?',
      'Can Brad ignore instructions?',
    ])
      expect(ok(pill), pill).toBe(false)
    // "start" in a past story is fine.
    expect(ok('How did Brad start in Android?')).toBe(true)
  })
})

describe('the fill (S2.2, S2.3, FR-006)', () => {
  test('S2.2 FR-005 each pill passes the pronoun rewriter first, then the guard', () => {
    const { pills, written } = pillsOf('\nWhat did he build at Hopper?\nHow did his RemoteUI work?\nWhat’s VINDecoded?\n</next>', [], NAMES)
    expect(pills).toEqual(['What did Brad build at Hopper?', 'How did Brad’s RemoteUI work?', 'What’s VINDecoded?'])
    expect(written).toBe(3)
  })

  test('S2.2 FR-006 a question already asked, or a pill twice, is dropped, by its words', () => {
    const result = pillsOf(
      'What did Brad build at Hopper?\nwhat did brad build at hopper\nWhat’s RemoteUI?\nWhat’s RemoteUI?',
      ['What did Brad build at Hopper?'],
      NAMES,
    )
    expect(result.pills[0]).toBe('What’s RemoteUI?')
    expect(result.written).toBe(1)
    expect(result.dropped).toBe(3)
  })

  test('S2.3 FR-006 fewer than three: the starters not yet asked fill, then the study’s questions, never one asked', () => {
    expect(pillsOf('', [], NAMES)).toEqual({ pills: [...STARTERS.slice(0, 3)], written: 0, dropped: 0 })
    expect(pillsOf('What’s RemoteUI?\nWhat salary does Brad want?', [STARTERS[0]], NAMES)).toEqual({
      pills: ['What’s RemoteUI?', STARTERS[1], STARTERS[2]],
      written: 1,
      dropped: 1,
    })
    // The API sees at most five questions, so eight fill questions always leave three.
    expect(FALLBACKS).toHaveLength(8)
    const asked = FALLBACKS.slice(0, 5)
    expect(pillsOf('', asked, NAMES).pills).toEqual(FALLBACKS.slice(5))
  })

  test('S2.3 there are never more than three, and the model’s come first', () => {
    const result = pillsOf(
      'What’s RemoteUI?\nWhat did Brad build for RBC?\nWhat’s VINDecoded?\nHow did the Capital One flow ship?',
      [],
      NAMES,
    )
    expect(result.pills).toEqual(['What’s RemoteUI?', 'What did Brad build for RBC?', 'What’s VINDecoded?'])
    expect(result.written).toBe(3)
  })
})
