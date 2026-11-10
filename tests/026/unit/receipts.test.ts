import { describe, expect, test } from 'vitest'
import { askOf, hostOf, RECEIPTS, type ReceiptEntry, rowIdOf, summaryOf } from '../../../apps/site/src/components/ds/receipts.ts'

// Spec 026's drawer words: the summary, the ask link, a row's id and a
// source's host (D208).

const proof = (n: number): ReceiptEntry => ({ id: `p${n}`, n, kind: 'proof', title: 'Proof', evidence: ['https://example.com'] })
const ask = (n: number): ReceiptEntry => ({ id: `a${n}`, n, kind: 'ask', title: 'Ask', evidence: [] })

describe('the summary (S1.4)', () => {
  test('S1.4 FR-002 FR-005 names how many receipts have a public link, singular or plural', () => {
    expect(summaryOf([proof(1)])).toBe('Public link')
    expect(summaryOf([proof(1), proof(2)])).toBe('Public links')
    expect(summaryOf([ask(1)])).toBe('No public link yet')
    expect(summaryOf([ask(1), ask(2), ask(3)])).toBe('No public links yet')
    expect(summaryOf([ask(1), ask(2), proof(3)])).toBe('1 with a public link · 2 to ask about')
  })

  test('S1.4 FR-005 the control reads "Receipts"', () => {
    expect(RECEIPTS.label).toBe('Receipts')
    expect(RECEIPTS.ask).toBe('Ask me')
  })
})

describe('the ask link (S1.6)', () => {
  test('S1.6 FR-005 "Ask Brad about it" for one, "about these" for more, and none when every receipt has a link', () => {
    expect(askOf([ask(1), proof(2)])).toBe('Ask Brad about it')
    expect(askOf([ask(1), ask(2)])).toBe('Ask Brad about these')
    expect(askOf([proof(1), proof(2)])).toBeUndefined()
    expect(RECEIPTS.askHref).toBe('#contact')
  })
})

describe('rows and hosts (S1.2)', () => {
  test('S1.2 FR-003 a row is named for its claim, so its marker can link to it', () => {
    expect(rowIdOf('hopper-partner-platform-2')).toBe('receipt-hopper-partner-platform-2')
  })

  test('S1.2 a source link reads as its host, without www.', () => {
    expect(hostOf('https://www.example.com/a?b=c')).toBe('example.com')
    expect(hostOf('https://play.google.com/store/apps/details?id=x')).toBe('play.google.com')
    expect(() => hostOf('not a url')).toThrow()
  })
})
