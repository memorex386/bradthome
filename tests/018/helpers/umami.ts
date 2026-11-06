import type { BrowserContext, Page, Request } from '@playwright/test'

// A fake Umami Cloud, and the production host, for spec 018's end-to-end
// tests. The site sends only on bradthome.com (D156), so the tests open
// https://bradthome.com/… and route every request for it to the Hosting
// emulator, which serves the build with firebase.json's headers, its
// Content-Security-Policy included. Umami's collection API is answered here,
// in the shape Umami's docs give for POST /api/send, and every request to it
// is recorded. Nothing reaches the real Umami.

export const PROD = 'https://bradthome.com'
export const GATEWAY = 'https://gateway.umami.is'

/** The answer Umami documents for /api/send. */
export const ANSWER = { cache: 'fake-cache-token', sessionId: 'fake-session', visitId: 'fake-visit' } as const

export type Mode = 'answer' | 'refuse' | 'hang'

export interface Sent {
  type: string
  payload: Record<string, unknown> & { name?: string; data?: Record<string, unknown> }
  headers: Record<string, string>
}

export interface Fake {
  /** Every POST to Umami's API, in order. */
  sent: Sent[]
  /** Every request the page made, to any host. */
  hosts: Set<string>
  /** The events (named requests) sent so far. */
  events: () => Sent[]
  /** The page views (unnamed requests) sent so far. */
  views: () => Sent[]
}

/** Serves the build as bradthome.com, or another host, and answers Umami's API with a fake. */
export async function fakeUmami(context: BrowserContext, baseURL: string, mode: Mode = 'answer', host: string = PROD): Promise<Fake> {
  const CORS = {
    'access-control-allow-origin': host,
    'access-control-allow-methods': 'POST',
    'access-control-allow-headers': 'content-type, x-umami-cache',
  }
  const fake: Fake = {
    sent: [],
    hosts: new Set(),
    events: () => fake.sent.filter((entry) => entry.payload.name !== undefined),
    views: () => fake.sent.filter((entry) => entry.payload.name === undefined),
  }
  context.on('request', (request: Request) => fake.hosts.add(new URL(request.url()).origin))
  await context.route(`${host}/**`, async (route) => {
    const url = new URL(route.request().url())
    const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).toString() })
    await route.fulfill({ response })
  })
  await context.route(`${GATEWAY}/**`, async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS })
      return
    }
    const body = request.postDataJSON() as { type: string; payload: Sent['payload'] }
    fake.sent.push({ type: body.type, payload: body.payload, headers: await request.allHeaders() })
    if (mode === 'hang') return
    if (mode === 'refuse') {
      await route.fulfill({ status: 500, headers: CORS, body: 'no' })
      return
    }
    await route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, json: ANSWER })
  })
  return fake
}

/** Opens a page on the production host and waits for its fonts and its page view. */
export async function openProd(page: Page, address: string, host: string = PROD): Promise<void> {
  await page.goto(`${host}${address}`)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** Waits until the fake has seen n requests, or fails after a while. */
export async function sentAtLeast(page: Page, fake: Fake, n: number): Promise<void> {
  for (let i = 0; i < 50 && fake.sent.length < n; i += 1) await page.waitForTimeout(100)
}

/** Lets any stray request arrive before a test counts. */
export async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(600)
}
