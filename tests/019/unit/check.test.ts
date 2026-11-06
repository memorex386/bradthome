import { describe, expect, test } from 'vitest'
import { ADDED_SOURCES, EXPECTED_REDIRECTS, looser, preReleaseCheck, TITLE_CHANGES, withTitlesRenamed, wordsMayChangeOf } from '../../../scripts/release/check.ts'

// The pre-release check for v2.0 (spec 019's Story 5, FR-006): which pages'
// words may change, the essay's renamed title, Umami's one connect-src host,
// and every v1 URL with the /v2 redirect. Each site is a small table of
// answers, as in spec 008's tests.

interface Answer {
  status?: number
  location?: string
  headers?: Record<string, string>
  body?: string
}

const LIVE = 'https://live.example'
const CANDIDATE = 'https://candidate.example'
const OLD = 'How one person runs a 1.4M-download product with AI agents'
const NEW = 'Running a 1.4M-download product with AI agents'
const nb = (title: string): string => title.replaceAll('-', '‑')

const essay = (title: string, body = 'The system around the agents.'): string =>
  `<html><head><title>${title} · Brad Thome</title></head><body><main><h1>${nb(title)}</h1><p>${body}</p></main></body></html>`
const V1_HOME = '<html><head><title>Brad Thome</title></head><body><h1>Brad Thome</h1><p>One card.</p></body></html>'
const V2_HOME = '<html><head><title>Brad Thome</title></head><body><h1>Brad Thome</h1><section id="hopper">The work at Hopper.</section></body></html>'
const LIVE_CSP = "default-src 'self'; object-src 'none'; script-src 'self' 'sha256-AAAA'"
const headers = (csp: string): Record<string, string> => ({ 'content-security-policy': csp, 'x-content-type-options': 'nosniff' })

function liveSite(): Record<string, Answer> {
  return {
    '/': { body: V1_HOME, headers: headers(LIVE_CSP) },
    '/vindecoded-agents': { body: essay(OLD), headers: headers(LIVE_CSP) },
    '/favicon.svg': { body: '<svg/>', headers: headers(LIVE_CSP) },
    '/index.html': { status: 301, location: '/' },
    '/vindecoded-agents/': { status: 301, location: '/vindecoded-agents' },
  }
}

const V2_CSP = `${LIVE_CSP} 'sha256-BBBB'; connect-src 'self' https://gateway.umami.is`

function candidateSite(overrides: Record<string, Answer> = {}): Record<string, Answer> {
  return {
    '/': { body: V2_HOME, headers: headers(V2_CSP) },
    '/vindecoded-agents': { body: essay(NEW), headers: headers(V2_CSP) },
    '/favicon.svg': { body: '<svg/>', headers: headers(V2_CSP) },
    '/index.html': { status: 301, location: `${CANDIDATE}/` },
    '/vindecoded-agents/': { status: 301, location: `${CANDIDATE}/vindecoded-agents` },
    '/v2': { status: 301, location: `${CANDIDATE}/` },
    ...overrides,
  }
}

function fetchFor(sites: Record<string, Record<string, Answer>>) {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const answer = sites[url.origin]?.[url.pathname]
    if (answer === undefined) return new Response('<p>Missing</p>', { status: 404 })
    const out = new Headers(answer.headers)
    if (answer.location !== undefined) out.set('location', answer.location)
    return new Response(answer.status === 301 ? null : (answer.body ?? ''), { status: answer.status ?? 200, headers: out })
  }
}

async function check(candidate: Record<string, Answer>, wordsMayChange: string | undefined) {
  return preReleaseCheck({
    liveBase: LIVE,
    candidateBase: CANDIDATE,
    livePaths: ['/', '/vindecoded-agents', '/favicon.svg'],
    fetch: fetchFor({ [LIVE]: liveSite(), [CANDIDATE]: candidate }),
    wordsMayChange: wordsMayChangeOf(wordsMayChange),
  })
}

