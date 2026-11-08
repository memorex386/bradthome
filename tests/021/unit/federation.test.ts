import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { createApp } from '../../../apps/chat-api/src/app.ts'
import { FEDERATION, MODEL, SECRETS, SERVICE_ACCOUNT } from '../../../apps/chat-api/src/constants.ts'
import { federatedToken } from '../../../apps/chat-api/src/federation.ts'
import { createAnthropic } from '../../../apps/chat-api/src/testing.ts'
import { ALTCHA_KEY, ask, CORPUS, fakeStore, NOW, partsOf, solved } from '../helpers/fakes.ts'

// Spec 021, S8.4 and FR-013: the API signs in to Anthropic through workload
// identity federation (D187). Every request goes to a fake fetch, so nothing
// reaches the metadata server or Anthropic.

const METADATA =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=https%3A%2F%2Fapi.anthropic.com&format=full'
const EXCHANGE = 'https://api.anthropic.com/v1/oauth/token'
const MESSAGES = 'https://api.anthropic.com/v1/messages'

interface Call {
  url: string
  headers: Record<string, string>
  body?: unknown
}

/** A fetch that answers the metadata server and the exchange, numbering each identity and access token. */
function fakeNetwork(options: { exchange?: () => Response; expiresIn?: number } = {}) {
  const calls: Call[] = []
  let identities = 0
  let tokens = 0
  const fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = String(input)
    const headers = Object.fromEntries(new Headers(init.headers).entries())
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
    calls.push({ url, headers, body })
    if (url === METADATA) return new Response(`google-identity-${++identities}`)
    if (url === EXCHANGE) {
      if (options.exchange !== undefined) return options.exchange()
      return Response.json({
        access_token: `sk-ant-oat01-fake-${++tokens}`,
        token_type: 'Bearer',
        expires_in: options.expiresIn ?? 600,
        scope: 'workspace:developer',
      })
    }
    throw new Error(`unexpected request: ${url}`)
  }
  return { fetch, calls, exchanges: () => calls.filter((c) => c.url === EXCHANGE) }
}

describe('the token exchange', () => {
  test('S8.4 FR-013 asks the metadata server for its own Google identity token and exchanges it under the bradthome-chat-api rule', async () => {
    const net = fakeNetwork()
    const token = await federatedToken({ fetch: net.fetch, now: () => 0 })()
    expect(token).toBe('sk-ant-oat01-fake-1')
    expect(net.calls[0]).toMatchObject({ url: METADATA, headers: { 'metadata-flavor': 'Google' } })
    expect(net.calls[1]).toMatchObject({ url: EXCHANGE, headers: { 'content-type': 'application/json' } })
    expect(net.calls[1]?.body).toEqual({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: 'google-identity-1',
      federation_rule_id: 'fdrl_01HqjropRhoKKwfdHHzXd8qd',
      organization_id: 'f0c47680-aa73-4e85-84f6-a4b05edb2784',
      service_account_id: 'svac_011YsyXoeXTBguFPG9nuE3So',
      workspace_id: 'wrkspc_01Ey3gkgFgkmbe6Z42Acx5aS',
    })
    expect(FEDERATION.googleServiceAccount).toBe(SERVICE_ACCOUNT)
  })

  test('S8.4 reuses the token until 2 minutes before it expires, then exchanges a fresh identity token', async () => {
    let now = 0
    const net = fakeNetwork({ expiresIn: 600 })
    const token = federatedToken({ fetch: net.fetch, now: () => now })
    expect(await token()).toBe('sk-ant-oat01-fake-1')
    now = 479_000
    expect(await token()).toBe('sk-ant-oat01-fake-1')
    expect(net.exchanges()).toHaveLength(1)
    now = 480_000
    expect(await token()).toBe('sk-ant-oat01-fake-2')
    expect(net.exchanges().map((c) => (c.body as { assertion: string }).assertion)).toEqual(['google-identity-1', 'google-identity-2'])
  })

  test('S8.4 questions at the same moment share one exchange', async () => {
    const net = fakeNetwork()
    const token = federatedToken({ fetch: net.fetch, now: () => 0 })
    const tokens = await Promise.all([token(), token(), token()])
    expect(new Set(tokens)).toEqual(new Set(['sk-ant-oat01-fake-1']))
    expect(net.exchanges()).toHaveLength(1)
  })

  test('S8.4 a refused exchange throws without the identity token or the reply, and the next question tries again', async () => {
    let refuse = true
    const net = fakeNetwork({
      exchange: () =>
        refuse
          ? Response.json({ type: 'error', error: { type: 'authentication_error', message: 'Authentication failed' } }, { status: 401 })
          : Response.json({ access_token: 'sk-ant-oat01-fake-ok', token_type: 'Bearer', expires_in: 600 }),
    })
    const token = federatedToken({ fetch: net.fetch, now: () => 0 })
    const error = await token().then(
      () => undefined,
      (e: unknown) => e as Error,
    )
    expect(error?.message).toBe('The Anthropic token exchange answered 401.')
    expect(error?.message).not.toContain('google-identity')
    refuse = false
    expect(await token()).toBe('sk-ant-oat01-fake-ok')
  })

  test('S8.4 an exchange reply without a token is refused', async () => {
    const net = fakeNetwork({ exchange: () => Response.json({ token_type: 'Bearer' }) })
    await expect(federatedToken({ fetch: net.fetch, now: () => 0 })()).rejects.toThrow('no token')
  })
})

