import { existsSync, readFileSync } from 'node:fs'
import { CHAT_API_ORIGIN } from '../../../apps/chat-api/src/constants.ts'
import { describe, expect, test } from 'vitest'
import { run } from '../../001/helpers/run.ts'
import { CONFIG, REPO_ROOT } from '../helpers/paths.ts'
import { directives } from '../helpers/site.ts'

// firebase.json, the live configuration (FR-018, FR-019, S4.1, C6). The
// end-to-end tests read what the Hosting emulator serves from it; these read
// the file. Previews add noindex in a generated firebase.preview.json, so the
// committed file never holds it.

interface Header {
  key?: string
  value?: string
}

interface Hosting {
  public?: string
  cleanUrls?: boolean
  trailingSlash?: boolean
  headers?: { source?: string; headers?: Header[] }[]
  rewrites?: unknown[]
  redirects?: unknown[]
}

interface FirebaseConfig {
  hosting?: Hosting | Hosting[]
}

const config = (): FirebaseConfig => JSON.parse(readFileSync(CONFIG.firebase, 'utf8')) as FirebaseConfig

function hosting(): Hosting {
  const value = config().hosting
  expect(Array.isArray(value), 'one Hosting site').toBe(false)
  return (value as Hosting | undefined) ?? {}
}

/** The headers set on every path, by lower-case name. */
function everyPath(): Map<string, string> {
  const rule = (hosting().headers ?? []).find((entry) => entry.source === '**')
  expect(rule, 'a headers rule for **').toBeDefined()
  return new Map((rule?.headers ?? []).map((header) => [String(header.key).toLowerCase(), String(header.value)]))
}

describe("firebase.json's Hosting site", () => {
  test('S4.1 FR-019 serves the built site with clean URLs and no trailing slash, and points at the bradthome project', () => {
    expect(hosting().public).toBe('apps/site/dist')
    expect(hosting().cleanUrls).toBe(true)
    expect(hosting().trailingSlash).toBe(false)
    expect(hosting().rewrites ?? []).toEqual([])
    const rc = JSON.parse(readFileSync(CONFIG.firebaserc, 'utf8')) as { projects?: Record<string, string> }
    expect(rc.projects?.default).toBe('bradthome')
  })

  test('S4.1 FR-019 sends every security header on every path', () => {
    const headers = everyPath()
    for (const name of ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'referrer-policy', 'permissions-policy']) {
      expect(headers.get(name), name).toBeDefined()
    }
    expect(headers.get('x-content-type-options')).toBe('nosniff')
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    const hsts = headers.get('strict-transport-security') ?? ''
    expect(Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0)).toBeGreaterThanOrEqual(31_536_000)
    expect(hsts).toMatch(/includeSubDomains/)
    for (const feature of ['camera', 'microphone', 'geolocation']) expect(headers.get('permissions-policy'), feature).toMatch(new RegExp(`\\b${feature}=\\(\\)`))
  })

  test("S4.1 FR-019 C6 the policy allows only the site's own files, and inline script only by Astro's hashes", () => {
    const policy = directives(everyPath().get('content-security-policy') ?? '')
    expect(policy.get('default-src')).toEqual(["'self'"])
    expect(policy.get('object-src')).toEqual(["'none'"])
    expect(policy.get('base-uri')).toEqual(["'self'"])
    expect(policy.get('frame-ancestors')).toEqual(["'none'"])
    expect(policy.get('form-action')).toEqual(["'self'"])
    // Spec 018's analytics: one outside host, for requests only (D159).
    // Spec 023's v2.1: the chat API, for the chat's requests only (D198).
    expect(policy.get('connect-src')).toEqual(["'self'", 'https://gateway.umami.is', CHAT_API_ORIGIN])
    expect([...policy.keys()].sort()).toEqual(
      ['base-uri', 'connect-src', 'default-src', 'form-action', 'frame-ancestors', 'object-src', 'script-src', 'style-src'].sort(),
    )
    for (const name of ['script-src', 'style-src']) {
      const values = policy.get(name) ?? []
      expect(values[0], name).toBe("'self'")
      for (const value of values.slice(1)) expect(value, name).toMatch(/^'sha(?:256|384|512)-[A-Za-z0-9+/]+={0,2}'$/)
    }
    expect([...policy.values()].flat()).not.toContain("'unsafe-eval'")
    expect(policy.get('script-src') ?? []).not.toContain("'unsafe-inline'")
  })

  test('FR-018 the live configuration asks search engines nothing, and the preview copy is never committed', () => {
    expect(readFileSync(CONFIG.firebase, 'utf8')).not.toMatch(/x-robots-tag|noindex/i)
    expect(run('git', ['ls-files', '--', 'firebase.preview.json'], { cwd: REPO_ROOT, env: process.env }).stdout.trim()).toBe('')
    expect(readFileSync(`${REPO_ROOT}/.gitignore`, 'utf8')).toMatch(/^\/?firebase\.preview\.json$/m)
  })

  test('S4.2 FR-019 the site has a 404 page, in the same layout', () => {
    expect(existsSync(CONFIG.notFound)).toBe(true)
    expect(readFileSync(CONFIG.notFound, 'utf8')).toMatch(/from ['"]\.\.\/layouts\/Base\.astro['"]/)
  })
})
