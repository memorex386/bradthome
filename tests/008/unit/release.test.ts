import { beforeEach, describe, expect, test } from 'vitest'
import { Hosting, previousVersion, versionName } from '../../../scripts/release/hosting.ts'
import type { Context } from '../../../scripts/release/context.ts'
import { runRelease } from '../../../scripts/release/release.ts'
import { runRollback } from '../../../scripts/release/rollback.ts'
import { etagOf, urlPathFor, waitUntilServed } from '../../../scripts/release/serve.ts'
import { FakeCloud, filesOf, LIVE_URL, SITE } from '../helpers/fake-cloud.ts'

// Making a staged version live, rolling back, and proving what's served
// (spec 008, issue #29: S1.3, S1.4, S2.1, S2.2, FR-003, FR-004, FR-005).

const PAGES = ['/index.html', '/vindecoded-agents.html', '/404.html', '/favicon.svg', '/_astro/site.css', '/__/firebase/init.js']
const STAGE_URL = 'https://bradthome--release-abc.web.app'

let cloud: FakeCloud
let printed: string[]

function deps<T extends object>(extra: T) {
  return {
    hosting: new Hosting({ token: 'token', fetch: cloud.fetch }),
    fetch: cloud.fetch,
    sleep: cloud.sleep,
    now: cloud.now,
    print: (line: string) => printed.push(line),
    site: SITE,
    channel: 'live',
    url: LIVE_URL,
    timeoutMs: 600_000,
    intervalMs: 15_000,
    ...extra,
  } as Omit<Context, keyof T> & T
}

beforeEach(() => {
  cloud = new FakeCloud()
  printed = []
  cloud.addVersion('v0', filesOf('zero', ['/index.html', '/vindecoded-agents.html', '/favicon.svg']))
  cloud.addVersion('aaa', filesOf('a', PAGES))
  cloud.addVersion('bbb', filesOf('b', PAGES))
  cloud.addChannel('live', 'https://bradthome.web.app', 'v0', 'aaa')
  cloud.addChannel('release', STAGE_URL, 'bbb')
})

describe('what counts as served', () => {
  test("FR-004 a version file maps to the address Hosting serves it at, and Hosting's own and hashed asset files are still checked by hash", () => {
    expect(urlPathFor('/index.html')).toBe('/')
    expect(urlPathFor('/vindecoded-agents.html')).toBe('/vindecoded-agents')
    expect(urlPathFor('/notes/index.html')).toBe('/notes')
    expect(urlPathFor('/404.html')).toBe('/404')
    expect(urlPathFor('/favicon.svg')).toBe('/favicon.svg')
    expect(urlPathFor('/_astro/site.css')).toBe('/_astro/site.css')
    expect(urlPathFor('/__/firebase/init.js')).toBeUndefined()
  })

  test('S1.3 FR-004 a site serves a version when every file answers with its hash as the ETag', async () => {
    const files = await new Hosting({ token: 't', fetch: cloud.fetch }).files(`sites/${SITE}/versions/aaa`)
    const result = await waitUntilServed({
      base: LIVE_URL,
      files,
      fetch: cloud.fetch,
      sleep: cloud.sleep,
      now: cloud.now,
      timeoutMs: 60_000,
      intervalMs: 15_000,
    })
    expect(result.ok).toBe(true)
    const other = await new Hosting({ token: 't', fetch: cloud.fetch }).files(`sites/${SITE}/versions/bbb`)
    const wrong = await waitUntilServed({
      base: LIVE_URL,
      files: other,
      fetch: cloud.fetch,
      sleep: cloud.sleep,
      now: cloud.now,
      timeoutMs: 60_000,
      intervalMs: 15_000,
    })
    expect(wrong.ok).toBe(false)
    expect(wrong.mismatches.join('\n')).toMatch(/\/vindecoded-agents/)
  })

  test('FR-004 each request skips the edge cache, so a stale copy never passes or fails the proof', async () => {
    const files = await new Hosting({ token: 't', fetch: cloud.fetch }).files(`sites/${SITE}/versions/aaa`)
    await waitUntilServed({
      base: LIVE_URL,
      files,
      fetch: cloud.fetch,
      sleep: cloud.sleep,
      now: cloud.now,
      timeoutMs: 60_000,
      intervalMs: 15_000,
    })
    const pageRequests = cloud.requests.filter((request) => request.url.startsWith(LIVE_URL))
    expect(pageRequests.length).toBeGreaterThan(0)
    for (const request of pageRequests) expect(new URL(request.url).search, request.url).toMatch(/^\?release-check=/)
  })
})

