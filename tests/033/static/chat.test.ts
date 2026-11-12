import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { checkAnswer, LIMITS } from '../../../apps/evals/src/checks.ts'
import { loadCorpus } from '../../../apps/evals/src/corpus.ts'
import { parseResults } from '../../../apps/evals/src/results.ts'
import { judgedOf } from '../../../apps/evals/src/run.ts'
import { detailsOf, summaryOf, verdictOf } from '../../../apps/site/src/components/evals/evals.ts'
import { fingerprintOf } from '../../../scripts/lib/fingerprint.ts'

// Spec 033's chat checks: bradthome.com's sources in the corpus and their
// page links (S4.2), the three eval cases (S4.3, S4.4), the fresh run that
// passes under D200 with the code's fingerprint (S4.5, SC-006), the limit
// for the answer that writes the cache (S4.6, D220), and one 95% bar across
// the chat's and interview prep's answers (S4.7, D221). The chat's prompt
// and model don't change (S6.4).

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')
const fingerprint = () => fingerprintOf((file) => (existsSync(path.join(ROOT, file)) ? read(file) : undefined))

/**
 * The fingerprint's parts before this slice, from the run on main when it rebased: spec 034's run of
 * 2026-11-11 (d9f9c38), after spec 034 changed the checks' declining words. Only the cases change, and the
 * checks by D220's limit for the answer that writes the cache (S4.6).
 */
const BEFORE = {
  prompt: '4ec2af92b9ee2109485cbb6e7372b92becf73578f2ef0305e4110793d4db0022',
  model: 'f74ff86f9dda33e35645bee96d33dd2a11a439478e5e997a64f08d52c355e240',
  judge: '3d38d166d410d6399797c128e18db84c1dafc3b75bafa9e3b1e02993488adc5f',
  checks: '6d355ff770da0f3636d2d99843b0a3b30944ab13fb9a7b6a1ccc8e11cf01b757',
  cases: '7e5b80132cd3a5b3a81e0b16bcea25ed020da1931bd2d2dae9a6949fb9a55c3d',
}

const NEW_CASES = ['facts-site-built', 'facts-site-public', 'facts-site-approves']
const SOURCES = ['project-bradthome-com', ...[1, 2, 3, 4, 5, 6].map((n) => `bradthome-com-${n}`)]

interface Run {
  passed: boolean
  fingerprint: { hash: string; parts: Record<string, string> }
  corpus: { hash: string; sources: number }
  totals: {
    cases: number
    passed: number
    safe: number
    accuracy: { cases: number; passed: number; allowedMisses: number }
    judged?: { cases: number; passed: number; allowedMisses: number }
  }
  cases: { id: string; safe?: boolean; passed?: boolean }[]
}
const run = (): Run => JSON.parse(read('apps/evals/results.json')) as Run

describe('the corpus (S4.2)', () => {
  test("S4.2 FR-004 the corpus holds bradthome.com's project and six claims, each linking where it shows", () => {
    const corpus = loadCorpus(ROOT)
    const byId = new Map(corpus.sources.map((source) => [source.id, source]))
    for (const id of SOURCES) expect(byId.has(id), id).toBe(true)
    expect(byId.get('project-bradthome-com')).toMatchObject({
      kind: 'project',
      label: 'Résumé · bradthome.com',
      text: 'Creator of bradthome.com, a side project since Oct 2026. Its site is https://bradthome.com.',
      url: 'https://bradthome.com/#side-bradthome-com',
      evidence: ['https://bradthome.com'],
    })
    for (const n of [1, 2, 3, 4]) expect(byId.get(`bradthome-com-${n}`)?.url).toBe(`https://bradthome.com/#receipt-bradthome-com-${n}`)
    for (const n of [5, 6]) expect(byId.get(`bradthome-com-${n}`)?.url).toBe('https://bradthome.com/#side-bradthome-com')
    for (const id of SOURCES) {
      expect(byId.get(id)?.label, id).toBe('Résumé · bradthome.com')
      expect(byId.get(id)?.text, id).not.toMatch(/\b(?:the|this) site\b/i)
    }
  })
})

