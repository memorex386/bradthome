import { expect, type Locator, type Page, test } from '@playwright/test'
import { contrast, DESKTOP, enter, HOME, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript, scriptsOn } from '../helpers/scripts.ts'

// Link previews in the browser (Stories 1, 3 and 5): hover, keyboard focus,
// Escape, a tap that opens a sheet, placement, the links that have cards, no
// request to another host with every card open, one external script, no
// layout shift, and contrast in both themes. Playwright's config asks for
// reduced motion by default.

const cardOf = (link: Locator): Locator => link.locator('xpath=following-sibling::*[@data-preview-card][1]')
const isOpen = (target: Locator): Promise<boolean> => target.evaluate((el) => el.matches(':popover-open'))

const headerLink = (page: Page, name: 'GitHub' | 'LinkedIn'): Locator =>
  page.getByRole('navigation', { name: 'Elsewhere' }).getByRole('link', { name, exact: true })

/** Whether two boxes overlap. */
async function overlaps(a: Locator, b: Locator): Promise<boolean> {
  const [x, y] = await Promise.all([a.boundingBox(), b.boundingBox()])
  if (!x || !y) return false
  return x.x < y.x + y.width && y.x < x.x + x.width && x.y < y.y + y.height && y.y < x.y + x.height
}

test.describe('on a desktop', () => {
  test.beforeEach(async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
  })

  test('S1.1 FR-002 L1 hovering GitHub opens its card after a pause, it stays while the pointer moves onto it, and closes after the pointer leaves', async ({ page }) => {
    const link = headerLink(page, 'GitHub')
    const preview = cardOf(link)
    await link.hover()
    await page.waitForTimeout(100)
    expect(await isOpen(preview)).toBe(false)
    await expect.poll(() => isOpen(preview)).toBe(true)
    await expect(preview).toHaveAccessibleName('GitHub preview')
    const box = await preview.boundingBox()
    if (!box) throw new Error('no card box')
    await page.mouse.move(box.x + box.width / 2, box.y + 20, { steps: 4 })
    await page.waitForTimeout(400)
    expect(await isOpen(preview)).toBe(true)
    await page.mouse.move(10, 700)
    await expect.poll(() => isOpen(preview)).toBe(false)
  })

  test('S1.2 FR-002 FR-003 F1 F2 Tab opens a card at once, Tab onward closes it, Escape closes it with focus kept, and focus never enters the card', async ({ page }) => {
    const github = headerLink(page, 'GitHub')
    const linkedin = headerLink(page, 'LinkedIn')
    await github.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(github).toBeFocused()
    await expect.poll(() => isOpen(cardOf(github))).toBe(true)
    await page.keyboard.press('Tab')
    await expect(linkedin).toBeFocused()
    expect(await isOpen(cardOf(github))).toBe(false)
    await expect.poll(() => isOpen(cardOf(linkedin))).toBe(true)
    await page.keyboard.press('Escape')
    expect(await isOpen(cardOf(linkedin))).toBe(false)
    await expect(linkedin).toBeFocused()
    expect(await page.evaluate(`document.querySelector('#preview-header-linkedin').contains(document.activeElement)`)).toBe(false)
  })

  test('S1.4 FR-003 an open card never covers its link and sits inside the viewport', async ({ page }) => {
    for (const name of ['GitHub', 'LinkedIn'] as const) {
      const link = headerLink(page, name)
      await link.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      const preview = cardOf(link)
      await expect.poll(() => isOpen(preview)).toBe(true)
      expect(await overlaps(link, preview), name).toBe(false)
      const box = await preview.boundingBox()
      expect(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= DESKTOP.width && box.y + box.height <= DESKTOP.height, name).toBe(true)
      await page.keyboard.press('Escape')
    }
  })

  test('S1.6 FR-001 the header, the store and site receipts and the side projects\' sites have cards; the case study and email have none', async ({ page }) => {
    const previewed = await page.evaluate(`[...document.querySelectorAll('a[data-preview]')].map((a) => a.getAttribute('href'))`) as string[]
    expect(new Set(previewed.map((href) => new URL(href).hostname))).toEqual(
      new Set(['github.com', 'www.linkedin.com', 'play.google.com', 'apps.apple.com', 'vindecoded.com', 'sudokuworld.app']),
    )
    for (const href of previewed) expect(href).not.toMatch(/bradthome\.com|mailto:/)
    expect(await page.locator('a[href="/vindecoded-agents"][data-preview], a[href^="mailto:"][data-preview]').count()).toBe(0)
  })

  test('S3.1 S3.2 SC-002 FR-008 with every card opened, every request is to the page\'s own origin, and the one script is the previews\' file', async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? '').origin
    const hosts = new Set<string>()
    page.on('request', (request) => hosts.add(new URL(request.url()).origin))
    await openHome(page)
    for (const link of await page.locator('a[data-preview]').all()) {
      if (!(await link.isVisible())) continue
      await link.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await expect.poll(() => isOpen(cardOf(link))).toBe(true)
      await page.keyboard.press('Escape')
    }
    await page.waitForLoadState('networkidle')
    expect([...hosts]).toEqual([origin])
    expect(await onlyPreviewScript(page)).toBe(true)
    expect((await scriptsOn(page)).some((src) => src === 'inline')).toBe(false)
  })

  test('S5.3 SC-004 FR-012 opening and closing cards shifts no layout, and the script is under 4 KB', async ({ page, request }) => {
    await page.evaluate(`window.__shift = 0; new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`)
    const link = headerLink(page, 'GitHub')
    await link.hover()
    await expect.poll(() => isOpen(cardOf(link))).toBe(true)
    await page.mouse.move(10, 700)
    await expect.poll(() => isOpen(cardOf(link))).toBe(false)
    expect(await page.evaluate('window.__shift')).toBe(0)
    const [src] = await scriptsOn(page)
    const body = await (await request.get(src ?? '')).body()
    // The one module also holds spec 017's copy button (under 1 KB), spec 018's analytics (under 2.5 KB)
    // and spec 022's chat loader, with Vite's chunk preloader (under 3 KB).
    // Spec 029 adds the role switch's morph, at most 768 bytes (Brad's Gate 1 card, D212).
    // Spec 030 adds the chat's hand-off from "Ask me", at most 384 bytes (Brad's Gate 1 card, D213).
    expect(body.length).toBeLessThan(4096 + 1024 + 2560 + 3072 + 768 + 384)
  })
})

