import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { previewConfig } from '../../../scripts/ci/preview-deploy.ts'
import { CHAT_API_ORIGIN } from '../../../apps/chat-api/src/constants.ts'

// Spec 021, S1.4 and FR-002 (D183): the preview and next deploys' copy of
// firebase.json adds the API's one origin to connect-src, and firebase.json,
// which live and the release channel serve, doesn't name it.

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

  test("S1.4 FR-002 connect-src is firebase.json's plus exactly the API's origin, and every other directive is unchanged", () => {
    const live = JSON.parse(LIVE) as unknown
    const livePolicy = policyOf(live)
    const previewPolicy = policyOf(previewConfig(live))
    expect(directive(previewPolicy, 'connect-src')).toBe(`${directive(livePolicy, 'connect-src')} ${CHAT_API_ORIGIN}`)
    const others = (policy: string) =>
      policy
        .split(';')
        .map((part) => part.trim())
        .filter((part) => !part.startsWith('connect-src '))
    expect(others(previewPolicy)).toEqual(others(livePolicy))
  })

  test("S1.4 FR-002 firebase.json itself doesn't name the API, and previewConfig leaves its input unchanged", () => {
    expect(LIVE).not.toContain('run.app')
    const live = JSON.parse(LIVE) as unknown
    previewConfig(live)
    expect(JSON.stringify(live, null, 2)).toBe(JSON.stringify(JSON.parse(LIVE), null, 2))
  })
})