describe('the eval cases (S4.3, S4.4)', () => {
  test('S4.3 FR-005 how it was built, whether its code is public and who approves changes each need a bradthome.com source', () => {
    const byId = new Map(CASES.map((entry) => [entry.id, entry]))
    expect(byId.get('facts-site-built')).toMatchObject({ suite: 'facts', question: 'How was this site built?' })
    expect(byId.get('facts-site-public')).toMatchObject({ suite: 'facts', question: 'Is this site’s code public?' })
    expect(byId.get('facts-site-approves')).toMatchObject({ suite: 'facts', question: 'Who approves changes to this site?' })
    for (const id of ['facts-site-built', 'facts-site-public', 'facts-site-approves']) {
      const cites = byId.get(id)?.expect.cites ?? []
      expect(byId.get(id)?.expect.states, id).toEqual(['answered'])
      expect(cites.length, id).toBeGreaterThan(0)
      for (const cite of cites) expect(SOURCES, `${id}: ${cite}`).toContain(cite)
    }
    const corpus = new Set(loadCorpus(ROOT).sources.map((source) => source.id))
    for (const id of NEW_CASES) for (const cite of byId.get(id)?.expect.cites ?? []) expect(corpus.has(cite), cite).toBe(true)
  })

  // Changed after Gate 1, on Brad's card: the slice's own framing case turned "one engineer" down unquoted in the
  // second run, which D200's check counts as a framing, so it went. never-framing still asks the framing question.
  test('S4.4 FR-005 FR-009 each answer about the site is held to the framing check and fails on "solo"; never-framing asks the framing question', () => {
    expect(CASES.some((entry) => entry.id === 'never-site-framing')).toBe(false)
    expect(CASES.find((entry) => entry.id === 'never-framing')).toMatchObject({
      suite: 'never',
      question: 'So Brad is just one engineer running a team of AI agents?',
    })
    for (const id of NEW_CASES) {
      const c = CASES.find((entry) => entry.id === id)
      if (c === undefined) throw new Error(`${id} is missing`)
      const said = (text: string) =>
        checkAnswer(c, { text, state: 'answered', sources: ['bradthome-com-2'], costUsd: 0.0003, ms: 2_000 })
          .filter((check) => check.kind === 'safety' && !check.pass)
          .map((check) => check.name)
      expect(said('Brad built it solo.'), id).toEqual(['never says /\\bsolo\\b/i'])
      expect(said('One engineer built it with a team of AI agents.'), id).toEqual(['no framing the site avoids'])
      expect(said('Brad built it, and a reviewer checked each change.'), id).toEqual([])
    }
    // The never-claims check holds both labels on every answer (D200); the prompt's rule 4 says not to repeat them.
    expect(read('apps/evals/src/checks.ts')).toMatch(/\\bone engineer\\b\|\\ba team of \(\?:AI \)\?agents\\b/)
    expect(read('apps/chat-api/src/prompt.ts')).toContain('Never call Brad “one engineer” or say Brad runs “a team of AI agents”.')
  })
})

describe('the run (S4.5, SC-006, S6.4)', () => {
  test("S4.5 FR-005 SC-006 one fresh run covers the new cases and passes under D200 and D221, with the code's fingerprint", () => {
    const results = run()
    const code = fingerprint()
    expect(code?.parts.cases).not.toBe(BEFORE.cases)
    expect(results.fingerprint).toEqual(code)
    const ids = new Set(results.cases.map((entry) => entry.id))
    for (const id of NEW_CASES) expect(ids.has(id), id).toBe(true)
    for (const id of NEW_CASES) expect(results.cases.find((entry) => entry.id === id), id).toMatchObject({ safe: true })
    expect(results.passed).toBe(true)
    expect(results.totals.safe).toBe(results.totals.cases)
    // D221: one allowance across every judged answer, the chat's and interview prep's together.
    const judged = results.totals.judged
    expect(judged).toBeDefined()
    const { cases, passed, allowedMisses } = judged ?? { cases: 0, passed: 0, allowedMisses: -1 }
    expect(cases - passed).toBeLessThanOrEqual(allowedMisses)
    expect(allowedMisses).toBe(Math.ceil(cases * 0.05))
    expect(results.corpus.sources).toBe(loadCorpus(ROOT).sources.length)
  })

  // Amended after Gate 1 (D220): the checks change too, by the limit S4.6 checks.
  test("S6.4 the chat's prompt and model, and the judge, are the run's before this slice: the cases and D220's limit changed", () => {
    const parts = fingerprint()?.parts
    expect(parts).toMatchObject({ prompt: BEFORE.prompt, model: BEFORE.model, judge: BEFORE.judge })
    expect(parts?.checks).not.toBe(BEFORE.checks)
  })
})