test("S1.3 FR-004 an ETag is the file's hash whatever encoding Hosting answers with, as the rehearsal found for Brotli", () => {
  expect(etagOf('"abc123"')).toBe('abc123')
  expect(etagOf('"abc123-br"')).toBe('abc123')
  expect(etagOf('W/"abc123-gzip"')).toBe('abc123')
  expect(etagOf(null)).toBe('')
})

describe('the release job', () => {
  test('S1.3 FR-003 makes live exactly the version staged on the release channel, and proves bradthome.com serves it', async () => {
    const code = await runRelease(deps({ stagedChannel: 'release', version: `sites/${SITE}/versions/bbb`, message: 'v1.0.0' }))
    expect(code).toBe(0)
    expect(cloud.current('live')).toBe(`sites/${SITE}/versions/bbb`)
    expect(cloud.served('live')).toBe(`sites/${SITE}/versions/bbb`)
    expect(printed.join('\n')).toMatch(/✓ release .*bbb/)
    const creates = cloud.requests.filter((request) => request.method === 'POST')
    expect(creates).toHaveLength(1)
    expect(creates[0]?.url).toContain('/channels/live/releases?versionName=sites%2Fbradthome%2Fversions%2Fbbb')
  })

  test('FR-003 refuses a version that is not what the release channel holds now, and changes nothing', async () => {
    const code = await runRelease(deps({ stagedChannel: 'release', version: `sites/${SITE}/versions/aaa`, message: 'v1.0.0' }))
    expect(code).toBe(1)
    expect(cloud.current('live')).toBe(`sites/${SITE}/versions/aaa`)
    expect(cloud.requests.filter((request) => request.method === 'POST')).toHaveLength(0)
    expect(printed.join('\n')).toMatch(/✖ release .*isn't what the release channel holds/)
  })

  test('S1.3 FR-004 waits while the new version reaches the edge, checking every 15 seconds', async () => {
    cloud.lagMs = 90_000
    const code = await runRelease(deps({ stagedChannel: 'release', version: `sites/${SITE}/versions/bbb`, message: 'v1.0.0' }))
    expect(code).toBe(0)
    expect(cloud.clock).toBeGreaterThanOrEqual(90_000)
    expect(cloud.clock).toBeLessThan(90_000 + 30_000)
  })

  test('S1.4 FR-004 when the new version is not served within 10 minutes, puts the previous version back, proves it, and fails', async () => {
    cloud.neverServes.add(`sites/${SITE}/versions/bbb`)
    const code = await runRelease(deps({ stagedChannel: 'release', version: `sites/${SITE}/versions/bbb`, message: 'v1.0.0' }))
    expect(code).toBe(1)
    expect(cloud.clock).toBeGreaterThanOrEqual(600_000)
    expect(cloud.current('live')).toBe(`sites/${SITE}/versions/aaa`)
    expect(cloud.served('live')).toBe(`sites/${SITE}/versions/aaa`)
    const out = printed.join('\n')
    expect(out).toMatch(/✖ release .*not served within 10 minutes/)
    expect(out).toMatch(/✓ rollback .*aaa.* is served again/)
  })

  test('S1.4 FR-004 when the release has no clear answer, it puts the previous version back, proves it, and fails', async () => {
    cloud.dropNextReleaseAnswer = true
    const code = await runRelease(deps({ stagedChannel: 'release', version: `sites/${SITE}/versions/bbb`, message: 'v1.0.0' }))
    expect(code).toBe(1)
    expect(cloud.current('live')).toBe(`sites/${SITE}/versions/aaa`)
    expect(cloud.served('live')).toBe(`sites/${SITE}/versions/aaa`)
    const out = printed.join('\n')
    expect(out).toMatch(/✖ release .*may or may not have happened/)
    expect(out).toMatch(/✓ rollback .*aaa.* is served again/)
  })

  test('S1.4 when Hosting refuses the release, nothing changed, so it fails without rolling back', async () => {
    cloud.refuseReleases = 403
    const code = await runRelease(deps({ stagedChannel: 'release', version: `sites/${SITE}/versions/bbb`, message: 'v1.0.0' }))
    expect(code).toBe(1)
    expect(cloud.current('live')).toBe(`sites/${SITE}/versions/aaa`)
    expect(printed.join('\n')).toMatch(/✖ release .*HTTP 403/)
  })
})

describe('rollback', () => {
  test('S2.1 FR-005 by default makes the version live before the current one live again, and proves it is served', async () => {
    const code = await runRollback(deps({}))
    expect(code).toBe(0)
    expect(cloud.current('live')).toBe(`sites/${SITE}/versions/v0`)
    expect(cloud.served('live')).toBe(`sites/${SITE}/versions/v0`)
    expect(printed.join('\n')).toMatch(/✓ rollback .*v0.* is served/)
  })

  test('S2.1 FR-005 the previous version skips releases of the current version and versions Hosting has deleted', () => {
    const release = (version: string, status = 'FINALIZED') => ({
      name: 'r',
      releaseTime: '',
      version: { name: `sites/${SITE}/versions/${version}`, status },
    })
    expect(previousVersion([release('c'), release('c'), release('b', 'DELETED'), release('a')])).toBe(`sites/${SITE}/versions/a`)
    expect(previousVersion([release('c')])).toBeUndefined()
    expect(previousVersion([])).toBeUndefined()
  })

  test('S2.2 makes a named version live, by its ID or its full name', async () => {
    expect(versionName(SITE, 'bbb')).toBe(`sites/${SITE}/versions/bbb`)
    expect(versionName(SITE, `sites/${SITE}/versions/bbb`)).toBe(`sites/${SITE}/versions/bbb`)
    expect(() => versionName(SITE, 'sites/other/versions/bbb')).toThrow()
    expect(() => versionName(SITE, 'bb b')).toThrow()
    expect(await runRollback(deps({ version: 'bbb' }))).toBe(0)
    expect(cloud.served('live')).toBe(`sites/${SITE}/versions/bbb`)
  })

  test('S2.2 refuses a version that is not a finalized version of the site, and changes nothing', async () => {
    cloud.addVersion('gone', filesOf('g', PAGES), 'DELETED')
    for (const version of ['gone', 'missing']) {
      printed = []
      expect(await runRollback(deps({ version })), version).toBe(1)
      expect(printed.join('\n')).toMatch(/✖ rollback .*isn't a finalized version/)
    }
    expect(cloud.current('live')).toBe(`sites/${SITE}/versions/aaa`)
    expect(cloud.requests.filter((request) => request.method === 'POST')).toHaveLength(0)
  })

  test('S2.1 refuses when there is no earlier version to go back to', async () => {
    cloud.addChannel('fresh', 'https://bradthome--fresh.web.app', 'aaa')
    expect(await runRollback(deps({ channel: 'fresh', url: 'https://bradthome--fresh.web.app' }))).toBe(1)
    expect(printed.join('\n')).toMatch(/✖ rollback .*no earlier version/)
  })

  test('S2.3 works on any channel the same way, so the rehearsal on a preview channel runs the same code as the live one', async () => {
    cloud.addChannel('rehearsal', 'https://bradthome--rehearsal.web.app', 'aaa', 'bbb')
    expect(await runRollback(deps({ channel: 'rehearsal', url: 'https://bradthome--rehearsal.web.app' }))).toBe(0)
    expect(cloud.served('rehearsal')).toBe(`sites/${SITE}/versions/aaa`)
    expect(cloud.current('live')).toBe(`sites/${SITE}/versions/aaa`)
    expect(
      cloud.requests.filter((request) => request.method === 'POST').every((request) => request.url.includes('/channels/rehearsal/')),
    ).toBe(true)
  })
})

describe('the Hosting client', () => {
  test('FR-007 sends the token as a bearer header, and a quota project only when one is given', async () => {
    await new Hosting({ token: 'secret-token', fetch: cloud.fetch }).channel(SITE, 'live')
    await new Hosting({ token: 'user-token', fetch: cloud.fetch, quotaProject: SITE }).channel(SITE, 'live')
    const [first, second] = cloud.requests
    expect(first?.authorization).toBe('Bearer secret-token')
    expect(first?.quotaProject).toBeNull()
    expect(second?.quotaProject).toBe(SITE)
  })

  test("FR-005 reads every page of a channel's release history, newest first", async () => {
    cloud.addChannel('long', 'https://x.web.app')
    const hosting = new Hosting({ token: 't', fetch: cloud.fetch })
    for (let index = 0; index < 120; index += 1)
      await hosting.release(SITE, 'long', `sites/${SITE}/versions/${index % 2 === 0 ? 'aaa' : 'bbb'}`)
    const releases = await hosting.releases(SITE, 'long')
    expect(releases).toHaveLength(120)
    expect(releases[0]?.version.name).toBe(`sites/${SITE}/versions/bbb`)
  })
})
