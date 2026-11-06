import { expect, type BrowserContext, type Page, test } from '@playwright/test'
import { DESKTOP, enter } from '../../010/helpers/e2e.ts'
import { fakeUmami, GATEWAY, openProd, PROD, settle, type Fake } from '../helpers/umami.ts'

// Nothing is sent outside production, or when the browser says not to, and
// nothing is stored (Story 2, S3.1, SC-002, SC-003, FR-002, FR-003).

const PAGES = ['/', '/mobile', '/privacy'] as const

/** Everything Story 1 does: load, scroll through, open a PDF, and both contact links. */
async function doEverything(page: Page, context: BrowserContext, host: string): Promise<void> {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: host })
  for (const address of PAGES) {
    await openProd(page, address, host)
    await page.evaluate(`for (const type of ['click', 'auxclick']) document.addEventListener(type, (event) => event.preventDefault())`)
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
    await settle(page)
    if (address === '/privacy') continue
    await page.locator('a.hero__resume[type="application/pdf"]').click()
    await page.locator('.hero__actions a[href^="mailto:"]').click()
    await page.locator('#contact [data-email-copy]').click()
    await settle(page)
  }
}

function umamiRequests(fake: Fake): number {
  return fake.sent.length + [...fake.hosts].filter((origin) => origin === GATEWAY).length
}

test.describe('outside production', () => {
  for (const host of ['https://bradthome--pr-50-abc123.web.app', 'https://bradthome--next-xyz789.web.app']) {
    test(`S2.1 SC-002 FR-002 D156 on ${new URL(host).hostname}, nothing goes to any host but the page's own`, async ({ page, context, baseURL }) => {
      const fake = await fakeUmami(context, baseURL ?? '', 'answer', host)
      await enter(page, { viewport: DESKTOP, theme: 'light' })
      await doEverything(page, context, host)
      expect(umamiRequests(fake)).toBe(0)
      expect([...fake.hosts]).toEqual([host])
    })
  }

  test("S2.1 SC-002 on the local emulator, nothing goes to any host but the page's own", async ({ page, context, baseURL }) => {
    const origin = new URL(baseURL ?? '').origin
    const fake = await fakeUmami(context, baseURL ?? '', 'answer', origin)
    await context.unroute(`${origin}/**`)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await doEverything(page, context, origin)
    expect(umamiRequests(fake)).toBe(0)
    expect([...fake.hosts]).toEqual([origin])
  })
})

test.describe('when the browser says not to', () => {
  for (const [signal, script] of [
    ['Do Not Track', `Object.defineProperty(Navigator.prototype, 'doNotTrack', { get: () => '1' })`],
    ['Global Privacy Control', `Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true })`],
  ] as const) {
    test(`S2.3 SC-002 FR-002 D157 on bradthome.com, ${signal} sends nothing, page views included`, async ({ page, context, baseURL }) => {
      const fake = await fakeUmami(context, baseURL ?? '')
      await context.addInitScript(script)
      await enter(page, { viewport: DESKTOP, theme: 'light' })
      await doEverything(page, context, PROD)
      expect(umamiRequests(fake)).toBe(0)
    })
  }

  test('S2.3 with neither signal, the same visit does send, so the checks above can fail', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await doEverything(page, context, PROD)
    expect(fake.sent.length).toBeGreaterThan(PAGES.length)
  })
})

test.describe('nothing stored', () => {
  test('S3.1 SC-003 FR-003 after everything, on bradthome.com, there is no cookie, local storage or session storage', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await doEverything(page, context, PROD)
    expect(fake.sent.length).toBeGreaterThan(0)
    expect(await context.cookies()).toEqual([])
    expect(await page.evaluate('[document.cookie, localStorage.length, sessionStorage.length]')).toEqual(['', 0, 0])
    const state = await context.storageState()
    expect(state.cookies).toEqual([])
    expect(state.origins.flatMap((origin) => origin.localStorage)).toEqual([])
  })
})
