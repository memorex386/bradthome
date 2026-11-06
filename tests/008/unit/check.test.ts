import { describe, expect, test } from 'vitest'
import { livePathsOf, preReleaseCheck, visibleText, withoutSecondWorkItem, WORD_PAGES } from '../../../scripts/release/check.ts'

// The pre-release check: the candidate against what the live site serves
// today (spec 008, issue #29: S3.1 to S3.5, FR-006). Each site here is a small
// table of answers, so every rule can be broken on its own.

interface Answer {
  status?: number
  location?: string
  headers?: Record<string, string>
  body?: string
}

const LIVE = 'https://live.example'
const CANDIDATE = 'https://candidate.example'

const HOME = (items: string[]): string =>
  `<!doctype html><html><head><title>Brad Thome</title><style>p{}</style></head><body><header><a href="/">Brad Thome</a></header><main>
  <h1>Brad Thome</h1><p class="lede">Engineer &amp; builder.</p>
  <h2 class="section-label">Work</h2><ul class="plain-list">${items.map((item) => `<li><a href="https://example.com">${item}</a><br>About ${item}.</li>`).join(' ')}</ul>
  </main><script>console.log('not words')</script><footer>Brad Thome · Dallas–Fort Worth</footer></body></html>`
const ESSAY = '<html><body><main><h1>How it works</h1><p>The system around the agents.</p></main></body></html>'
const HSTS_LIVE = { 'strict-transport-security': 'max-age=31556926' }
const STRICT = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'content-security-policy': "default-src 'self'; object-src 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=()',
}

function liveSite(): Record<string, Answer> {
  return {
    '/': { body: HOME(['Alpha Product', 'Beta Project']), headers: { ...HSTS_LIVE } },
    '/vindecoded-agents': { body: ESSAY, headers: { ...HSTS_LIVE } },
    '/favicon.svg': { body: '<svg/>', headers: { ...HSTS_LIVE } },
    '/index.html': { status: 301, location: '/' },
    '/vindecoded-agents/': { status: 301, location: '/vindecoded-agents' },
  }
}

function candidateSite(): Record<string, Answer> {
  return {
    '/': { body: HOME(['Alpha Product']), headers: { ...STRICT } },
    '/vindecoded-agents': { body: ESSAY, headers: { ...STRICT } },
    '/favicon.svg': { body: '<svg/>', headers: { ...STRICT } },
    '/404': { body: '<p>Not here</p>', headers: { ...STRICT } },
    '/index.html': { status: 301, location: `${CANDIDATE}/` },
    '/vindecoded-agents/': { status: 301, location: `${CANDIDATE}/vindecoded-agents` },
    '/v2': { status: 301, location: `${CANDIDATE}/` },
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

async function check(live: Record<string, Answer>, candidate: Record<string, Answer>, wordsMayChange = false) {
  return preReleaseCheck({
    liveBase: LIVE,
    candidateBase: CANDIDATE,
    livePaths: ['/', '/vindecoded-agents', '/favicon.svg'],
    fetch: fetchFor({ [LIVE]: live, [CANDIDATE]: candidate }),
    wordsMayChange: wordsMayChange ? [...WORD_PAGES] : [],
  })
}

describe('the pages it compares', () => {
  test("S3.1 FR-006 the live version's pages and files, by their served address, leaving out Hosting's own and hashed build files", () => {
    const files = [
      '/index.html',
      '/vindecoded-agents.html',
      '/favicon.svg',
      '/_astro/Base.abc.css',
      '/__/firebase/init.js',
      '/404.html',
    ].map((path) => ({ path, hash: 'h' }))
    expect(livePathsOf(files)).toEqual(['/', '/404', '/favicon.svg', '/vindecoded-agents'])
  })

  test("S3.1 S3.2 S3.3 S3.4 FR-006 SC-001 today's v0 and the v1.0 build pass", async () => {
    const result = await check(liveSite(), candidateSite())
    expect(result.lines.join('\n')).toMatch(/✓ check/)
    expect(result.ok).toBe(true)
  })
})

describe('every URL still answers', () => {
  test('S3.1 FR-006 fails when a page the live site serves is missing from the candidate', async () => {
    const candidate = candidateSite()
    delete candidate['/vindecoded-agents']
    const result = await check(liveSite(), candidate)
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check .*\/vindecoded-agents .*live 200, candidate 404/)
  })

  test('S3.1 FR-006 robots.txt and the sitemap must stay when the live site serves them, and may be added when it does not', async () => {
    const live = { ...liveSite(), '/robots.txt': { body: 'User-agent: *' } }
    const result = await check(live, candidateSite())
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/\/robots\.txt/)
    const added = await check(liveSite(), { ...candidateSite(), '/sitemap-index.xml': { body: '<urlset/>' } })
    expect(added.ok).toBe(true)
  })
})