describe('the provider', () => {
  const sse = (events: object[]) =>
    events.map((event) => `event: ${(event as { type: string }).type}\ndata: ${JSON.stringify(event)}\n\n`).join('')
  const ANSWER = sse([
    {
      type: 'message_start',
      message: {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: MODEL,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 200, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Brad launched a purchase flow.' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 9 } },
    { type: 'message_stop' },
  ])

  async function answer(exchange?: () => Response) {
    const net = fakeNetwork(exchange === undefined ? {} : { exchange })
    const messages: Call[] = []
    const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
      if (String(input) !== MESSAGES) return net.fetch(input, init)
      messages.push({ url: String(input), headers: Object.fromEntries(new Headers(init.headers).entries()) })
      return new Response(ANSWER, { headers: { 'content-type': 'text/event-stream' } })
    }
    const lines: string[] = []
    const spend = fakeStore()
    const app = createApp({
      model: createAnthropic({ authToken: federatedToken({ fetch, now: () => 0 }), fetch: fetch as typeof globalThis.fetch })(MODEL),
      modelId: MODEL,
      store: spend.store,
      corpus: CORPUS,
      altchaKey: ALTCHA_KEY,
      altchaCost: { cost: 1, maxCounter: 20 },
      write: (line) => lines.push(line),
    })
    const response = await ask({ app, model: undefined as never, spend, lines, clock: { now: NOW } }, { altcha: await solved(app) })
    return { parts: await partsOf(response), lines, messages }
  }

  test('S8.4 FR-013 the model call carries the exchanged token as a bearer token, and no API key', async () => {
    const result = await answer()
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]?.headers.authorization).toBe('Bearer sk-ant-oat01-fake-1')
    expect(result.messages[0]?.headers['x-api-key']).toBeUndefined()
    expect(JSON.parse(result.lines.at(-1) ?? '{}')).toMatchObject({ state: 'no-source', outputTokens: 9 })
  })

  test('S8.4 a failed exchange answers failed, and no token reaches a log line or the visitor', async () => {
    const result = await answer(() => new Response('{"error":"google-identity-1 refused"}', { status: 401 }))
    expect(result.messages).toHaveLength(0)
    expect(result.parts.find((p) => p.type === 'error')).toEqual({ type: 'error', errorText: 'failed' })
    expect(JSON.parse(result.lines.at(-1) ?? '{}')).toMatchObject({ state: 'failed', costUsd: 0 })
    expect(JSON.stringify([result.parts, result.lines])).not.toMatch(/google-identity|sk-ant-/)
  })
})

describe('no Anthropic key', () => {
  test('FR-013 the server reads no Anthropic key, and only the ALTCHA secret is in Secret Manager', () => {
    const server = readFileSync('apps/chat-api/src/server.ts', 'utf8')
    expect(server).not.toMatch(/ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|apiKey/)
    expect(server).toMatch(/authToken: federatedToken\(\)/)
    expect(SECRETS).toEqual({ altcha: 'chat-altcha-key' })
  })
})