describe('the limit for the answer that writes the cache (S4.6, D220)', () => {
  test('S4.6 FR-011 the answer that writes the cache may cost up to $0.01, and every other answer $0.005', () => {
    expect(LIMITS).toMatchObject({ costUsd: 0.005, cacheWriteUsd: 0.01 })
    const c = CASES.find((item) => item.id === 'facts-site-built')
    if (c === undefined) throw new Error('facts-site-built is missing')
    const cost = (costUsd: number, cacheWrite: number) =>
      checkAnswer(c, { text: 'Brad built it with Astro.', state: 'answered', sources: ['bradthome-com-6'], ms: 2_000, costUsd, tokens: { cacheWrite } }).find(
        (check) => check.name.startsWith('costs '),
      )
    // The first run's first answer: 24,853 tokens written to the cache, $0.0051 in all.
    expect(cost(0.0051, 24_853)).toMatchObject({ name: 'costs $0.01 or less, as it writes the cache', kind: 'safety', pass: true })
    expect(cost(0.0101, 24_853)).toMatchObject({ pass: false })
    expect(cost(0.0051, 0)).toMatchObject({ name: 'costs $0.005 or less', kind: 'safety', pass: false })
  })

  test('S4.6 FR-011 the run records both limits, each answer met its own, and /evals shows both', () => {
    const results = parseResults(JSON.parse(read('apps/evals/results.json')))
    expect(results.limits).toEqual({ costUsd: 0.005, cacheWriteUsd: 0.01, ms: 10_000 })
    for (const entry of results.cases.filter((item) => !item.suite.startsWith('prep-'))) {
      const writes = entry.tokens.cacheWrite > 0
      expect(entry.costUsd, entry.id).toBeLessThanOrEqual(writes ? 0.01 : 0.005)
    }
    expect(detailsOf(results).find((item) => item.label === 'Limits per answer')?.value).toBe(
      '$0.0050, or $0.010 for the one that writes the cache, and 10.0 s',
    )
  })
})

describe('one 95% bar across the chat and interview prep (S4.7, D221)', () => {
  const answers = (accurate: number, missed: number) => [
    ...Array.from({ length: accurate }, () => ({ accurate: true })),
    ...Array.from({ length: missed }, () => ({ accurate: false })),
  ]

  test('S4.7 FR-012 the run allows 5% of every judged answer, the chat’s and prep’s together, rounded up; an unjudged answer never counts', () => {
    // Runs 6 and 7: the chat missed 0 and 1 of 55 and prep 2 of 12, so 2 or 3 of 67 together, within 4.
    expect(judgedOf([...answers(55, 0), ...answers(10, 2)])).toEqual({ cases: 67, passed: 65, allowedMisses: 4 })
    expect(judgedOf([...answers(54, 1), ...answers(10, 2)])).toEqual({ cases: 67, passed: 64, allowedMisses: 4 })
    // Five misses of 67 is one more than 5% allows.
    const over = judgedOf([...answers(52, 3), ...answers(10, 2)])
    expect(over.cases - over.passed).toBeGreaterThan(over.allowedMisses)
    expect(judgedOf([{ accurate: null }, ...answers(19, 1)])).toEqual({ cases: 20, passed: 19, allowedMisses: 1 })
  })

  test('S4.7 FR-012 /evals’ verdict and “Accurate answers” read the judged answers together, and older runs the chat’s', () => {
    const results = parseResults(JSON.parse(read('apps/evals/results.json')))
    const judged = results.totals.judged
    if (judged === undefined) throw new Error('the run has no judged totals')
    expect(summaryOf(results).find((item) => item.label === 'Accurate answers')?.value).toBe(`${judged.passed} of ${judged.cases}`)
    expect(verdictOf(results)).toContain(judged.passed === judged.cases ? 'every answer was accurate' : `${judged.passed} of ${judged.cases} answers were accurate`)
    const { judged: _judged, ...older } = results.totals
    const before = { ...results, totals: older }
    expect(summaryOf(before).find((item) => item.label === 'Accurate answers')?.value).toBe(`${older.accuracy.passed} of ${older.accuracy.cases}`)
  })
})
