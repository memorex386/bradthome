import { describe, expect, test } from 'vitest'
import { createPronounRewriter, withName } from '../../../apps/chat-api/src/pronouns.ts'
import { ask, harness, partsOf } from '../helpers/fakes.ts'

// Spec 021's FR-008, as spec 023's D200 enforces it: the answer calls Brad
// "Brad" even when the model slips, rewritten as it streams.

describe('the pronoun rewriter', () => {
  test('FR-008 replaces he, him, his and himself, in any case, with the name, and leaves other words alone', () => {
    expect(withName('He was promoted, and his team trusted him to ship it himself.')).toBe(
      'Brad was promoted, and Brad’s team trusted Brad to ship it Brad.',
    )
    expect(withName('This theme shows the history of the shell, then the hiss.')).toBe('This theme shows the history of the shell, then the hiss.')
  })

  test('FR-008 holds back a word split across chunks until it is whole, and loses nothing', () => {
    const rewriter = createPronounRewriter()
    const out = ['Brad led the team. H', 'e then moved to h', 'is next role, Hi', 'story included.'].map((chunk) => rewriter.push(chunk)).join('')
    expect(out + rewriter.flush()).toBe('Brad led the team. Brad then moved to Brad’s next role, History included.')
  })

  test('FR-008 the API streams the rewritten words, and its state reads them', async () => {
    const h = harness({ script: { text: ['Brad joined Hopper. H', 'is role was senior.'], cites: ['job-hopper'] } })
    const parts = await partsOf(await ask(h))
    const words = parts
      .filter((part) => part.type === 'text-delta')
      .map((part) => String((part as { delta?: unknown }).delta))
      .join('')
    expect(words).toBe('Brad joined Hopper. Brad’s role was senior.')
  })
})
