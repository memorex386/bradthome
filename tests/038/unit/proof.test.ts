import { describe, expect, test } from 'vitest'
import { endOf } from '../../../apps/site/src/components/ds/endOf.ts'
import {
  anchorOf,
  ASK,
  askNameOf,
  hostOf,
  hrefOf,
  keyOf,
  questionOf,
  sourcesOf,
  statHrefOf,
  statLinksOf,
  wordsOf,
} from '../../../apps/site/src/components/ds/proof.ts'

// Spec 038's unit tests: the sparkle's question and name, a claim's anchor,
// a source's host and path, the sources a card lists, a stat's link, and
// where the sparkle keeps to a claim's last word (D229, D230).

const LABELS = {
  one: { 'example.com': 'Source A' },
  two: { 'example.org': 'Source B', 'bradthome.com': 'The latest eval run, case by case' },
}

describe('the sparkle (story 2)', () => {
  test('FR-005 S2.2 its question quotes the claim’s words in the frame "Ask me" used, so the 20 kept cases keep their words', () => {
    expect(questionOf('Built partner portals.')).toBe('Tell me more about this: “Built partner portals.”')
    expect(questionOf("B/R's app shows 10M+ installs on Google Play, a figure for the whole app.")).toBe(
      "Tell me more about this: “B/R's app shows 10M+ installs on Google Play, a figure for the whole app.”",
    )
  })

  test('S2.3 a lead and a list join into one line, the list’s items by "; "', () => {
    const text = "The case study's counts, measured on 10/28:\n- 1,235 merged PRs\n- 1,530 test files\n- 46 ADRs"
    expect(wordsOf(text)).toBe("The case study's counts, measured on 10/28: 1,235 merged PRs; 1,530 test files; 46 ADRs")
    expect(questionOf(text)).toBe(
      "Tell me more about this: “The case study's counts, measured on 10/28: 1,235 merged PRs; 1,530 test files; 46 ADRs”",
    )
    // Two paragraphs join by a space; blank lines and edge spaces go.
    expect(wordsOf('  One.\n\nTwo.  ')).toBe('One. Two.')
  })

  test('S2.4 its name holds its tooltip’s words and the claim’s title', () => {
    expect(ASK.tip).toBe('Ask about this')
    expect(askNameOf('Partner portals')).toBe('Ask about this: Partner portals')
    expect(ASK.href).toBe('#contact')
  })

  test('S2.1 it keeps to the claim’s last word, so it never wraps alone', () => {
    expect(endOf('Senior Software Engineer, remote.')).toEqual({ head: 'Senior Software Engineer, ', last: 'remote.' })
    expect(endOf('One')).toEqual({ head: '', last: 'One' })
    expect(endOf('Trailing space.  ')).toEqual({ head: 'Trailing ', last: 'space.' })
  })
})

describe('the anchor (story 3)', () => {
  test('S3.1 FR-007 a claim keeps its receipt’s anchor', () => {
    expect(anchorOf('hopper-fintech-ai-1')).toBe('receipt-hopper-fintech-ai-1')
  })
})

describe('a card’s sources (story 1)', () => {
  test('FR-003 S1.3 each evidence URL its claims hold, once, in claim order, with its label and host, marked when it leaves the site', () => {
    const items = [
      { id: 'one', evidence: ['https://example.com/a'] },
      { id: 'two', evidence: ['https://example.com/a', 'https://example.org/b', 'https://bradthome.com/evals'] },
    ]
    expect(sourcesOf(items, [], LABELS)).toEqual([
      { href: 'https://example.com/a', label: 'Source A', host: 'example.com', outside: true, claim: 'one' },
      { href: 'https://example.org/b', label: 'Source B', host: 'example.org', outside: true, claim: 'two' },
      { href: '/evals', label: 'The latest eval run, case by case', host: 'bradthome.com', outside: false, claim: 'two' },
    ])
  })

  test('S1.4 a source on this site goes by its path and carries no outside-link mark', () => {
    expect(hrefOf('https://bradthome.com/design-system')).toBe('/design-system')
    expect(hrefOf('https://github.com/memorex386/bradthome')).toBe('https://github.com/memorex386/bradthome')
    expect(hostOf('https://www.example.com/x')).toBe('example.com')
  })

  test('S1.5 FR-004 a source the card already links, from a stat or its own links, isn’t listed again, even written as a path', () => {
    const items = [{ id: 'one', evidence: ['https://bradthome.com/vindecoded-agents', 'https://vindecoded.com', 'https://example.com/a'] }]
    // Each is shown already, so none needs a label.
    expect(sourcesOf(items, ['/vindecoded-agents', 'https://vindecoded.com/', 'https://example.com/a'], LABELS)).toEqual([])
    expect(keyOf('/vindecoded-agents')).toBe(keyOf('https://bradthome.com/vindecoded-agents'))
    expect(keyOf('https://www.vindecoded.com/')).toBe(keyOf('https://vindecoded.com'))
  })

  test('FR-003 a listed source with no label, or two from one claim on one host, fails the build', () => {
    expect(() => sourcesOf([{ id: 'one', evidence: ['https://example.net/unnamed'] }], [], LABELS)).toThrow(
      'The source https://example.net/unnamed on one has no label.',
    )
    expect(() => sourcesOf([{ id: 'one', evidence: ['https://example.com/a', 'https://example.com/b'] }], [], LABELS)).toThrow(
      "The claim one lists two sources on example.com, so a label can't tell them apart.",
    )
  })
})

describe('a stat’s link (story 1)', () => {
  const claim = {
    id: 'vindecoded-3',
    evidence: ['https://play.google.com/store/apps/details?id=x', 'https://apps.apple.com/us/app/x/id1'],
  }

  test('FR-002 S1.2 a stat links the one URL on its host in its claim’s evidence', () => {
    expect(statHrefOf(claim, 'play.google.com')).toBe('https://play.google.com/store/apps/details?id=x')
    expect(statHrefOf(claim, 'apps.apple.com')).toBe('https://apps.apple.com/us/app/x/id1')
    expect(
      statLinksOf([
        { value: '1M+', label: 'a', href: 'https://a.example' },
        { value: 'b', label: 'b' },
      ]),
    ).toEqual(['https://a.example'])
  })

  test('FR-002 a stat may link only its claim’s evidence: a host it doesn’t hold, or holds twice, fails the build', () => {
    expect(() => statHrefOf(claim, 'example.com')).toThrow('holds 0 times')
    expect(() => statHrefOf({ id: 'two', evidence: ['https://a.example/1', 'https://a.example/2'] }, 'a.example')).toThrow('holds 2 times')
  })
})
