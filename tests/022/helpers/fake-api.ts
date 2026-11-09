import type { Page, Request, Route } from '@playwright/test'
import { createAltcha } from '../../../apps/chat-api/src/altcha.ts'
import { CHAT_API_ORIGIN } from '../../../apps/chat-api/src/constants.ts'
import { BOUNDARY, NO_SOURCE } from '../../../apps/chat-api/src/prompt.ts'
import { ANSWER, META, SOURCES } from '../../../apps/site/src/components/chat/fixtures.ts'
import type { Meta, Source } from '../../../apps/site/src/components/chat/types.ts'
import { withChatApi } from '../../../scripts/ci/preview-deploy.ts'

// Spec 022's fake API, for the end-to-end tests in the pinned container. It
// answers the window's requests to the chat API's origin in the browser, with
// spec 021's shapes: a real ALTCHA challenge (at the lowest cost), refusals as
// JSON, and answers as a UI message stream. The page's own policy gets the
// API's origin in connect-src, as previews and next serve it (D183), since the
// emulator serves firebase.json's, which live keeps without it.

export { ANSWER, CHAT_API_ORIGIN, META, SOURCES }

export type Reply =
  | { kind: 'answer'; text?: string; sources?: Source[]; meta?: Partial<Meta> }
  | { kind: 'no-source' }
  | { kind: 'boundary' }
  | { kind: 'refuse'; status: number; body: Record<string, string> }
  | { kind: 'error' }
  /** Never answers, so the window stays where it is. */
  | { kind: 'hold' }

export interface FakeApi {
  /** Each question's body, as the window posted it. */
  posted: { altcha: string; messages: { role: string; parts: { type: string; text: string }[] }[] }[]
  /** Each request the page made to the API, by path. */
  paths: string[]
  /** Holds or fails the next challenge. */
  challenge: 'ok' | 'hold' | 'fail' | 'origin'
}

const altcha = createAltcha('a-test-key-that-is-long-enough', { cost: 1, maxCounter: 20 })
const sse = (part: unknown) => `data: ${JSON.stringify(part)}\n\n`

/** The stream the API sends for an answer. */
export function streamOf(text: string, sources: readonly Source[], meta: Meta): string {
  return [
    sse({ type: 'start' }),
    sse({ type: 'text-start', id: 't' }),
    ...text.split(/(?<= )/).map((delta) => sse({ type: 'text-delta', id: 't', delta })),
    sse({ type: 'text-end', id: 't' }),
    ...sources.map((source) => sse({ type: 'source-url', sourceId: source.id, url: source.url, title: source.label })),
    sse({ type: 'data-meta', data: meta }),
    sse({ type: 'finish' }),
    'data: [DONE]\n\n',
  ].join('')
}

const CORS = { 'Access-Control-Allow-Origin': '*' }

async function fulfil(route: Route, reply: Reply): Promise<void> {
  const stream = (text: string, sources: readonly Source[], meta: Meta) =>
    route.fulfill({
      status: 200,
      headers: { ...CORS, 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
      body: streamOf(text, sources, meta),
    })
  switch (reply.kind) {
    case 'answer':
      return stream(reply.text ?? ANSWER, reply.sources ?? SOURCES, { ...META, ...reply.meta })
    case 'no-source':
      return stream(NO_SOURCE, [], { ...META, state: 'no-source', outputTokens: 19 })
    case 'boundary':
      return stream(BOUNDARY, [], { ...META, state: 'boundary', outputTokens: 14 })
    case 'refuse':
      return route.fulfill({ status: reply.status, headers: CORS, contentType: 'application/json', body: JSON.stringify(reply.body) })
    case 'error':
      return route.fulfill({
        status: 200,
        headers: { ...CORS, 'Content-Type': 'text/event-stream' },
        body: [sse({ type: 'start' }), sse({ type: 'error', errorText: 'failed' }), 'data: [DONE]\n\n'].join(''),
      })
    case 'hold':
      return
  }
}

/**
 * Serves the page with the preview's policy and answers the API's requests,
 * one reply per question in order; the last repeats.
 */
export async function fakeApi(page: Page, replies: readonly Reply[] = [{ kind: 'answer' }]): Promise<FakeApi> {
  const api: FakeApi = { posted: [], paths: [], challenge: 'ok' }
  let asked = 0
  await page.route(
    (url) => url.origin !== CHAT_API_ORIGIN,
    async (route, request: Request) => {
      if (request.resourceType() !== 'document') return route.fallback()
      const response = await route.fetch()
      const headers = response.headers()
      const policy = headers['content-security-policy']
      if (policy !== undefined) headers['content-security-policy'] = withChatApi(policy)
      return route.fulfill({ response, headers })
    },
  )
  await page.route(`${CHAT_API_ORIGIN}/**`, async (route, request) => {
    const path = new URL(request.url()).pathname
    api.paths.push(path)
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } })
    if (path === '/challenge') {
      if (api.challenge === 'hold') return
      if (api.challenge === 'fail') return route.fulfill({ status: 500, headers: CORS, body: '' })
      if (api.challenge === 'origin')
        // As spec 021's API refuses an origin: with no CORS header, so the browser sees only a failed fetch.
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ state: 'origin', message: 'x' }) })
      return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(await altcha.challenge()) })
    }
    if (path === '/chat') {
      api.posted.push(JSON.parse(request.postData() ?? '{}') as FakeApi['posted'][number])
      const reply = replies[Math.min(asked, replies.length - 1)] ?? { kind: 'answer' }
      asked += 1
      return fulfil(route, reply)
    }
    return route.fulfill({ status: 404, headers: CORS, body: '' })
  })
  return api
}

/** The window, once open. */
export const dialogOf = (page: Page) => page.locator('dialog[data-chat-dialog]')

/** Opens the chat from its button and waits for the window. */
export async function openChat(page: Page): Promise<void> {
  await page.locator('[data-chat-open]').click()
  await dialogOf(page).locator('textarea').waitFor()
}

/** Types a question and sends it with Enter. */
export async function askChat(page: Page, question: string): Promise<void> {
  const box = dialogOf(page).getByLabel('Your question')
  await box.fill(question)
  await box.press('Enter')
}