describe('redirects and the missing page', () => {
  test('S3.2 FR-006 fails when a redirect the live site sends is gone or points somewhere else', async () => {
    const gone = candidateSite()
    delete gone['/vindecoded-agents/']
    expect((await check(liveSite(), gone)).ok).toBe(false)
    const moved = { ...candidateSite(), '/index.html': { status: 301, location: `${CANDIDATE}/home` } }
    const result = await check(liveSite(), moved)
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check .*\/index\.html .*\/home/)
  })

  test('S3.2 FR-006 a missing page must answer 404 on the candidate, never 200', async () => {
    const soft = fetchFor({ [LIVE]: liveSite(), [CANDIDATE]: candidateSite() })
    const result = await preReleaseCheck({
      liveBase: LIVE,
      candidateBase: CANDIDATE,
      livePaths: ['/'],
      wordsMayChange: [...WORD_PAGES],
      fetch: async (input) => {
        const url = new URL(String(input))
        if (url.origin === CANDIDATE && !(url.pathname in candidateSite())) return new Response('<p>Home</p>', { status: 200 })
        return soft(input)
      },
    })
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check .*missing page .*200/)
  })
})

describe('security headers', () => {
  test('S3.3 FR-006 fails when the candidate drops a security header the live site sends', async () => {
    const live = liveSite()
    for (const page of Object.values(live)) if (page.headers !== undefined) page.headers['x-frame-options'] = 'DENY'
    const result = await check(live, candidateSite())
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check .*x-frame-options/i)
  })

  test('S3.3 FR-006 HSTS may not get shorter or lose includeSubDomains', async () => {
    const weaker = (value: string) => {
      const site = candidateSite()
      for (const page of Object.values(site))
        if (page.headers !== undefined) page.headers = { ...page.headers, 'strict-transport-security': value }
      return site
    }
    const live = liveSite()
    for (const page of Object.values(live)) if (page.headers !== undefined) page.headers = { ...STRICT }
    expect((await check(live, weaker('max-age=600; includeSubDomains'))).ok).toBe(false)
    expect((await check(live, weaker('max-age=63072000'))).ok).toBe(false)
    expect((await check(live, weaker('max-age=63072000; includeSubDomains; preload'))).ok).toBe(true)
  })

  test('S3.3 FR-006 a policy may change but may not loosen: no CSP directive dropped, nothing unsafe added, no blocked feature allowed', async () => {
    const live = liveSite()
    for (const page of Object.values(live)) if (page.headers !== undefined) page.headers = { ...STRICT }
    const variant = (headers: Record<string, string>) => {
      const site = candidateSite()
      for (const page of Object.values(site)) if (page.headers !== undefined) page.headers = { ...STRICT, ...headers }
      return site
    }
    expect(
      (
        await check(
          live,
          variant({
            'content-security-policy': "default-src 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'sha256-x'",
          }),
        )
      ).ok,
    ).toBe(true)
    expect((await check(live, variant({ 'content-security-policy': "default-src 'self'; object-src 'none'" }))).ok).toBe(false)
    expect(
      (
        await check(
          live,
          variant({ 'content-security-policy': "default-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'" }),
        )
      ).ok,
    ).toBe(false)
    expect((await check(live, variant({ 'permissions-policy': 'camera=(self), microphone=()' }))).ok).toBe(false)
    expect((await check(live, variant({ 'referrer-policy': 'no-referrer' }))).ok).toBe(true)
    expect((await check(live, variant({ 'referrer-policy': 'unsafe-url' }))).ok).toBe(false)
    expect((await check(live, variant({ 'x-content-type-options': '' }))).ok).toBe(false)
    // Review: any new source loosens a policy, unless it names one exact resource.
    expect(
      (
        await check(
          live,
          variant({ 'content-security-policy': "default-src 'self' https://cdn.example; object-src 'none'; frame-ancestors 'none'" }),
        )
      ).ok,
    ).toBe(false)
    expect(
      (await check(live, variant({ 'content-security-policy': "default-src 'self' blob:; object-src 'none'; frame-ancestors 'none'" }))).ok,
    ).toBe(false)
    expect(
      (await check(live, variant({ 'content-security-policy': "default-src 'self'; object-src 'sha256-x'; frame-ancestors 'none'" }))).ok,
    ).toBe(false)
    expect((await check(live, variant({ 'permissions-policy': 'microphone=()' }))).ok).toBe(false)
  })

  test('S3.3 FR-006 a feature live allows for some origins may not be allowed for more', async () => {
    const live = liveSite()
    for (const page of Object.values(live))
      if (page.headers !== undefined) page.headers = { ...STRICT, 'permissions-policy': 'camera=(self), microphone=()' }
    const variant = (policy: string) => {
      const site = candidateSite()
      for (const page of Object.values(site)) if (page.headers !== undefined) page.headers = { ...STRICT, 'permissions-policy': policy }
      return site
    }
    expect((await check(live, variant('camera=(self), microphone=()'))).ok).toBe(true)
    expect((await check(live, variant('camera=(), microphone=()'))).ok).toBe(true)
    expect((await check(live, variant('camera=*, microphone=()'))).ok).toBe(false)
    expect((await check(live, variant('camera=(self "https://other.example"), microphone=()'))).ok).toBe(false)
  })
})

