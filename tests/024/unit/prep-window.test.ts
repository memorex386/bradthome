import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { PREP_QUESTIONS, QUESTIONS_PER_DAY } from '../../../apps/chat-api/src/constants.ts'
import { notesOf } from '../../../apps/chat-api/src/prep-shape.ts'
import { apiTransport, refusalOf } from '../../../apps/site/src/components/chat/api.ts'
import { PREP_ANSWER, PREP_META, ROLE_ANSWER } from '../../../apps/site/src/components/chat/prep-fixtures.ts'
import { eventOf } from '../../../apps/site/src/components/chat/stream.ts'
import { PREP } from '../../../apps/site/src/components/chat/words.ts'
import { withoutPrep } from '../../../apps/site/src/components/evals/evals.ts'
import { SECTIONS } from '../../../apps/site/src/components/privacy/privacy.ts'
import { harness, NEXT } from '../../021/helpers/fakes.ts'
import { ANSWER, chunksOf, POSTING } from '../helpers/prep.ts'

// Spec 024: the window's prep pieces that need no browser or build: the
// stream's prep parts, the transport, the notes, the words and the privacy
// note. The held states, drawn on the server, are checked in the built
// gallery (integration/build.test.ts), and the browser's own checks are in
// e2e/prep.test.ts.

/** The notes in prep's words, as Prep.tsx's prepNotes writes them. */
const prepNotes = (answer: typeof PREP_ANSWER) =>
  notesOf(answer, { matches: PREP.matchesPlain, gaps: PREP.gaps, questions: PREP.questions, inferred: PREP.inferred })

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

describe('the stream and the transport', () => {
  test('S5.4 the reader takes prep’s progress, its result and its numbers, and fails a malformed result', () => {
    expect(eventOf(JSON.stringify({ type: 'data-prep-progress', data: { requirements: 3, matches: 1, gaps: 0, questions: 0 } }))).toEqual({
      type: 'prep-progress',
      progress: { requirements: 3, matches: 1, gaps: 0, questions: 0 },
    })
    expect(eventOf(JSON.stringify({ type: 'data-prep', data: PREP_ANSWER }))).toEqual({ type: 'prep', answer: PREP_ANSWER })
    expect(eventOf(JSON.stringify({ type: 'data-prep', data: { ...PREP_ANSWER, matches: [{ requirement: 1 }] } }))).toEqual({
      type: 'error',
    })
    // An answered fit's numbers read as the chat's; prep's own states read as prep's, and the window takes either.
    expect(eventOf(JSON.stringify({ type: 'data-meta', data: PREP_META }))).toEqual({ type: 'meta', meta: PREP_META })
    const noFit = { ...PREP_META, state: 'no-fit' }
    expect(eventOf(JSON.stringify({ type: 'data-meta', data: noFit }))).toEqual({ type: 'prep-meta', meta: noFit })
  })

  test('S5.3 a limit refusal with questions left is prep’s limit; with none it switches the chat off', () => {
    expect(refusalOf(429, { state: 'limit', left: 2, resetsAt: 'x' })).toEqual({ kind: 'prep-limit', left: 2, resetsAt: 'x' })
    expect(refusalOf(429, { state: 'limit', left: 0 })).toEqual({ kind: 'off', off: { kind: 'limit' } })
  })

  test('S2.1 S6.2 the transport solves the check, then posts the posting to /prep in the body only, against the real API', async () => {
    const h = harness({ script: { text: chunksOf(ANSWER) } })
    const urls: string[] = []
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      urls.push(url.href)
      const headers = new Headers(init?.headers)
      headers.set('origin', NEXT)
      return h.app.request(url.pathname, { method: init?.method ?? 'GET', headers, body: init?.body ?? null })
    }) as typeof fetch
    let checked = 0
    const outcome = await apiTransport('https://api.test', fetcher, NEXT).prep?.(POSTING, new AbortController().signal, () => checked++)
    expect(checked).toBe(1)
    expect(outcome?.kind).toBe('stream')
    const kinds: string[] = []
    if (outcome?.kind === 'stream') for await (const event of outcome.events) kinds.push(event.type)
    expect(kinds).toContain('prep')
    expect(kinds.at(-1)).toMatch(/^(?:prep-)?meta$/)
    expect(urls).toEqual(['https://api.test/challenge', 'https://api.test/prep'])
  })
})

