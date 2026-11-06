import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'
import { WEBSITE_ID } from '../../../apps/site/src/components/analytics/umami.ts'
import { ANSWER, fakeUmami, GATEWAY, openProd, PROD, sentAtLeast, settle, type Sent } from '../helpers/umami.ts'

// The three events and the page view, on the production host against a fake
// Umami (Story 1, S3.2, SC-001, FR-001, FR-004).

const PAGES = ['/v2', '/mobile', '/fullstack', '/ai', '/privacy'] as const
const FIELDS = ['hostname', 'language', 'referrer', 'screen', 'title', 'url', 'website']

/** Keeps a link's default action from leaving the page, after the sender's capture listener has run. */
async function stayOnPage(page: Page): Promise<void> {
  await page.evaluate(`for (const type of ['click', 'auxclick']) document.addEventListener(type, (event) => event.preventDefault())`)
}

function keysOf(entry: Sent): string[] {
  return Object.keys(entry.payload).sort()
}

test.describe('the page view', () => {
  test('S1.1 S3.2 SC-001 FR-001 FR-003 E1 each page sends one page view with exactly the seven fields, the path only', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await enter(page, { viewport: PHONE, theme: 'light' })
    for (const address of PAGES) {
      fake.sent.length = 0
      await openProd(page, `${address}?utm_source=x&id=7#top`)
      await sentAtLeast(page, fake, 1)
      await settle(page)
      const views = fake.views()
      expect(views, address).toHaveLength(1)
      const view = views[0]!
      expect(view.type).toBe('event')
      expect(keysOf(view), address).toEqual(FIELDS)
      expect(view.payload).toMatchObject({ website: WEBSITE_ID, hostname: 'bradthome.com', url: address, referrer: '', language: 'en-US', screen: '390x844' })
      expect(view.payload.title, address).toBe(await page.title())
      expect(JSON.stringify(view.payload), address).not.toMatch(/utm_source|id=7|#top/)
    }
  })

  test('S3.2 FR-003 no request carries a cookie or credentials, and later requests return Umami\'s cache token from memory', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await context.addCookies([{ name: 'probe', value: '1', domain: 'gateway.umami.is', path: '/', secure: true }])
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openProd(page, '/v2')
    await sentAtLeast(page, fake, 1)
    await page.locator('#hopper').scrollIntoViewIfNeeded()
    await sentAtLeast(page, fake, 2)
    for (const entry of fake.sent) {
      expect(entry.headers.cookie).toBeUndefined()
      expect(entry.headers['content-type']).toBe('application/json')
    }
    expect(fake.sent[0]!.headers['x-umami-cache']).toBeUndefined()
    expect(fake.sent[1]!.headers['x-umami-cache']).toBe(ANSWER.cache)
  })
})

test.describe('the work section', () => {
  test('S1.2 SC-001 E2 a quarter of the Hopper section in view sends one work-reached, with no data, and scrolling back sends no second', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await enter(page, { viewport: PHONE, theme: 'light' })
    for (const address of ['/v2', '/mobile']) {
      fake.sent.length = 0
      await openProd(page, address)
      await sentAtLeast(page, fake, 1)
      await settle(page)
      expect(fake.events(), `${address} before the section shows`).toEqual([])
      await page.evaluate(`document.getElementById('hopper').scrollIntoView({ block: 'start' })`)
      await sentAtLeast(page, fake, 2)
      await page.evaluate('window.scrollTo(0, 0)')
      await settle(page)
      await page.evaluate(`document.getElementById('hopper').scrollIntoView({ block: 'start' })`)
      await page.setViewportSize({ width: 400, height: 700 })
      await settle(page)
      const events = fake.events()
      expect(events.map((entry) => entry.payload.name), address).toEqual(['work-reached'])
      expect(keysOf(events[0]!)).toEqual([...FIELDS, 'name'].sort())
      expect(events[0]!.payload.data).toBeUndefined()
    }
  })

  test('S1.3 on a screen tall enough to show the Hopper section at load, work-reached follows the page view', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await enter(page, { viewport: { width: 1280, height: 4000 }, theme: 'light' })
    await openProd(page, '/v2')
    await sentAtLeast(page, fake, 2)
    await settle(page)
    expect(fake.sent.map((entry) => entry.payload.name ?? 'view')).toEqual(['view', 'work-reached'])
  })
})

