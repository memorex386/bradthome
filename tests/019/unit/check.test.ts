import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { CHAT_API_ORIGIN } from '../../../apps/chat-api/src/constants.ts'
import { ADDED_SOURCES, configHstsOf, EXPECTED_REDIRECTS, looser, onHostingDomain, preReleaseCheck, TITLE_CHANGES, withTitlesRenamed, wordsMayChangeOf } from '../../../scripts/release/check.ts'

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
  test('S5.3 FR-006 D159 connect-src may add https://gateway.umami.is, and since v2.1 the chat API (D198), to what live allows, and any other host still loosens it', () => {
    expect(ADDED_SOURCES).toEqual({ 'connect-src': ['https://gateway.umami.is', CHAT_API_ORIGIN] })
    expect(looser('content-security-policy', LIVE_CSP, V2_CSP)).toBeUndefined()
    expect(looser('content-security-policy', LIVE_CSP, `${V2_CSP} ${CHAT_API_ORIGIN}`)).toBeUndefined()
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

describe("Hosting's own HSTS on a preview address", () => {
  test("S5.6 FR-006 on a web.app candidate the check reads firebase.json's HSTS, since Hosting replaces it there (D99), and a weaker one still fails", async () => {
    expect(onHostingDomain('https://bradthome--release-abc12345.web.app')).toBe(true)
    expect(onHostingDomain('https://bradthome.firebaseapp.com')).toBe(true)
    expect(onHostingDomain('https://bradthome.com')).toBe(false)
    expect(configHstsOf(readFileSync('firebase.json', 'utf8'))).toBe('max-age=63072000; includeSubDomains')
    const hsts = (value: string) => ({ key: 'Strict-Transport-Security', value })
    const config = (rules: unknown[]) => JSON.stringify({ hosting: { headers: rules } })
    expect(configHstsOf(config([{ source: '**', headers: [hsts('max-age=63072000')] }]))).toBe('max-age=63072000')
    // A narrower rule, or a second rule for every path, could serve another value somewhere, so the check fails closed.
    expect(configHstsOf(config([{ source: '**', headers: [hsts('max-age=63072000')] }, { source: '/resume/**', headers: [hsts('max-age=0')] }]))).toBeUndefined()
    expect(configHstsOf(config([{ source: '**', headers: [hsts('max-age=63072000')] }, { source: '**', headers: [hsts('max-age=0')] }]))).toBeUndefined()
    expect(configHstsOf(config([{ source: '/x', headers: [hsts('max-age=63072000')] }]))).toBeUndefined()
    expect(configHstsOf(config([]))).toBeUndefined()
    const preview = 'https://bradthome--v2-rc-abcd1234.web.app'
    const live = { ...liveSite() }
    for (const at of Object.keys(live)) live[at] = { ...live[at], headers: { ...live[at]?.headers, 'strict-transport-security': 'max-age=63072000; includeSubDomains' } }
    const candidate: Record<string, Answer> = {}
    for (const [at, answer] of Object.entries(candidateSite()))
      candidate[at] = { ...answer, headers: { ...answer.headers, 'strict-transport-security': 'max-age=31556926' }, ...(answer.location ? { location: answer.location.replace(CANDIDATE, preview) } : {}) }
    const run = (configHsts: string | undefined) =>
      preReleaseCheck({ liveBase: LIVE, candidateBase: preview, livePaths: ['/', '/vindecoded-agents', '/favicon.svg'], fetch: fetchFor({ [LIVE]: live, [preview]: candidate }), wordsMayChange: ['/'], configHsts })
    const ok = await run('max-age=63072000; includeSubDomains')
    expect(ok.ok, ok.lines.join('\n')).toBe(true)
    expect(ok.lines.join('\n')).toMatch(/– check {2}Hosting sets its own HSTS on bradthome--v2-rc-abcd1234\.web\.app/)
    const weak = await run('max-age=600')
    expect(weak.ok).toBe(false)
    const none = await run(undefined)
    expect(none.ok).toBe(false)
    expect(none.lines.join('\n')).toMatch(/drops strict-transport-security/)
    expect(weak.lines.join('\n')).toMatch(/strict-transport-security max-age 600 is shorter than live's 63072000/)
    const own = await check({ ...candidateSite(), '/': { body: V2_HOME, headers: { ...headers(V2_CSP), 'strict-transport-security': 'max-age=60' } } }, 'home')
    expect(own.ok).toBe(true)
  })
})