describe('which words may change', () => {
  test("S5.1 FR-006 with the home's words allowed, a new home passes with a note, and a changed essay body fails", async () => {
    const ok = await check(candidateSite(), 'home')
    expect(ok.ok, ok.lines.join('\n')).toBe(true)
    expect(ok.lines.join('\n')).toMatch(/– check {2}words differ on \/: .*\(this run allows it\)/)
    const changed = await check(candidateSite({ '/vindecoded-agents': { body: essay(NEW, 'A different body.'), headers: headers(V2_CSP) } }), 'home')
    expect(changed.ok).toBe(false)
    expect(changed.lines.join('\n')).toMatch(/✖ check {2}words differ on \/vindecoded-agents/)
  })

  test('S5.4 FR-006 the choice names no page, the home, or both, and the old true means both', () => {
    expect(wordsMayChangeOf(undefined)).toEqual([])
    expect(wordsMayChangeOf('none')).toEqual([])
    expect(wordsMayChangeOf('false')).toEqual([])
    expect(wordsMayChangeOf('home')).toEqual(['/'])
    expect(wordsMayChangeOf('home-and-essay')).toEqual(['/', '/vindecoded-agents'])
    expect(wordsMayChangeOf('true')).toEqual(['/', '/vindecoded-agents'])
  })

  test("S5.4 FR-006 with no page allowed, the new home's words fail", async () => {
    const result = await check(candidateSite(), 'none')
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check {2}words differ on \/:/)
  })
})

describe("the essay's renamed title", () => {
  test("S5.2 FR-006 D163 the essay's old title reads as its new one, with plain or non-breaking hyphens, and nothing else may change", async () => {
    expect(TITLE_CHANGES['/vindecoded-agents']).toEqual([{ from: OLD, to: NEW }])
    expect(withTitlesRenamed(`${OLD} · Brad Thome ${nb(OLD)} body`, '/vindecoded-agents')).toBe(`${NEW} · Brad Thome ${nb(NEW)} body`)
    expect(withTitlesRenamed(`${OLD} body`, '/')).toBe(`${OLD} body`)
    const result = await check(candidateSite(), 'home')
    expect(result.lines.join('\n')).not.toMatch(/vindecoded-agents/)
    const other = await check(candidateSite({ '/vindecoded-agents': { body: essay('Another title'), headers: headers(V2_CSP) } }), 'home')
    expect(other.ok).toBe(false)
  })
})

describe("Umami's one host", () => {
  test('S5.3 FR-006 D159 connect-src may add https://gateway.umami.is to what live allows, and any other host still loosens it', () => {
    expect(ADDED_SOURCES).toEqual({ 'connect-src': ['https://gateway.umami.is'] })
    expect(looser('content-security-policy', LIVE_CSP, V2_CSP)).toBeUndefined()
    expect(looser('content-security-policy', LIVE_CSP, `${LIVE_CSP}; connect-src 'self' https://evil.example`)).toBe(
      'content-security-policy adds https://evil.example to connect-src',
    )
    expect(looser('content-security-policy', LIVE_CSP, `${LIVE_CSP}; img-src 'self' https://gateway.umami.is`)).toBe(
      'content-security-policy adds https://gateway.umami.is to img-src',
    )
  })
})

describe('every v1 URL', () => {
  test('S5.5 FR-006 every URL v1 serves still answers, and /v2 answers 301 to the root', async () => {
    const result = await check(candidateSite(), 'home')
    expect(result.ok, result.lines.join('\n')).toBe(true)
    const missing = await check(candidateSite({ '/favicon.svg': { status: 404 } }), 'home')
    expect(missing.lines.join('\n')).toMatch(/✖ check {2}\/favicon\.svg {2}live 200, candidate 404/)
    expect(EXPECTED_REDIRECTS).toEqual({ '/v2': '/' })
    for (const wrong of [{ status: 404 }, { status: 302, location: `${CANDIDATE}/` }, { status: 301, location: `${CANDIDATE}/mobile` }]) {
      const result = await check(candidateSite({ '/v2': wrong }), 'home')
      expect(result.ok, JSON.stringify(wrong)).toBe(false)
      expect(result.lines.join('\n'), JSON.stringify(wrong)).toMatch(/✖ check {2}\/v2 {2}candidate \d+ to \S+, not 301 to \//)
    }
  })
})