test.describe('on a phone', () => {
  test.use({ hasTouch: true, isMobile: true })

  test('S1.3 S1.4 FR-002 FR-003 T1 a tap opens the sheet without following the link, keeps the link in view above it, and focuses Open', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' })
    await openHome(page)
    // Spec 026 (D208): the receipt is a row in VINDecoded's drawer.
    await page.locator('#side-vindecoded .ds-receipts__summary').tap()
    const link = page.locator('#receipt-vindecoded-3 a[data-preview]').nth(1)
    await link.scrollIntoViewIfNeeded()
    // A keyboard first places a focus card; the sheet must drop that place.
    await link.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect.poll(() => isOpen(cardOf(link))).toBe(true)
    await page.keyboard.press('Escape')
    await link.tap()
    const sheet = cardOf(link)
    await expect.poll(() => isOpen(sheet)).toBe(true)
    await expect(page).toHaveURL((url) => url.pathname === HOME)
    await expect(sheet).toHaveClass(/lp-card--sheet/)
    await expect(sheet.getByRole('link', { name: 'Open in the App Store' })).toBeFocused()
    expect(await overlaps(link, sheet)).toBe(false)
    const box = await sheet.boundingBox()
    expect(box && Math.round(box.y + box.height)).toBe(PHONE.height)
    expect(box && [Math.round(box.x), Math.round(box.width)]).toEqual([0, PHONE.width])
    for (const button of [sheet.getByRole('link', { name: /^Open/ }), sheet.getByRole('button', { name: 'Close' })])
      expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  })

  test('S1.3 FR-002 Close, Escape and a tap outside close the sheet and put focus back on the link, and Open follows it', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'dark' })
    await openHome(page)
    await page.locator('.ds-header__menu > summary').tap()
    const link = page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'GitHub', exact: true })
    const sheet = cardOf(link)
    await link.tap()
    await expect.poll(() => isOpen(sheet)).toBe(true)
    await sheet.getByRole('button', { name: 'Close' }).tap()
    expect(await isOpen(sheet)).toBe(false)
    await expect(link).toBeFocused()
    await link.tap()
    await expect.poll(() => isOpen(sheet)).toBe(true)
    await page.keyboard.press('Escape')
    expect(await isOpen(sheet)).toBe(false)
    await expect(link).toBeFocused()
    await link.tap()
    await expect.poll(() => isOpen(sheet)).toBe(true)
    // An empty spot outside the sheet: the page's left gutter, between the link and the sheet.
    const [linkBox, sheetBox] = await Promise.all([link.boundingBox(), sheet.boundingBox()])
    if (!linkBox || !sheetBox) throw new Error('no box')
    await page.touchscreen.tap(4, Math.round((linkBox.y + linkBox.height + sheetBox.y) / 2))
    await expect.poll(() => isOpen(sheet)).toBe(false)
    await expect(link).toBeFocused()
    await link.tap()
    await expect.poll(() => isOpen(sheet)).toBe(true)
    await expect(sheet.getByRole('link', { name: 'Open GitHub' })).toHaveAttribute('href', 'https://github.com/memorex386')
  })
})

test.describe('contrast and the gallery', () => {
  test('S5.2 FR-012 every text color on a card is at least 4.5:1 against the card, in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await page.goto('/design-system#previews')
      const pairs = (await page.evaluate(`[...document.querySelectorAll('#previews .lp-card')].flatMap((card) => { const bg = getComputedStyle(card).backgroundColor; return [...card.querySelectorAll('span, a, button')].filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).filter((el) => !el.closest('.lp-card__actions')).map((el) => [getComputedStyle(el).color, bg, el.textContent.trim().slice(0, 30)]) })`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(20)
      for (const [color, bg, text] of pairs) expect(contrast(color, bg), `${theme}: ${text}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('S5.5 S2.5 L5 the gallery holds each kind of card open, the missing state and a sheet', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await page.goto('/design-system#previews')
    const cards = page.locator('#previews .lp-card--still')
    await expect(cards).toHaveCount(6)
    await expect(page.locator('#gallery-preview-missing')).toContainText('No snapshot yet')
    await expect(page.locator('#gallery-preview-appstore')).toContainText('ratings')
    await expect(page.locator('#gallery-preview-linkedin')).toContainText('Written by hand')
    await expect(page.locator('#gallery-preview-sheet .lp-card__actions')).toBeVisible()
  })
})
