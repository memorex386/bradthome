import type { Page, Route } from '@playwright/test'
import { CHAT_API_ORIGIN } from '../../../apps/chat-api/src/constants.ts'

// Spec 041's browser helpers: a fake of the site's own API's /pulse, which
// every test routes, so no test reaches Cloud Run, Apple or GitHub, and a
// clock fixed at 15:12 UTC on 2026-11-17, so ages read the same each run.

export const PULSE_URL = `${CHAT_API_ORIGIN}/pulse`
export const NOW = new Date('2026-11-17T15:12:00Z')

export const LIVE = {
  appStore: { version: '12.7.8', released: '2026-11-10', rating: 4.7, ratings: 3254, fetched: '2026-11-17T15:00:00.000Z' },
  github: { merged: 296, days: 30, fetched: '2026-11-17T15:00:00.000Z' },
}

/** A different answer than the build's, so a swap is seen. */
export const FRESH = {
  appStore: { version: '12.8.0', released: '2026-11-16', rating: 4.8, ratings: 3301, fetched: '2026-11-17T15:00:00.000Z' },
  github: { merged: 312, days: 30, fetched: '2026-11-17T15:00:00.000Z' },
}

export type Answer = unknown | 'down' | 'refused'

/** Routes /pulse to an answer, counting each request; with `delay`, the answer waits that long. */
export async function fakePulse(page: Page, answer: Answer = LIVE, delay = 0): Promise<{ requests: () => number }> {
  let requests = 0
  await page.route(PULSE_URL, async (route: Route) => {
    requests += 1
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
    if (answer === 'down') return route.abort('connectionrefused')
    if (answer === 'refused') return route.fulfill({ status: 403, body: '' })
    const origin = route.request().headers().origin ?? '*'
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': origin, vary: 'Origin', 'cache-control': 'public, max-age=300' },
      body: typeof answer === 'string' ? answer : JSON.stringify(answer),
    })
  })
  return { requests: () => requests }
}

/** The card's text in each live hook, by its name. */
export async function pulseText(page: Page): Promise<Record<string, string>> {
  const pairs = await page
    .locator('#side-vindecoded [data-pulse]:not([data-pulse="dot"])')
    .evaluateAll((els) =>
      els.map((el) => [el.getAttribute('data-pulse') ?? '', (el.textContent ?? '').replace(/\s+/g, ' ').trim()] as const),
    )
  return Object.fromEntries(pairs)
}

/** How many of the card's live dots show. */
export const dots = (page: Page): Promise<number> => page.locator('#side-vindecoded [data-pulse="dot"]:not([hidden])').count()

/** Scrolls the card into view and waits until the API's answer has been read, or the request has failed. */
export async function reach(page: Page): Promise<void> {
  await page.locator('#side-vindecoded').scrollIntoViewIfNeeded()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(100)
}
