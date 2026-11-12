import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import type { Asked } from '../../../apps/evals/src/ask.ts'
import { CASES, type Case } from '../../../apps/evals/src/cases.ts'
import { loadCorpus } from '../../../apps/evals/src/corpus.ts'
import { PREP_CASES, type PrepCase } from '../../../apps/evals/src/prep-cases.ts'
import { parseResults } from '../../../apps/evals/src/results.ts'
import { caseHash, changedCases, createRunner } from '../../../apps/evals/src/run.ts'

// Spec 037's runs (D228): each case's hash, the changed run that asks only the
// new and edited cases, the one retry a failing case gets in either kind of
// run, and each kind's pass rule. A scripted asker and judge stand in for the
// real model, so nothing reaches the network.

const CORPUS = loadCorpus()
const FINGERPRINT = { hash: 'b'.repeat(64), parts: { prompt: 'c', model: 'd', judge: 'e', checks: 'f', cases: 'g' } }
const TOKENS = { input: 100, cacheRead: 0, cacheWrite: 0, output: 50 }
const SUPPORTED = JSON.stringify({ verdict: 'supported', reason: 'Each claim matches its source.' })
const UNSUPPORTED = JSON.stringify({ verdict: 'unsupported', reason: 'The answer goes beyond its source.' })

const FACT: Case = {
  id: 'facts-hopper-dates',
  suite: 'facts',
  title: 'When Brad was at Hopper',
  question: 'When did Brad work at Hopper?',
  expect: { states: ['answered'], cites: ['job-hopper'], includes: [/2022/] },
}

const answer = (over: Partial<Asked> = {}): Asked => ({
  text: 'Brad worked at Hopper from 2022.',
  state: 'answered',
  sources: ['job-hopper'],
  costUsd: 0.001,
  ms: 900,
  tokens: TOKENS,
  ...over,
})

/** A runner whose asker and judge reply in turn from their scripts, counting the calls. */
function scripted(verdicts: string[], mode?: 'full' | 'changed', answers: Asked[] = [answer()]) {
  const calls = { ask: 0, judge: 0, prep: 0 }
  const runner = createRunner({
    ask: async () => answers[Math.min(calls.ask++, answers.length - 1)] ?? answer(),
    judge: async () => ({ text: verdicts[Math.min(calls.judge++, verdicts.length - 1)] ?? SUPPORTED, costUsd: 0.004 }),
    askPrep: async () => {
      calls.prep += 1
      throw new Error('prep failed')
    },
    corpus: CORPUS,
    model: 'claude-haiku-5-5',
    fingerprint: FINGERPRINT,
    commit: 'a'.repeat(40),
    now: () => new Date('2026-11-12T18:00:00Z'),
    ...(mode === undefined ? {} : { mode }),
  })
  return { runner, calls }
}

