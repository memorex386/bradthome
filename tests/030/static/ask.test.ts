import { existsSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { ASK, questionOf } from '../../../apps/site/src/components/ds/proof.ts'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { read, sitePath, withoutMotionBlocks } from '../../009/helpers/ds.ts'

// Spec 030's static checks: the questions' frames, the links that keep
// working with no script, the client's one hand-off, the window's prompt
// that never sends, MA-20 inside the no-preference block, and the eval
// cases' shape (D213). Amended by spec 038 (D230): each claim's sparkle asks
// in place of "Ask me", and the drawers, with their ask links, are gone.

const code = (file: string): string => read(file).replace(/^\s*\/\/.*$/gm, '')

describe('the questions (FR-002)', () => {
  // Amended by spec 038 (D230): the sparkle quotes its claim's words, as a row's "Ask me" did.
  test('S1.1 FR-002 a claim’s sparkle asks about it in the claim’s own words', () => {
    expect(questionOf('Built partner portals.')).toBe('Tell me more about this: “Built partner portals.”')
  })

  // Amended by spec 038 (D229): the drawers are gone, so nothing asks about a card's receipts together.
  test('S1.2 FR-002 no question asks about several claims at once', () => {
    expect(CASES.filter((c) => c.question.startsWith('Tell me more about these'))).toEqual([])
    expect(code(sitePath('src', 'components', 'ds', 'proof.ts'))).not.toContain('these')
  })
})

describe('the links (story 3)', () => {
  // Amended by spec 038 (D230): the sparkle is the link that stays a link to the contact section.
  test('S1.1 S1.2 S3.1 FR-004 each sparkle stays a link to the contact section, carrying its question', () => {
    const ask = read(sitePath('src', 'components', 'ds', 'ClaimAsk.astro'))
    expect(ask).toMatch(
      /<a\s+class:list=\{\['ds-claim-ask', demo && `is-\$\{demo\}`\]\}\s+href=\{ASK\.href\}\s+data-chat-ask=\{questionOf\(text\)\}/,
    )
    expect(ASK.href).toBe('#contact')
    for (const gone of ['Receipts.astro', 'ReceiptMarker.astro', 'receipts.ts'])
      expect(existsSync(sitePath('src', 'components', 'ds', gone)), gone).toBe(false)
  })

  // Spec 038 (D229) retires "Ask me" and its label's box, so S5.1's look is now the sparkle's, which tests/038 checks.
  test('S5.1 no "Ask me" rule is left in the design system', () => {
    const css = read(sitePath('src', 'styles', 'ds', 'components.css'))
    expect(css).not.toMatch(/\.ds-receipts|\.ds-marker/)
  })
})

describe('the hand-off (story 1)', () => {
  const client = code(sitePath('src', 'components', 'chat', 'ask.client.ts'))
  const window = code(sitePath('src', 'components', 'chat', 'ChatWindow.tsx'))

  test('S1.1 S1.5 S3.2 S3.3 FR-001 one click listener opens the chat with the link’s question; modified clicks pass; focus returns', () => {
    expect(client).toMatch(/document\.addEventListener\('click'/)
    // Spec 031: the same listener opens the chat from the hero's button and a phone's corner button (D214).
    expect(client).toMatch(/closest\?\.<HTMLElement>\('\[data-chat-ask\],\[data-chat-open\],\.chat-corner'\)/)
    expect(client).toMatch(/event\.button !== 0 \|\| event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey/)
    expect(client).toMatch(/void open\(link\.dataset\.chatAsk\)/)
    expect(client).toMatch(/dialog\.addEventListener\('close', \(\) => opener\.focus\(\)\)/)
    // A window that can't load sends a receipt's tap where its link goes (S3.2, FR-004).
    expect(client).toMatch(/catch \{[\s\S]*if \(opener instanceof HTMLAnchorElement\) location\.assign\(opener\.href\)/)
    // The listener is wired only where the chat's button and dialog are on the page.
    expect(client.indexOf("document.addEventListener('click'")).toBeGreaterThan(client.indexOf('if (button === null'))
  })

  test('S1.1 S1.4 FR-001 the window puts the question in the box, in Ask mode, and never sends it', () => {
    const start = window.indexOf('useLayoutEffect(() => {')
    const effect = window.slice(start, window.indexOf('}, [prompt?.n])', start))
    expect(effect).toContain("mode: 'ask'")
    expect(effect).toContain('setDraft(prompt.text.slice(0, MAX_QUESTION_CHARS))')
    expect(effect).not.toMatch(/send\(|transport|fetch/)
  })
})

describe('MA-20 (story 4)', () => {
  test('S4.1 S4.2 FR-005 the floating button’s entrance sits inside no-preference, at desktop widths, 420 ms from 1.8 s', () => {
    const css = read(sitePath('src', 'styles', 'chat.css')).replace(/\/\*[\s\S]*?\*\//g, '')
    const { still, blocks } = withoutMotionBlocks(css)
    expect(still).not.toMatch(/chat-ask-(rise|fade)/)
    const motion = blocks.join('\n')
    expect(motion).toMatch(
      /@media \(min-width: 40\.0625rem\) \{\s*\.hero \.chat-ask \{\s*animation:\s*chat-ask-rise 420ms cubic-bezier\(0\.3, 1\.32, 0\.52, 1\) 1800ms backwards,\s*chat-ask-fade 420ms var\(--ease-out-soft\) 1800ms backwards;/,
    )
    expect(motion).toMatch(/@keyframes chat-ask-rise \{\s*from \{\s*translate: 0 14px;\s*scale: 0\.9;\s*\}\s*\}/)
    expect(motion).toMatch(/@keyframes chat-ask-fade \{\s*from \{\s*opacity: 0;\s*\}\s*\}/)
  })
})

describe('the eval cases (story 2)', () => {
  const receipts = CASES.filter((c) => c.id.startsWith('facts-receipt'))

  test('S2.1 FR-003 one facts case per question, each requiring an answer that cites its claims', () => {
    // Amended by spec 034 (D219): two new Mobile claims ask, and the offer card's is proof.
    // Amended by spec 038 (D230): each of the 30 claims' sparkles asks, and the drawers' six questions are gone.
    expect(receipts).toHaveLength(30)
    expect(new Set(receipts.map((c) => c.question)).size).toBe(receipts.length)
    for (const c of receipts) {
      expect(c.suite, c.id).toBe('facts')
      expect(c.question, c.id).toMatch(/^Tell me more about this: “.+”$/)
      expect(c.expect.states, c.id).toEqual(['answered'])
      expect(c.expect.cites?.length, c.id).toBeGreaterThan(0)
      expect(c.id, c.id).toContain(c.expect.cites?.[0] ?? '')
    }
  })
})