test.describe('the résumé and contact', () => {
  test('S1.4 SC-001 E3 a résumé PDF link sends one resume-download with its role, by click, Enter and middle-click', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const [address, role] of [
      ['/v2', 'fullstack'],
      ['/mobile', 'mobile'],
      ['/fullstack', 'fullstack'],
      ['/ai', 'ai'],
    ] as const) {
      await openProd(page, address)
      await stayOnPage(page)
      await sentAtLeast(page, fake, 1)
      fake.sent.length = 0
      const hero = page.locator('.hero__resume')
      const closing = page.locator('#contact a[type="application/pdf"]')
      await hero.click()
      await closing.click()
      await hero.focus()
      await page.keyboard.press('Enter')
      await closing.click({ button: 'middle' })
      await sentAtLeast(page, fake, 4)
      await settle(page)
      const downloads = fake.events().filter((entry) => entry.payload.name === 'resume-download')
      expect(downloads, address).toHaveLength(4)
      for (const entry of downloads) {
        expect(entry.payload.data, address).toEqual({ role })
        expect(keysOf(entry)).toEqual([...FIELDS, 'data', 'name'].sort())
      }
    }
  })

  test('S1.5 SC-001 E4 a mailto: link sends one contact-click with method mailto, from the hero and the closing section', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openProd(page, '/v2')
    await stayOnPage(page)
    await sentAtLeast(page, fake, 1)
    fake.sent.length = 0
    await page.locator('.hero__actions a[href^="mailto:"]').click()
    await page.locator('#contact a[href^="mailto:"]').first().click()
    await sentAtLeast(page, fake, 2)
    await settle(page)
    const clicks = fake.events().filter((entry) => entry.payload.name === 'contact-click')
    expect(clicks.map((entry) => entry.payload.data)).toEqual([{ method: 'mailto' }, { method: 'mailto' }])
  })

  test('S1.6 E5 Copy sends one contact-click with method copy, by pointer and keyboard, whether it copies or selects', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: PROD })
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openProd(page, '/v2')
    await sentAtLeast(page, fake, 1)
    fake.sent.length = 0
    const button = page.locator('#contact [data-email-copy]')
    await button.click()
    await expect(button).toHaveAccessibleName('Copied')
    expect(await page.evaluate('navigator.clipboard.readText()')).toBe('brad@bradthome.com')
    await button.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await sentAtLeast(page, fake, 3)
    await settle(page)
    expect(fake.events().map((entry) => [entry.payload.name, entry.payload.data])).toEqual([
      ['contact-click', { method: 'copy' }],
      ['contact-click', { method: 'copy' }],
      ['contact-click', { method: 'copy' }],
    ])
  })

  test('S1.6 where the clipboard refuses, Copy still selects the address and sends one contact-click', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) } })
    })
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openProd(page, '/v2')
    await sentAtLeast(page, fake, 1)
    fake.sent.length = 0
    const button = page.locator('#contact [data-email-copy]')
    await button.click()
    await expect(button).toHaveAccessibleName('Address selected')
    await sentAtLeast(page, fake, 1)
    await settle(page)
    expect(fake.events().map((entry) => entry.payload.data)).toEqual([{ method: 'copy' }])
  })
})

test.describe('when Umami fails', () => {
  for (const mode of ['refuse', 'hang'] as const) {
    test(`S1.7 FR-004 when Umami ${mode === 'refuse' ? 'refuses' : 'never answers'}, the page works as before, shows no error and retries nothing`, async ({ page, context, baseURL }) => {
      const fake = await fakeUmami(context, baseURL ?? '', mode)
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: PROD })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes(GATEWAY) && !/Failed to load resource/.test(message.text())) errors.push(message.text())
      })
      await enter(page, { viewport: DESKTOP, theme: 'light' })
      await openProd(page, '/v2')
      await sentAtLeast(page, fake, 1)
      const button = page.locator('#contact [data-email-copy]')
      await button.click()
      await expect(button).toHaveAccessibleName('Copied')
      await settle(page)
      expect(fake.sent).toHaveLength(2)
      // The link's own action isn't cancelled: a listener after the sender's sees it still pending, then stops the PDF opening here.
      await page.evaluate(`window.addEventListener('click', (event) => { window.__pending = !event.defaultPrevented; event.preventDefault() })`)
      await page.locator('.hero__resume').click()
      expect(await page.evaluate('window.__pending')).toBe(true)
      expect(errors).toEqual([])
    })
  }
})