describe("each case's hash (S1.1, S1.4)", () => {
  test('S1.1 FR-001 a case’s hash is a SHA-256 of its own definition, and any edit to its words, turns, expectations or patterns changes it', () => {
    const hash = caseHash(FACT)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(caseHash({ ...FACT, expect: { ...FACT.expect, includes: [/2022/] } })).toBe(hash)
    const edits: Case[] = [
      { ...FACT, question: 'When did Brad start at Hopper?' },
      { ...FACT, title: 'Brad at Hopper' },
      { ...FACT, turns: [{ role: 'user', text: 'Hi' }] },
      { ...FACT, expect: { ...FACT.expect, states: ['answered', 'no-source'] } },
      { ...FACT, expect: { ...FACT.expect, cites: ['job-hopper', 'hopper-role-and-dates-1'] } },
      // JSON drops a pattern's words, so the hash must not: its source and its flags both count.
      { ...FACT, expect: { ...FACT.expect, includes: [/2021/] } },
      { ...FACT, expect: { ...FACT.expect, includes: [/2022/i] } },
      { ...FACT, expect: { ...FACT.expect, excludes: [/salary/] } },
    ]
    for (const edit of edits) expect(caseHash(edit), JSON.stringify(edit, (_, v) => (v instanceof RegExp ? String(v) : v))).not.toBe(hash)
  })

  test('S1.1 FR-001 every case, the chat’s and prep’s, has a hash of its own', () => {
    const all: (Case | PrepCase)[] = [...CASES, ...PREP_CASES]
    expect(new Set(all.map(caseHash)).size).toBe(all.length)
  })

  test('S1.1 S1.4 FR-001 a changed run asks the cases with no hash in the last full run, or a different one; a removed case never, and a renamed one as new', () => {
    const recorded = CASES.map((c) => ({ id: c.id, hash: caseHash(c) }))
    expect(changedCases(CASES, recorded)).toEqual([])
    const [first, second] = CASES
    if (first === undefined || second === undefined) throw new Error('the cases are missing')
    // A new case, and one whose hash differs: both are asked.
    const edited = recorded.map((r) => (r.id === second.id ? { ...r, hash: 'f'.repeat(64) } : r)).filter((r) => r.id !== first.id)
    expect(changedCases(CASES, edited).map((c) => c.id)).toEqual([first.id, second.id])
    // A case the run recorded that's gone from the code is never asked.
    expect(changedCases(CASES, [...recorded, { id: 'facts-gone', hash: 'e'.repeat(64) }])).toEqual([])
    // A renamed case is a new one.
    const renamed = { ...first, id: `${first.id}-renamed` }
    expect(changedCases([renamed, ...CASES.slice(1)], recorded).map((c) => c.id)).toEqual([renamed.id])
    // A run from before spec 037 recorded no hashes, so every case counts as new.
    expect(changedCases(CASES, CASES.map((c) => ({ id: c.id })))).toHaveLength(CASES.length)
    expect(changedCases(PREP_CASES, undefined)).toHaveLength(PREP_CASES.length)
  })

  test('S1.1 FR-001 every result records its case’s hash', async () => {
    const { runner } = scripted([SUPPORTED])
    expect((await runner.run(FACT)).hash).toBe(caseHash(FACT))
  })
})

describe('one more try (S4.1–S4.3)', () => {
  test('S4.1 S4.3 FR-002 SC-003 a failing case is asked once more and the second try decides it; a passing one is asked once', async () => {
    const once = scripted([SUPPORTED])
    const passed = await once.runner.run(FACT)
    expect(passed.pass).toBe(true)
    expect(passed.retried).toBeUndefined()
    expect(once.calls).toMatchObject({ ask: 1, judge: 1 })

    const again = scripted([UNSUPPORTED, SUPPORTED])
    const second = await again.runner.run(FACT)
    expect(again.calls).toMatchObject({ ask: 2, judge: 2 })
    expect(second.pass).toBe(true)
    expect(second.judge?.verdict).toBe('supported')
    expect(second.retried).toEqual({
      failed: [{ name: 'the judge finds it supported', kind: 'accuracy', pass: false, detail: 'unsupported' }],
      costUsd: 0.001,
      judgeCostUsd: 0.004,
      ms: 900,
    })
    // The case's own cost is the shown answer's, which the per-answer limit applies to; the run's totals count both tries.
    expect(second.costUsd).toBeCloseTo(0.001, 6)
    expect(second.judgeCostUsd).toBeCloseTo(0.004, 6)
    const results = again.runner.finish()
    expect(results.totals.answerCostUsd).toBeCloseTo(0.002, 6)
    expect(results.totals.judgeCostUsd).toBeCloseTo(0.008, 6)
    expect(results.totals.ms).toBe(1800)
    // Only the second try is a result: the run holds one per case.
    expect(results.cases).toHaveLength(1)
  })

  test('S4.2 FR-002 a case that fails twice keeps its first try’s failed checks, and fails', async () => {
    const { runner, calls } = scripted([UNSUPPORTED], 'full', [answer({ text: 'Brad worked at Hopper.' })])
    const result = await runner.run(FACT)
    expect(calls.ask).toBe(2)
    expect(result.pass).toBe(false)
    expect(result.retried?.failed.map((check) => check.name)).toEqual(["says /2022/", 'the judge finds it supported'])
    expect(result.retried?.failed.every((check) => !check.pass)).toBe(true)
    expect(parseResults(JSON.parse(JSON.stringify(runner.finish()))).cases[0]?.retried?.failed).toHaveLength(2)
  })

  test('S4.1 FR-002 a prep case that fails is asked once more too', async () => {
    const { runner, calls } = scripted([SUPPORTED])
    const prep = PREP_CASES[0]
    if (prep === undefined) throw new Error('the prep cases are missing')
    const result = await runner.runPrep(prep)
    expect(calls.prep).toBe(2)
    expect(result.pass).toBe(false)
    expect(result.retried?.failed.length).toBeGreaterThan(0)
  })
})