describe('/evals in a release build', () => {
  test('S9.1 SC-006 a release build’s /evals leaves prep’s suites and cases out, and counts only the chat’s', () => {
    const chat = { id: 'facts-a', suite: 'facts', pass: true, safe: true } as never
    const prep = { id: 'prep-a', suite: 'prep-fit', pass: false, safe: true } as never
    const run = {
      totals: {
        cases: 2,
        passed: 1,
        safe: 2,
        accuracy: { cases: 1, passed: 1, allowedMisses: 1 },
        prepAccuracy: { cases: 1, passed: 0, allowedMisses: 1 },
        prepCostUsd: 0.01,
      },
      prepLimits: { costUsd: 0.01, ms: 30_000 },
      suites: [{ id: 'facts' }, { id: 'prep-fit' }],
      cases: [chat, prep],
    } as never
    const shown = withoutPrep(run)
    expect(JSON.stringify(shown)).not.toMatch(/prep/i)
    expect(shown.totals).toMatchObject({ cases: 1, passed: 1, safe: 1 })
  })
})

describe('notes and words', () => {
  test('S4.4 the notes hold the role, the matches with their links, the gaps and the questions as plain text', () => {
    const notes = prepNotes(PREP_ANSWER)
    expect(notes.split('\n')[0]).toBe(PREP_ANSWER.role)
    expect(notes).toContain('Strong matches (5 of 8)')
    expect(notes).toContain('  Essay · New features ship dark: https://bradthome.com/vindecoded-agents#new-features-ship-dark')
    expect(notes).toContain(`- ${PREP_ANSWER.gaps[0]}`)
    expect(notes).toContain(`1. ${PREP_ANSWER.questions[0]}`)
    expect(prepNotes(ROLE_ANSWER).split('\n')[1]).toBe(PREP.inferred)
    expect(notesOf({ ...PREP_ANSWER, state: 'not-a-posting' }, { matches: '', gaps: '', questions: '', inferred: '' })).toBe('')
  })

  test('FR-012 every prep word calls Brad Brad', () => {
    const words = JSON.stringify(PREP, (_key, value: unknown) => (typeof value === 'function' ? String(value) : value))
    expect(words).not.toMatch(/\b(?:he|him|his)\b/i)
    expect(readFileSync(path.join(ROOT, 'apps', 'site', 'src', 'components', 'chat', 'example.ts'), 'utf8')).not.toMatch(
      /\b(?:he|him|his)\b/i,
    )
  })

  test('S6.3 FR-008 nothing in the window stores, logs or counts a posting', () => {
    for (const file of ['Prep.tsx', 'ChatWindow.tsx', 'api.ts', 'prep-fixtures.ts', 'example.ts']) {
      const text = readFileSync(path.join(ROOT, 'apps', 'site', 'src', 'components', 'chat', file), 'utf8')
      expect(text, file).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|console\.|umami|track\(/)
    }
  })

  test('S6.4 FR-011 the privacy note says a posting goes to Anthropic for one answer, isn’t stored or logged, and counts as 3', () => {
    const chat = SECTIONS.find((section) => section.id === 'chat')
    const prep = chat?.items?.find((item) => item.includes('Interview prep')) ?? ''
    expect(prep).toMatch(/Anthropic for that one answer/)
    expect(prep).toMatch(/isn’t stored or logged/)
    expect(prep).toContain(`${PREP_QUESTIONS} of your ${QUESTIONS_PER_DAY} questions`)
    expect(prep).not.toMatch(/\b(?:he|him|his)\b/i)
  })
})
