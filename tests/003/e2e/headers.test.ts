import { expect, test } from '@playwright/test'
import { MISSING } from '../helpers/e2e.ts'
import { loadSiteReport, type MissingHeader } from '../helpers/modules.ts'
import { directives } from '../helpers/site.ts'

// The headers Hosting sends (FR-018, FR-019, S3.6, S4.1, S4.2, C6), read from
// the Hosting emulator serving the build with firebase.json. This runs only in
// the Linux container: on Windows the emulator drops every header (plan). A
// failure prints C6's message.

const REQUIRED = ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']
const PATHS = ['/', MISSING, '/index.html']

test('S4.1 FR-019 C6 every response carries the five security headers, on a page, the 404 page and a redirect', async ({ request }) => {
  const { headersMessage } = await loadSiteReport()
  const missing: MissingHeader[] = []
  for (const path of PATHS) {
    const response = await request.get(path, { maxRedirects: 0 })
    const headers = response.headers()
    for (const header of REQUIRED) if (headers[header.toLowerCase()] === undefined) missing.push({ path, header })
  }
  expect(missing, headersMessage(missing).join('\n')).toEqual([])
})

test("S4.1 FR-019 C6 the policy allows inline script only by hash, and covers every hash Astro wrote in the page", async ({ request, page }) => {
  const response = await request.get('/')
  const policy = directives(response.headers()['content-security-policy'] ?? '')
  expect(policy.get('script-src') ?? []).not.toContain("'unsafe-inline'")
  expect(policy.get('default-src')).toEqual(["'self'"])
  await page.goto('/')
  const meta = (await page.locator('meta[http-equiv="content-security-policy" i]').getAttribute('content')) ?? ''
  for (const [name, values] of directives(meta)) {
    if (name !== 'script-src' && name !== 'style-src') continue
    for (const hash of values.filter((value) => value.startsWith("'sha"))) expect(policy.get(name) ?? [], `${name} ${hash}`).toContain(hash)
  }
})

test('S4.1 FR-019 HSTS, nosniff and the referrer policy have their values', async ({ request }) => {
  const headers = (await request.get('/')).headers()
  expect(Number(/max-age=(\d+)/.exec(headers['strict-transport-security'] ?? '')?.[1] ?? 0)).toBeGreaterThanOrEqual(31_536_000)
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
})

test('S3.6 FR-018 the live configuration sends no noindex, which only previews add', async ({ request }) => {
  for (const path of PATHS) {
    const headers = (await request.get(path, { maxRedirects: 0 })).headers()
    expect(headers['x-robots-tag'], path).toBeUndefined()
  }
})

test('S4.2 FR-019 a missing path answers 404 with the site\'s own 404 page', async ({ request }) => {
  const response = await request.get(MISSING)
  expect(response.status()).toBe(404)
  expect(response.headers()['content-type']).toMatch(/text\/html/)
  expect(await response.text()).toMatch(/<html[^>]*\blang="en"/)
})
