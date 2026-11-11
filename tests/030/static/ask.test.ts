import { describe, expect, test } from 'vitest'
import { askQuestionOf, questionOf, type ReceiptEntry } from '../../../apps/site/src/components/ds/receipts.ts'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { read, sitePath, withoutMotionBlocks } from '../../009/helpers/ds.ts'

// Spec 030's static checks: the questions' frames, the links that keep
// working with no script, the client's one hand-off, the window's prompt
// that never sends, MA-20 inside the no-preference block, and the receipt
// cases' shape (D213).

const entry = (id: string, kind: 'proof' | 'ask', title: string, text?: string): ReceiptEntry => ({
  id,
  n: 1,
  kind,
  title,
  evidence: kind === 'proof' ? ['https://example.com'] : [],
  ...(text === undefined ? {} : { text }),
})

const code = (file: string): string => read(file).replace(/^\s*\/\/.*$/gm, '')

describe('the questions (FR-002)', () => {
  test('S1.1 FR-002 a row asks about its claim in the claim’s own words', () => {
    expect(questionOf(entry('a', 'ask', 'Partner portals', 'Built partner portals.'))).toBe(
      'Tell me more about this: “Built partner portals.”',
    )
    // With no words, its title stands in.
    expect(questionOf(entry('a', 'ask', 'Partner portals'))).toBe('Tell me more about this: “Partner portals”')
  })

  test('S1.2 FR-002 a drawer asks about all of its "Ask me" receipts, or its one', () => {
    const items = [
      entry('a', 'ask', 'One', 'The first.'),
      entry('b', 'proof', 'Two', 'The second.'),
      entry('c', 'ask', 'Three', 'The third.'),
    ]
    expect(askQuestionOf(items, 'Hopper')).toBe('Tell me more about these, from Hopper: One; Three.')
    expect(askQuestionOf(items.slice(0, 2), 'Hopper')).toBe(questionOf(items[0] as ReceiptEntry))
    expect(askQuestionOf(items.slice(1, 2), 'Hopper')).toBeUndefined()
  })
})

describe('the links (story 3)', () => {
  test('S1.1 S1.2 S3.1 FR-004 "Ask me" and the drawer’s link stay links to the contact section, carrying their question', () => {
    const receipts = read(sitePath('src', 'components', 'ds', 'Receipts.astro'))
    expect(receipts).toMatch(
      /<a\s+class="ds-receipts__kind ds-receipts__ask"\s+href=\{askHref\}\s+data-chat-ask=\{questionOf\(item\)\}\s+aria-label=\{`\$\{RECEIPTS\.ask\} about receipt \$\{item\.n\}`\}\s*>/,
    )
    expect(receipts).toMatch(/<a class="ds-link" href=\{askHref\} data-chat-ask=\{askQuestionOf\(items, place\)\}>/)
    expect(read(sitePath('src', 'components', 'ds', 'receipts.ts'))).toContain("askHref: '#contact'")
  })

  test('S5.1 "Ask me" keeps the label’s box, with a link’s color and underline', () => {
    const css = read(sitePath('src', 'styles', 'ds', 'components.css'))
    const rule = css.slice(css.indexOf('.ds-receipts__ask {'), css.indexOf('}', css.indexOf('.ds-receipts__ask {')))
    expect(rule).toMatch(/color: var\(--receipts-link\);/)
    expect(rule).toMatch(/text-decoration: underline;/)
    // The same box as the label it was, so the drawers' layout doesn't move.
    expect(rule).not.toMatch(/display|min-height|padding/)
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
    expect(receipts).toHaveLength(26)
    expect(new Set(receipts.map((c) => c.question)).size).toBe(receipts.length)
    for (const c of receipts) {
      expect(c.suite, c.id).toBe('facts')
      expect(c.question, c.id).toMatch(/^Tell me more about (this: “.+”|these, from .+: .+\.)$/)
      expect(c.expect.states, c.id).toEqual(['answered'])
      expect(c.expect.cites?.length, c.id).toBeGreaterThan(0)
      expect(c.id, c.id).toContain(c.expect.cites?.[0] ?? '')
    }
  })
})
