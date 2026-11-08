import { describe, expect, test } from 'vitest'
import { CHALLENGE_SECONDS } from '../../../apps/chat-api/src/constants.ts'
import { ask, harness, partsOf, solved } from '../helpers/fakes.ts'

// Spec 021, Story 3: the ALTCHA check (FR-004, D172, D184).

describe('the ALTCHA check', () => {
  test('S3.1 FR-004 a solution to a challenge from /challenge is answered', async () => {
    const h = harness({ script: { cites: ['job-hopper'] } })
    const response = await ask(h)
    expect(response.status).toBe(200)
    await partsOf(response)
    expect(h.model.doStreamCalls).toHaveLength(1)
  })

  test('S3.1 the challenge expires in 5 minutes and is never cached', async () => {
    const h = harness()
    const response = await h.app.request('/challenge', { headers: { origin: 'https://bradthome--next-abc123.web.app' } })
    expect(response.headers.get('cache-control')).toBe('no-store')
    const challenge = (await response.json()) as { parameters: { expiresAt: number }; signature: string }
    expect(challenge.signature).toEqual(expect.any(String))
    expect(challenge.parameters.expiresAt).toBe(Math.floor(h.clock.now.getTime() / 1000) + CHALLENGE_SECONDS)
  })

  test('S3.2 FR-004 no solution, a garbled one, a wrong one, one signed with another key, or an expired one is 403 altcha, with no model call', async () => {
    const h = harness()
    const cases: (string | null)[] = [null, '', 'not-base64-json', Buffer.from('{"challenge":{},"solution":{}}').toString('base64')]
    const good = JSON.parse(Buffer.from(await solved(h.app), 'base64').toString()) as {
      challenge: unknown
      solution: { counter: number; derivedKey: string }
    }
    cases.push(
      Buffer.from(JSON.stringify({ ...good, solution: { ...good.solution, counter: good.solution.counter + 1 } })).toString('base64'),
    )
    const other = harness({ altchaKey: 'another-test-key-long' })
    cases.push(await solved(other.app))
    for (const altcha of cases) {
      const response = await ask(h, { altcha })
      expect(response.status, String(altcha).slice(0, 40)).toBe(403)
      expect(await response.json()).toMatchObject({ state: 'altcha' })
    }
    const late = await solved(h.app)
    h.clock.now = new Date(h.clock.now.getTime() + (CHALLENGE_SECONDS + 1) * 1000)
    const expired = await ask(h, { altcha: late })
    expect(expired.status).toBe(403)
    expect(h.model.doStreamCalls).toHaveLength(0)
  })

  test('S3.3 FR-004 the same solution twice on one instance is refused the second time', async () => {
    const h = harness({ script: { cites: ['job-hopper'] } })
    const altcha = await solved(h.app)
    const first = await ask(h, { altcha })
    expect(first.status).toBe(200)
    await partsOf(first)
    const again = await ask(h, { altcha })
    expect(again.status).toBe(403)
    expect(await again.json()).toMatchObject({ state: 'altcha' })
    expect(h.model.doStreamCalls).toHaveLength(1)
  })

  test('S3.3 FR-004 the same solution sent several times at once is answered once', async () => {
    const h = harness({ script: { cites: ['job-hopper'] } })
    const altcha = await solved(h.app)
    const responses = await Promise.all([1, 2, 3, 4].map(() => ask(h, { altcha })))
    const statuses = responses.map((response) => response.status).sort()
    expect(statuses).toEqual([200, 403, 403, 403])
    await Promise.all(responses.map((response) => response.text()))
    expect(h.model.doStreamCalls).toHaveLength(1)
  })
})
