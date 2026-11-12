import { describe, expect, test } from 'vitest'
import { loadCorpus } from '../../../apps/evals/src/corpus.ts'

// Spec 035, Story 1 in the chat's corpus: built from this commit with spec
// 020's corpusOf, as the evals and /corpus.json build it, the essay's summary
// source holds the new sentence, and no source keeps the old framing (D222).

const SUMMARY =
  'I run VINDecoded, a profitable vehicle-research product on Android, iOS and the web, where AI agents write most of the code and I review and approve the work.'

describe("the chat's corpus (story 1)", () => {
  const corpus = loadCorpus()

  test("S1.4 FR-001 the essay's summary source holds the new sentence", () => {
    const holding = corpus.sources.filter((source) => source.text.includes(SUMMARY))
    expect(holding.map((source) => source.kind)).toEqual(['essay'])
    expect(holding[0]?.url).toBe('https://bradthome.com/vindecoded-agents#summary')
  })

  test('S1.4 FR-002 no source reads one-person or whole engineering team', () => {
    for (const source of corpus.sources) expect(source.text, source.id).not.toMatch(/one[-‑]person|whole engineering team/i)
    expect(corpus.about).not.toMatch(/one[-‑]person|whole engineering team/i)
  })
})
