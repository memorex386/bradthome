import { describe, expect, test } from 'vitest'
import { loadCsp } from '../helpers/modules.ts'
import { directives } from '../helpers/site.ts'

// The Content-Security-Policy header (FR-019, S4.1, C6). Astro's security.csp
// writes each page's script and style hashes in a meta tag. pnpm csp gathers
// them into firebase.json's header, and pnpm csp --check fails the build job
// when the file is out of date.

const SCRIPT_A = "'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='"
const SCRIPT_B = "'sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='"
const STYLE_A = "'sha256-CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC='"

function page(scripts: string[], styles: string[]): string {
  const content = `script-src 'self' ${scripts.join(' ')}; style-src 'self' ${styles.join(' ')}`
  return `<!doctype html><html lang="en"><head><meta http-equiv="content-security-policy" content="${content}"><title>Brad Thome</title></head><body></body></html>`
}

function config(policy: string | undefined): unknown {
  const headers = [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
  ]
  if (policy !== undefined) headers.unshift({ key: 'Content-Security-Policy', value: policy })
  return { hosting: { public: 'apps/site/dist', headers: [{ source: '**', headers }] } }
}

function headerOf(value: unknown, key: string): string | undefined {
  const hosting = (value as { hosting?: { headers?: { source?: string; headers?: { key: string; value: string }[] }[] } }).hosting
  return hosting?.headers?.find((rule) => rule.source === '**')?.headers?.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value
}

describe('the policy', () => {
  test("S4.1 FR-019 allows only the site's own files, plus every hash Astro wrote, each once", async () => {
    const { pagePolicy } = await loadCsp()
    const policy = directives(pagePolicy([page([SCRIPT_A], [STYLE_A]), page([SCRIPT_A, SCRIPT_B], [])]))
    expect(policy.get('default-src')).toEqual(["'self'"])
    expect(policy.get('object-src')).toEqual(["'none'"])
    expect(policy.get('base-uri')).toEqual(["'self'"])
    expect(policy.get('frame-ancestors')).toEqual(["'none'"])
    expect(policy.get('form-action')).toEqual(["'self'"])
    expect(policy.get('script-src')?.[0]).toBe("'self'")
    expect([...(policy.get('script-src') ?? [])].sort()).toEqual(["'self'", SCRIPT_A, SCRIPT_B].sort())
    expect(policy.get('style-src')).toEqual(["'self'", STYLE_A])
  })

  test('S4.1 FR-019 C6 never allows inline script or eval, even with no hashes at all', async () => {
    const { pagePolicy } = await loadCsp()
    for (const pages of [[], ['<!doctype html><html lang="en"><head><title>x</title></head></html>'], [page([SCRIPT_A], [])]]) {
      const text = pagePolicy(pages)
      expect(text).not.toMatch(/'unsafe-inline'|'unsafe-eval'|'unsafe-hashes'|\*/)
      expect(directives(text).get('script-src')?.[0]).toBe("'self'")
    }
  })

  test('S4.1 FR-019 the same pages give the same policy, whatever order they come in', async () => {
    const { pagePolicy } = await loadCsp()
    const one = page([SCRIPT_B], [STYLE_A])
    const two = page([SCRIPT_A], [])
    expect(pagePolicy([one, two])).toBe(pagePolicy([two, one]))
  })
})

describe('firebase.json', () => {
  test('S4.1 FR-019 pnpm csp sets the header on every path and leaves the other headers alone', async () => {
    const { applyPolicy, pagePolicy } = await loadCsp()
    const policy = pagePolicy([page([SCRIPT_A], [STYLE_A])])
    for (const start of [config(undefined), config("default-src 'self'; script-src 'self' 'sha256-old='")]) {
      const updated = applyPolicy(start, policy)
      expect(headerOf(updated, 'Content-Security-Policy')).toBe(policy)
      expect(headerOf(updated, 'X-Content-Type-Options')).toBe('nosniff')
      expect(headerOf(updated, 'Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains')
    }
  })

  test('S4.1 FR-019 C6 pnpm csp --check passes a current file and fails a stale one, naming the fix', async () => {
    const { applyPolicy, pagePolicy, policyProblems } = await loadCsp()
    const policy = pagePolicy([page([SCRIPT_A], [STYLE_A])])
    expect(policyProblems(applyPolicy(config(undefined), policy), policy)).toEqual([])
    for (const stale of [config(undefined), config(pagePolicy([page([SCRIPT_B], [])]))]) {
      const lines = policyProblems(stale, policy)
      expect(lines[0]).toMatch(/^✖ build {2}\S.*Content-Security-Policy/)
      expect(lines.at(-1)).toMatch(/^ {2}Fix: pnpm csp\b/)
    }
  })
})
