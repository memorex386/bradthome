import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { previewConfig } from '../../../scripts/ci/preview-deploy.ts'
import { CHAT_API_ORIGIN } from '../../../apps/chat-api/src/constants.ts'

// Spec 021, S1.4 and FR-002 (D183): the preview and next deploys' copy of
// firebase.json holds the API's one origin in connect-src. Since v2.1
// firebase.json, which live serves, names it too (spec 023, D198), so the
// copy adds nothing.

const LIVE = readFileSync('firebase.json', 'utf8')
const policyOf = (config: unknown): string => {
  const rules = (config as { hosting: { headers: { source: string; headers: { key: string; value: string }[] }[] } }).hosting.headers
  const header = rules.find((rule) => rule.source === '**')?.headers.find((h) => h.key === 'Content-Security-Policy')
  if (header === undefined) throw new Error('no CSP')
  return header.value
}
const directive = (policy: string, name: string) =>
  policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `))

describe('the preview and next CSP', () => {
  test('S1.4 FR-002 the API origin is the chat-api service on Cloud Run', () => {
    expect(CHAT_API_ORIGIN).toMatch(/^https:\/\/chat-api-\d+\.us-central1\.run\.app$/)
  })

  test("S1.4 FR-002 connect-src holds the API's origin once, and every other directive is firebase.json's", () => {
    const live = JSON.parse(LIVE) as unknown
    const livePolicy = policyOf(live)
    const previewPolicy = policyOf(previewConfig(live))
    // Since v2.1 firebase.json names the API itself (spec 023, D198), so the preview adds nothing.
    expect(directive(previewPolicy, 'connect-src')).toBe(directive(livePolicy, 'connect-src'))
    expect(directive(previewPolicy, 'connect-src')?.split(' ').filter((host) => host === CHAT_API_ORIGIN)).toHaveLength(1)
    const others = (policy: string) =>
      policy
        .split(';')
        .map((part) => part.trim())
        .filter((part) => !part.startsWith('connect-src '))
    expect(others(previewPolicy)).toEqual(others(livePolicy))
  })

  test("S1.4 FR-002 S6.2 FR-013 firebase.json names the API in connect-src only, and previewConfig leaves its input unchanged", () => {
    expect(directive(policyOf(JSON.parse(LIVE) as unknown), 'connect-src')).toContain(CHAT_API_ORIGIN)
    expect(LIVE.split('run.app').length - 1).toBe(1)
    const live = JSON.parse(LIVE) as unknown
    previewConfig(live)
    expect(JSON.stringify(live, null, 2)).toBe(JSON.stringify(JSON.parse(LIVE), null, 2))
  })
})