describe('the words', () => {
  test('S3.4 visible words leave out tags, scripts and styles, decode entities and fold whitespace', () => {
    expect(visibleText('<p>A &amp; B</p>\n<script>x()</script><style>p{}</style><p>C&nbsp;D</p>')).toBe('A & B C D')
  })

  test("S3.4 D111 the home page may lose the Work list's second item, and only that", async () => {
    expect(visibleText(withoutSecondWorkItem(HOME(['Alpha Product', 'Beta Project'])))).toBe(visibleText(HOME(['Alpha Product'])))
    const lostFirst = { ...candidateSite(), '/': { body: HOME(['Beta Project']), headers: { ...STRICT } } }
    const result = await check(liveSite(), lostFirst)
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check .*words .* \//)
  })

  test("S3.4 FR-006 a page whose words can't be compared fails the check, unless the run says the words may change", async () => {
    const live = liveSite()
    delete live['/vindecoded-agents']
    const result = await check(live, candidateSite())
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check .*words can't be compared on \/vindecoded-agents: live answered 404/)
    expect((await check(live, candidateSite(), true)).ok).toBe(true)
  })

  test('S3.4 the words must still match after a release, when the live home page already has one item', async () => {
    const live = { ...liveSite(), '/': { body: HOME(['Alpha Product']), headers: { ...HSTS_LIVE } } }
    expect((await check(live, candidateSite())).ok).toBe(true)
  })

  test("S3.4 FR-006 any other change to the essay's words fails, unless the run says the words may change", async () => {
    const edited = { ...candidateSite(), '/vindecoded-agents': { body: ESSAY.replace('system', 'machine'), headers: { ...STRICT } } }
    const result = await check(liveSite(), edited)
    expect(result.ok).toBe(false)
    expect(result.lines.join('\n')).toMatch(/✖ check .*words .*\/vindecoded-agents/)
    expect(result.lines.join('\n')).toMatch(/system/)
    expect((await check(liveSite(), edited, true)).ok).toBe(true)
  })

  test('S3.5 FR-006 a failed check lists every miss, not just the first, and ends with how to read it', async () => {
    const candidate = candidateSite()
    delete candidate['/favicon.svg']
    delete candidate['/vindecoded-agents/']
    const result = await check(liveSite(), candidate)
    expect(result.ok).toBe(false)
    expect(result.lines.filter((line) => line.startsWith('✖ check')).length).toBeGreaterThanOrEqual(2)
    expect(result.lines.at(-1)).toMatch(/Fix:/)
  })
})
