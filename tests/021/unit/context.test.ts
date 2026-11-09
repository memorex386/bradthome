import { describe, expect, test } from 'vitest'
import { contextOf, ESSAY_CONTEXT } from '../../../apps/chat-api/src/prompt.ts'
import { loadCorpus } from '../../../apps/evals/src/corpus.ts'

// Spec 021's S6.1, as spec 023's evals amended it: each document's context.

describe("a document's context", () => {
  const corpus = loadCorpus()
  const byId = (id: string) => {
    const source = corpus.sources.find((item) => item.id === id)
    if (source === undefined) throw new Error(id)
    return source
  }

  test('S6.1 a résumé fact carries its job’s own line, an essay section who "I" is, and a job its label alone', () => {
    expect(contextOf(corpus, byId('hopper-disruption-assistance-1'))).toBe(`${byId('hopper-disruption-assistance-1').label}. The job: ${byId('job-hopper').text}`)
    expect(contextOf(corpus, byId('bleacher-report-1'))).toContain(byId('job-bleacher-report').text)
    expect(contextOf(corpus, byId('sudoku-world-1'))).toContain(byId('project-sudoku-world').text)
    expect(contextOf(corpus, byId('essay-summary'))).toBe(`${byId('essay-summary').label}${ESSAY_CONTEXT}`)
    expect(contextOf(corpus, byId('job-hopper'))).toBe(byId('job-hopper').label)
    expect(contextOf(corpus, byId('education-1'))).toBe(byId('education-1').label)
  })
})
