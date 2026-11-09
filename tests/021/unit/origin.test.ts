import { describe, expect, test } from 'vitest'
import { isAllowedOrigin } from '../../../apps/chat-api/src/origin.ts'
import { ask, harness, NEXT, PREVIEW } from '../helpers/fakes.ts'

// Spec 021, Story 1: previews and next reach the API (FR-001, D183), and from
// v2.1 bradthome.com too (spec 023's S6.3, D198).

const LIVE = 'https://bradthome.com'

const REFUSED = [
  'https://www.bradthome.com',
  'https://bradthome.web.app',
  'https://bradthome.firebaseapp.com',
  'https://other--next-x.web.app',
  'https://bradthome--next-abc.web.app.evil.example',
  'http://bradthome--next-abc.web.app',
  'https://evil.example/https://bradthome--next-abc.web.app',
]

describe('which origins are allowed', () => {
  test('S1.1 FR-001 allows next and pull request channels of the bradthome site, and S6.3 FR-014 bradthome.com', () => {
    expect(isAllowedOrigin(NEXT)).toBe(true)
    expect(isAllowedOrigin(PREVIEW)).toBe(true)
    expect(isAllowedOrigin(LIVE)).toBe(true)
  })

  test('S1.2 FR-001 S6.3 FR-014 refuses www, the live Hosting domains, other sites and a missing origin', () => {
    for (const origin of REFUSED) expect(isAllowedOrigin(origin), origin).toBe(false)
    expect(isAllowedOrigin(undefined)).toBe(false)
    expect(isAllowedOrigin('')).toBe(false)
  })
})

describe('the app', () => {
  test('S1.1 FR-001 answers /challenge and /chat from next and a preview, with that origin in Access-Control-Allow-Origin', async () => {
    for (const origin of [NEXT, PREVIEW, LIVE]) {
      const h = harness({ script: { cites: ['job-hopper'] } })
      const challenge = await h.app.request('/challenge', { headers: { origin } })
      expect(challenge.status).toBe(200)
      expect(challenge.headers.get('access-control-allow-origin')).toBe(origin)
      const response = await ask(h, { origin })
      expect(response.status).toBe(200)
      expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    }
  })

  test('S1.2 FR-001 refuses every other origin, or none, with 403 origin, no CORS header and no model call', async () => {
    for (const origin of [...REFUSED, null]) {
      const h = harness()
      const challenge = await h.app.request('/challenge', { headers: origin === null ? {} : { origin } })
      expect(challenge.status, String(origin)).toBe(403)
      expect(challenge.headers.get('access-control-allow-origin')).toBeNull()
      const response = await ask(h, { origin, altcha: 'unused' })
      expect(response.status, String(origin)).toBe(403)
      expect(response.headers.get('access-control-allow-origin')).toBeNull()
      expect(await response.json()).toMatchObject({ state: 'origin' })
      expect(h.model.doStreamCalls).toHaveLength(0)
    }
  })

  test('S1.3 a preflight from an allowed origin allows POST with Content-Type only, and from another origin it is refused', async () => {
    const h = harness()
    const preflight = (origin: string) =>
      h.app.request('/chat', {
        method: 'OPTIONS',
        headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
      })
    const allowed = await preflight(NEXT)
    expect(allowed.status).toBeLessThan(300)
    expect(allowed.headers.get('access-control-allow-origin')).toBe(NEXT)
    expect(
      allowed.headers
        .get('access-control-allow-methods')
        ?.split(',')
        .map((m) => m.trim()),
    ).toEqual(expect.arrayContaining(['POST']))
    expect(allowed.headers.get('access-control-allow-methods')).not.toMatch(/PUT|DELETE|PATCH/)
    expect(allowed.headers.get('access-control-allow-headers')?.toLowerCase()).toBe('content-type')
    expect(allowed.headers.get('access-control-allow-credentials')).toBeNull()
    const refused = await preflight('https://www.bradthome.com')
    expect(refused.status).toBe(403)
    expect(refused.headers.get('access-control-allow-origin')).toBeNull()
  })

  test('S1.2 an unknown path is 404, and /health is 200 with no body', async () => {
    const h = harness()
    expect((await h.app.request('/nothing', { headers: { origin: NEXT } })).status).toBe(404)
    const health = await h.app.request('/health')
    expect(health.status).toBe(200)
    expect(await health.text()).toBe('')
  })
})