describe('what a changed run costs (S1.2, SC-001)', () => {
  test('S1.2 FR-003 a changed run with no new or edited case asks nothing, costs nothing and passes, and its log says so', () => {
    const { runner, calls } = scripted([SUPPORTED], 'changed')
    const results = runner.finish()
    expect(calls).toMatchObject({ ask: 0, judge: 0, prep: 0 })
    expect(results).toMatchObject({ mode: 'changed', passed: true, cases: [] })
    expect(results.totals.costUsd).toBe(0)
    const file = readFileSync(path.join(import.meta.dirname, '..', '..', '..', 'apps', 'evals', 'src', 'run.eval.ts'), 'utf8')
    expect(file).toContain('no case is new or edited since the last full run, so this changed run asks none.')
  })

  test('SC-001 a change that adds three of the chat’s cases asks only those three, under $0.05 at the last full run’s dearest chat cases', () => {
    const record = parseResults(JSON.parse(readFileSync(path.join(import.meta.dirname, '..', '..', '..', 'apps', 'evals', 'results.json'), 'utf8')))
    const added = [1, 2, 3].map((n): Case => ({ ...FACT, id: `facts-added-${n}`, question: `New question ${n}?` }))
    const asked = changedCases([...CASES, ...added], record.cases)
    expect(asked.map((c) => c.id)).toEqual(added.map((c) => c.id))
    // When they pass, at the dearest chat cases the full run recorded, answer and judging together. The first answer
    // of a run writes the prompt's cache, so the dearest is that one. A prep case costs more, since its judge reads the
    // whole corpus, which SC-001 says.
    const dearest = record.cases
      .filter((item) => !item.suite.startsWith('prep'))
      .map((item) => item.costUsd + item.judgeCostUsd)
      .sort((a, b) => b - a)
    expect(dearest.slice(0, asked.length).reduce((sum, cost) => sum + cost, 0)).toBeLessThan(0.05)
  })
})

describe('the pass rules (S1.3, S3.2)', () => {
  test('S1.3 FR-003 a changed run passes only when every case it asked passes, each after at most one retry; one with none passes', async () => {
    const good = scripted([UNSUPPORTED, SUPPORTED], 'changed')
    await good.runner.run(FACT)
    const passing = parseResults(JSON.parse(JSON.stringify(good.runner.finish())))
    expect(passing.mode).toBe('changed')
    expect(passing.passed).toBe(true)

    const bad = scripted([SUPPORTED, UNSUPPORTED, UNSUPPORTED], 'changed')
    await bad.runner.run(FACT)
    await bad.runner.run({ ...FACT, id: 'facts-hopper-dates-2' })
    // One accuracy miss in two judged answers is within D221's 5%, rounded up, but a changed run allows none.
    expect(bad.runner.finish().passed).toBe(false)

    const none = scripted([SUPPORTED], 'changed')
    const empty = parseResults(JSON.parse(JSON.stringify(none.runner.finish())))
    expect(empty).toMatchObject({ mode: 'changed', passed: true, cases: [] })
  })

  test('S3.2 FR-008 a full run passes on D221’s pooled bar: every case safe, and misses within 5% of every judged answer, rounded up', async () => {
    const one = scripted([SUPPORTED, UNSUPPORTED, UNSUPPORTED])
    await one.runner.run(FACT)
    await one.runner.run({ ...FACT, id: 'facts-hopper-dates-2' })
    const results = one.runner.finish()
    expect(results.mode).toBe('full')
    expect(results.totals.judged).toEqual({ cases: 2, passed: 1, allowedMisses: 1 })
    expect(results.passed).toBe(true)

    const two = scripted([UNSUPPORTED])
    await two.runner.run(FACT)
    await two.runner.run({ ...FACT, id: 'facts-hopper-dates-2' })
    expect(two.runner.finish().passed).toBe(false)
  })
})
