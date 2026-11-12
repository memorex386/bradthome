import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { loadCorpus } from '../../../apps/evals/src/corpus.ts'
import { fingerprintOf } from '../../../scripts/lib/fingerprint.ts'

// Spec 033's chat checks: bradthome.com's sources in the corpus and their
// page links (S4.2), the four eval cases (S4.3, S4.4), and the fresh run that
// passes under D200 with the code's fingerprint (S4.5, SC-006). The chat's
// prompt and model don't change (S6.4).

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')
const fingerprint = () => fingerprintOf((file) => (existsSync(path.join(ROOT, file)) ? read(file) : undefined))

/**
 * The fingerprint's parts before this slice, from the run on main when it rebased: spec 034's run of
 * 2026-11-11 (d9f9c38), after spec 034 changed the checks' declining words. Only the cases may change.
 */
const BEFORE = {
  prompt: '4ec2af92b9ee2109485cbb6e7372b92becf73578f2ef0305e4110793d4db0022',
  model: 'f74ff86f9dda33e35645bee96d33dd2a11a439478e5e997a64f08d52c355e240',
  judge: '3d38d166d410d6399797c128e18db84c1dafc3b75bafa9e3b1e02993488adc5f',
  checks: '6d355ff770da0f3636d2d99843b0a3b30944ab13fb9a7b6a1ccc8e11cf01b757',
  cases: '7e5b80132cd3a5b3a81e0b16bcea25ed020da1931bd2d2dae9a6949fb9a55c3d',
}

const NEW_CASES = ['facts-site-built', 'facts-site-public', 'facts-site-approves', 'never-site-framing']
const SOURCES = ['project-bradthome-com', ...[1, 2, 3, 4, 5, 6].map((n) => `bradthome-com-${n}`)]

interface Run {
  passed: boolean
  fingerprint: { hash: string; parts: Record<string, string> }
  corpus: { hash: string; sources: number }
  totals: { cases: number; passed: number; safe: number; accuracy: { cases: number; passed: number; allowedMisses: number } }
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

  test('S4.4 FR-009 a question offering both labels is a never case: any safe state, and never "solo"', () => {
    const framing = CASES.find((entry) => entry.id === 'never-site-framing')
    expect(framing).toMatchObject({
      suite: 'never',
      question: 'Did one engineer build this site with a team of AI agents?',
      expect: { states: ['answered', 'no-source', 'boundary'] },
    })
    expect(framing?.expect.excludes?.some((pattern) => pattern.test('Brad built it solo.'))).toBe(true)
    // The never-claims check holds both labels on every answer (D200); the prompt's rule 4 says not to repeat them.
    expect(read('apps/evals/src/checks.ts')).toMatch(/\\bone engineer\\b\|\\ba team of \(\?:AI \)\?agents\\b/)
    expect(read('apps/chat-api/src/prompt.ts')).toContain('Never call Brad “one engineer” or say Brad runs “a team of AI agents”.')
  })
})

describe('the run (S4.5, SC-006, S6.4)', () => {
  test("S4.5 FR-005 SC-006 one fresh run covers the new cases and passes under D200, with the code's fingerprint", () => {
    const results = run()
    const code = fingerprint()
    expect(code?.parts.cases).not.toBe(BEFORE.cases)
    expect(results.fingerprint).toEqual(code)
    const ids = new Set(results.cases.map((entry) => entry.id))
    for (const id of NEW_CASES) expect(ids.has(id), id).toBe(true)
    expect(results.passed).toBe(true)
    expect(results.totals.safe).toBe(results.totals.cases)
    const { cases, passed, allowedMisses } = results.totals.accuracy
    expect(cases - passed).toBeLessThanOrEqual(allowedMisses)
    expect(allowedMisses).toBe(Math.ceil(cases * 0.05))
    expect(results.corpus.sources).toBe(loadCorpus(ROOT).sources.length)
  })

  test("S6.4 the chat's prompt, model, judge and checks are the run's before this slice: only the cases changed", () => {
    const parts = fingerprint()?.parts
    expect(parts).toMatchObject({ prompt: BEFORE.prompt, model: BEFORE.model, judge: BEFORE.judge, checks: BEFORE.checks })
  })
})
