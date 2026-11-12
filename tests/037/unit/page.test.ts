import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parseResults, type Results } from '../../../apps/evals/src/results.ts'
import { CHANGED_RUN, HOW, sinceNoteOf, sinceOf, triesOf } from '../../../apps/site/src/components/evals/evals.ts'

// Spec 037's /evals (Story 6, S4.2): the note under the verdict naming what
// changed in the code since the run, the changed run that covers new and
// edited cases, a retried case's tries, and two lines of "How it works".

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')
const RUN = parseResults(JSON.parse(read('apps', 'evals', 'results.json')))
const PARTS = ['prompt', 'model', 'judge', 'checks', 'cases'] as const

/** The code's fingerprint, with the named parts differing from the run's. */
const codeWith = (...changed: (typeof PARTS)[number][]) => ({
  parts: Object.fromEntries(PARTS.map((part) => [part, changed.includes(part) ? 'f'.repeat(64) : RUN.fingerprint.parts[part]])) as Results['fingerprint']['parts'],
})

const changedRun = (over: Partial<Results> = {}): Results => ({
  ...RUN,
  mode: 'changed',
  runAt: '2026-11-13T15:04:05Z',
  runUrl: 'https://github.com/memorex386/bradthome/actions/runs/1',
  fingerprint: { hash: 'a'.repeat(64), parts: { ...RUN.fingerprint.parts, cases: 'f'.repeat(64) } },
  cases: [],
  passed: true,
  ...over,
})

describe('the note under the verdict (S6.1–S6.3)', () => {
  test('S6.3 FR-007 no note when the code’s fingerprint is the run’s, or there is no code to compare', () => {
    expect(sinceOf(RUN, { parts: RUN.fingerprint.parts })).toBeUndefined()
    expect(sinceOf(RUN, undefined)).toBeUndefined()
  })

  test('S6.1 FR-007 SC-004 names exactly the parts that differ, in the fingerprint’s order', () => {
    for (const part of PARTS) expect(sinceOf(RUN, codeWith(part))?.parts).toEqual([`the ${part}`])
    expect(sinceNoteOf({ parts: ['the checks'] })).toBe('Since this run, the checks changed.')
    expect(sinceNoteOf(sinceOf(RUN, codeWith('checks', 'prompt')) ?? { parts: [] })).toBe('Since this run, the prompt and the checks changed.')
    expect(sinceNoteOf(sinceOf(RUN, codeWith('cases', 'checks', 'model')) ?? { parts: [] })).toBe(
      'Since this run, the model, the checks and the cases changed.',
    )
  })

  test('S6.2 FR-007 names a passing changed run that matches the code’s cases, with its date and log, and no other', () => {
    const code = codeWith('checks', 'cases')
    expect(sinceOf(RUN, code, changedRun())).toEqual({
      parts: ['the checks', 'the cases'],
      changed: { date: 'November 13, 2026', href: 'https://github.com/memorex386/bradthome/actions/runs/1' },
    })
    expect(CHANGED_RUN).toBe('The new and edited questions passed their own run on')
    expect(sinceOf(RUN, code, changedRun({ passed: false }))?.changed).toBeUndefined()
    const other = changedRun({ fingerprint: { hash: 'a'.repeat(64), parts: { ...RUN.fingerprint.parts, cases: 'e'.repeat(64) } } })
    expect(sinceOf(RUN, code, other)?.changed).toBeUndefined()
    // With the cases unchanged since the full run, a changed run has nothing to cover.
    expect(sinceOf(RUN, codeWith('checks'), changedRun())?.changed).toBeUndefined()
  })
})

describe('a retried case, and how it works (S4.2, S6.4)', () => {
  test('S4.2 FR-007 a retried case reads “Passed on the second try” or “Failed twice” under its title; a case asked once reads nothing more', () => {
    const [item] = RUN.cases
    if (item === undefined) throw new Error('the run has no cases')
    const failed = [{ name: 'the judge finds it supported', kind: 'accuracy' as const, pass: false, detail: 'unsupported' }]
    expect(triesOf({ ...item, retried: undefined })).toBeUndefined()
    expect(triesOf({ ...item, pass: true, retried: { failed } })).toBe('Passed on the second try')
    expect(triesOf({ ...item, pass: false, retried: { failed } })).toBe('Failed twice')
    const page = read('apps', 'site', 'src', 'pages', 'evals.astro')
    expect(page).toMatch(/<span class="evals__case-title">\s*\{item\.title\}\s*\{item\.retried && <span class="ds-small evals__tries">\{triesOf\(item\)\}<\/span>\}/)
    expect(page).toMatch(/First try<\/p>[\s\S]*item\.retried\.failed\.map/)
    expect(page).toContain("{item.retried ? 'Second try' : 'Checks'}")
  })

  test('S6.4 FR-007 “How it works” says a failing question is asked once more, then what must pass before the site and the chat', () => {
    expect(HOW.at(-2)).toBe('A question that fails is asked once more. Both tries are shown, and the second decides it.')
    expect(HOW.at(-1)).toBe(
      'A new or edited question must pass its own run before it reaches the site, and a change to the prompt or the model must pass a full run before it reaches the chat.',
    )
    expect(HOW.join(' ')).not.toContain('can’t reach the site without a fresh run')
  })
})
