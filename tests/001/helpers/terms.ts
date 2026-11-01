import { expect } from 'vitest'
import type { RunResult } from './run.ts'

// A made-up private-term list. None of these is a real term, and the tests
// never read Brad's own list.
export const MADE_UP_LIST = [
  "# Made-up private terms for spec 001's tests. None of them is real.",
  '# A line that starts with # is a comment, so quaggle is not a term.',
  '',
  'zorblax',
  'Quixmoor',
  'vellum kestrel',
  'digits:5555550147',
  '',
].join('\n')

/** How many terms MADE_UP_LIST holds. Comments and blank lines aren't terms. */
export const MADE_UP_TERM_COUNT = 4

/** The word terms, in lower case. */
export const MADE_UP_WORDS = ['zorblax', 'quixmoor', 'vellum kestrel'] as const

/** The digits entry. */
export const MADE_UP_DIGITS = '5555550147'

/** A word that's only in a comment line, so it isn't a term. */
export const COMMENTED_WORD = 'quaggle'

/** A list with nothing but comments and blank lines. */
export const EMPTY_LIST = '# Nothing here yet.\n\n'

/**
 * SC-002: no output stream shows a made-up term, in any letter case or
 * spacing, or the made-up digits in any format.
 */
export function expectNoTerm(result: Pick<RunResult, 'stdout' | 'stderr'>): void {
  for (const [stream, text] of [
    ['stdout', result.stdout],
    ['stderr', result.stderr],
  ] as const) {
    const flat = text.toLowerCase().replace(/\s+/g, ' ')
    for (const [index, word] of MADE_UP_WORDS.entries()) {
      expect(flat.includes(word), `${stream} shows made-up term ${index + 1}`).toBe(false)
    }
    const digitsOnly = text.replace(/[\s.\-()[\]+]/g, '')
    expect(digitsOnly.includes(MADE_UP_DIGITS), `${stream} shows the made-up digits`).toBe(false)
  }
}
