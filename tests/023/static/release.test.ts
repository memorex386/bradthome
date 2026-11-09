import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { CHAT_API_ORIGIN } from '../../../apps/chat-api/src/constants.ts'
import { isAllowedOrigin } from '../../../apps/chat-api/src/origin.ts'
import { SECTIONS } from '../../../apps/site/src/components/privacy/privacy.ts'
import { INSPECT } from '../../../apps/site/src/components/chat/words.ts'

// Spec 023, Story 6 and FR-010: v2.1 puts the chat on bradthome.com. The
// flag is gone, live's CSP and the API let bradthome.com call it, the privacy
// note describes the live chat, and the footer and Inspect link /evals.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')

function filesUnder(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    if (name === 'node_modules' || name === 'dist') return []
    return statSync(full).isDirectory() ? filesUnder(full) : [full]
  })
}

describe('v2.1', () => {
  test('S6.1 FR-012 the release flag and everything that read it are gone', () => {
    expect(existsSync(path.join(ROOT, 'scripts', 'site', 'release.ts'))).toBe(false)
    expect(existsSync(path.join(ROOT, 'scripts', 'site', 'empty.css'))).toBe(false)
    const sources = [
      ...filesUnder(path.join(ROOT, 'apps', 'site', 'src')),
      ...filesUnder(path.join(ROOT, '.github')),
      ...filesUnder(path.join(ROOT, 'scripts')),
    ]
    sources.push(path.join(ROOT, 'apps', 'site', 'astro.config.mjs'))
    for (const file of sources.filter((name) => /\.(ts|tsx|mjs|astro|ya?ml)$/.test(name))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/BRADTHOME_RELEASE|__BRADTHOME_CHAT__|isRelease\(|chatDefine|chatAliases/)
    }
  })

  test("S6.2 FR-013 live's CSP adds only the chat API's address, to connect-src", () => {
    const config = JSON.parse(read('firebase.json')) as {
      hosting: { headers: { source: string; headers: { key: string; value: string }[] }[] }
    }
    const policy =
      config.hosting.headers.flatMap((rule) => rule.headers).find((header) => header.key === 'Content-Security-Policy')?.value ?? ''
    const connect = policy
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('connect-src '))
    expect(connect).toBe(`connect-src 'self' https://gateway.umami.is ${CHAT_API_ORIGIN}`)
    expect(policy.split(CHAT_API_ORIGIN)).toHaveLength(2)
  })

  test('S6.3 FR-014 the API allows bradthome.com, previews and next, and still refuses other origins', () => {
    expect(isAllowedOrigin('https://bradthome.com')).toBe(true)
    expect(isAllowedOrigin('https://bradthome--next-abc.web.app')).toBe(true)
    for (const origin of [
      'https://www.bradthome.com',
      'http://bradthome.com',
      'https://bradthome.web.app',
      'https://bradthome.com.evil.example',
    ]) {
      expect(isAllowedOrigin(origin), origin).toBe(false)
    }
  })

  test('S6.4 FR-015 the privacy note describes the chat as live', () => {
    const chat = SECTIONS.find((section) => section.id === 'chat')
    const words = [...(chat?.paragraphs ?? []), ...(chat?.items ?? [])].join(' ')
    expect(words).not.toMatch(/\byet\b|when it is/i)
    expect(words).toMatch(/Anthropic/)
  })

  test('S4.3 FR-010 the footer and Inspect link /evals', () => {
    expect(read('apps', 'site', 'src', 'components', 'ds', 'Footer.astro')).toMatch(/<a class="ds-footer__evals" href="\/evals">/)
    expect(INSPECT.evalsHref).toBe('/evals')
    // Inspect moved to parts.tsx in spec 024, so prep's result shares it.
    expect(read('apps', 'site', 'src', 'components', 'chat', 'parts.tsx')).toMatch(/href=\{INSPECT\.evalsHref\}/)
  })
})
