import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { preReleaseCheck, visibleText, withoutBuildRecords, WORD_PAGES } from '../../../scripts/release/check.ts'

// Spec 033's S6.3 and FR-007: the pre-release check reads the counts and the
// date the build writes, marked data-record, as placeholders, so a new record
// or a new day is never a change of words, and any other change still stops
// it. Each site is a small table of answers, as in spec 008's tests.

interface Answer {
  status?: number
  location?: string
  headers?: Record<string, string>
  body?: string
}

const LIVE = 'https://live.example'
const CANDIDATE = 'https://candidate.example'
const HEADERS = { 'strict-transport-security': 'max-age=63072000; includeSubDomains' }

/** A home with bradthome.com's card, as Side.astro writes it. */
const HOME = (decisions: number | string, specs: number, releases: number, day: string, label: string, line = 'Built in the open'): string =>
  `<!doctype html><html><body><main><h1>Brad Thome</h1><section id="side"><article id="side-bradthome-com"><h3>bradthome.com</h3><span>${line}</span>` +
  `<ul class="side__counts"><li><a href="https://github.com/memorex386/bradthome/blob/main/docs/decisions/README.md"><span class="side__count-value" data-record="decisions">${decisions}</span><span class="side__count-label">decisions</span></a></li>` +
  `<li><a href="https://github.com/memorex386/bradthome/tree/main/specs"><span class="side__count-value" data-record="specs">${specs}</span><span class="side__count-label">specs</span></a></li>` +
  `<li><a href="https://github.com/memorex386/bradthome/tree/main/docs/releases"><span class="side__count-value" data-record="releases">${releases}</span><span class="side__count-label">releases</span></a></li></ul>` +
  `<p class="side__counted">Counted from the repo on <time datetime="${day}" data-record="counted">${label}</time>.</p></article></section></main></body></html>`
const ESSAY = '<html><body><main><h1>How it works</h1><p>The system around the agents.</p></main></body></html>'

function site(home: string): Record<string, Answer> {
  return {
    '/': { body: home, headers: HEADERS },
    '/vindecoded-agents': { body: ESSAY, headers: HEADERS },
    '/v2': { status: 301, location: '/' },
  }
}

function fetchFor(sites: Record<string, Record<string, Answer>>) {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const answer = sites[url.origin]?.[url.pathname]
    if (answer === undefined) return new Response('<p>Missing</p>', { status: 404, headers: { 'content-type': 'text/html' } })
    const headers: Record<string, string> = { 'content-type': 'text/html', ...answer.headers }
    if (answer.location !== undefined) headers.location = answer.location
    return new Response(answer.status === 301 ? null : (answer.body ?? ''), { status: answer.status ?? 200, headers })
  }
}

const check = (live: string, candidate: string, wordsMayChange = false) =>
  preReleaseCheck({
    liveBase: LIVE,
    candidateBase: CANDIDATE,
    livePaths: ['/', '/vindecoded-agents'],
    fetch: fetchFor({ [LIVE]: site(live), [CANDIDATE]: site(candidate) }),
    wordsMayChange: wordsMayChange ? [...WORD_PAGES] : [],
  })

describe('the counts and the date are placeholders (S6.3)', () => {
  test('S6.3 FR-007 a marked value reads as "#", and nothing else changes', () => {
    const html = HOME(214, 31, 8, '2026-11-11', 'Nov 11, 2026')
    expect(visibleText(withoutBuildRecords(html))).toBe(
      'Brad Thome bradthome.com Built in the open # decisions # specs # releases Counted from the repo on # .',
    )
    expect(withoutBuildRecords('<p data-x="1">Keep 5</p><b>9</b>')).toBe('<p data-x="1">Keep 5</p><b>9</b>')
  })

  test('S6.3 FR-007 new records and a new day pass the check with no words allowed to change', async () => {
    const result = await check(HOME(214, 31, 8, '2026-11-11', 'Nov 11, 2026'), HOME(219, 33, 9, '2026-11-14', 'Nov 14, 2026'))
    expect(result.lines.join('\n')).not.toMatch(/words differ/)
    expect(result.ok).toBe(true)
  })

  test('S6.3 FR-007 any other change of words on the home still stops it, unless the run allows it', async () => {
    const live = HOME(214, 31, 8, '2026-11-11', 'Nov 11, 2026')
    const result = await check(live, HOME(214, 31, 8, '2026-11-11', 'Nov 11, 2026', 'Built in private'))
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check .*words differ on \/: .*Built in the open/)
    expect((await check(live, HOME(214, 31, 8, '2026-11-11', 'Nov 11, 2026', 'Built in private'), true)).ok).toBe(true)
  })

  test('S6.3 FR-007 it fails closed: other words in a marked element, or another mark, are still compared', async () => {
    // The review's finding: only a count's number and the build's day become placeholders.
    for (const html of [
      '<p>Lead <span data-record="decisions">many</span> after</p>',
      '<p><time data-record="counted">soon</time></p>',
      '<p><b data-record="other">9</b></p>',
      '<p><span data-record="specs">31 specs</span></p>',
    ])
      expect(withoutBuildRecords(html), html).toBe(html)
    const live = HOME(214, 31, 8, '2026-11-11', 'Nov 11, 2026')
    const result = await check(live, HOME('many', 31, 8, '2026-11-11', 'Nov 11, 2026'))
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check .*words differ on \/: .*many/)
    const later = await check(live, HOME(214, 31, 8, '2026-11-11', 'Tomorrow'))
    expect(later.ok).toBe(false)
  })

  test('S6.3 the check blanks both sides, before the Work list rule and the renamed titles', () => {
    const text = readFileSync(path.resolve(import.meta.dirname, '../../../scripts/release/check.ts'), 'utf8')
    expect(text).toMatch(/const now = visibleText\(withoutBuildRecords\(after\.body\)\)/)
    expect(text).toMatch(/withTitlesRenamed\(visibleText\(withoutBuildRecords\(before\.body\)\), at\)/)
    expect(text).toMatch(/withoutSecondWorkItem\(withoutBuildRecords\(before\.body\)\)/)
  })
})
