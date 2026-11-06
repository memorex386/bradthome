import { expect, test } from '@playwright/test'
import { DESKTOP, enterGallery, focused, GALLERY, NARROW, openGallery, PHONE, RGB, styleOf } from '../helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// The gallery in a browser (S1.3, S1.4, S2.1–S2.6, S3.1–S3.5, S4.1, S4.2,
// S4.5, FR-011, SC-004), against the built site served as Hosting serves it.

test.describe('the themes and fonts', () => {
  test('S1.3 the page follows the device, and the gallery switch overrides it in either direction', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enterGallery(page, { viewport: DESKTOP, theme })
      await openGallery(page)
      expect(await styleOf(page, 'body', 'background-color'), theme).toBe(RGB[theme].bg)
      expect(await styleOf(page, 'body', 'color'), theme).toBe(RGB[theme].ink)
      const other = theme === 'light' ? 'dark' : 'light'
      await page.locator(`label:has(#theme-${other})`).click()
      expect(await styleOf(page, 'body', 'background-color'), `${theme} device, ${other} chosen`).toBe(RGB[other].bg)
      await page.locator('label:has(#theme-device)').click()
      expect(await styleOf(page, 'body', 'background-color'), `${theme} device, device chosen`).toBe(RGB[theme].bg)
    }
  })

  test('S1.4 FR-002 the three fonts load from the site itself, and nothing goes to another host', async ({ page, baseURL }) => {
    const hosts = new Set<string>()
    page.on('request', (request) => hosts.add(new URL(request.url()).host))
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const loaded = (await page.evaluate('[...document.fonts].filter((face) => face.status === "loaded").map((face) => face.family.replace(/^"|"$/g, ""))')) as string[]
    for (const family of ['Inter Tight-', 'Inter-', 'JetBrains Mono-']) {
      expect(loaded.some((name) => name.startsWith(family)), `${family} in ${loaded.join(', ')}`).toBe(true)
    }
    expect([...hosts]).toEqual([new URL(baseURL ?? '').host])
  })
})

test.describe('the components', () => {
  test("S2.1 FR-003 on a desktop the header shows Brad's name, the sections, the profiles and the résumé", async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const header = page.locator('header.ds-header')
    await expect(header.getByRole('link', { name: 'Brad Thome' })).toHaveAttribute('href', '/')
    await expect(header.getByRole('navigation', { name: 'Sections' })).toBeVisible()
    const elsewhere = header.getByRole('navigation', { name: 'Elsewhere' })
    await expect(elsewhere.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/memorex386')
    await expect(elsewhere.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/brad-thome/')
    await expect(header.getByRole('link', { name: 'Résumé PDF' })).toBeVisible()
    await expect(header.getByLabel('Menu', { exact: true }).first()).toBeHidden()
  })

  test('S2.1 FR-003 M1 on a phone the header keeps one row, and its menu opens to the sections and profiles', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enterGallery(page, { viewport, theme: 'light' })
      await openGallery(page)
      const header = page.locator('header.ds-header')
      await expect(header.getByRole('navigation', { name: 'Sections' })).toBeHidden()
      const name = await header.getByRole('link', { name: 'Brad Thome' }).boundingBox()
      const menu = header.locator('summary[aria-label="Menu"]')
      const button = await menu.boundingBox()
      expect(name && button && Math.abs(name.y + name.height / 2 - (button.y + button.height / 2)), `${viewport.width}`).toBeLessThan(4)
      await menu.click()
      const panel = header.getByRole('navigation', { name: 'Menu' })
      await expect(panel.getByRole('link', { name: 'Tokens' })).toBeVisible()
      await expect(panel.getByRole('link', { name: 'GitHub' })).toBeVisible()
      await expect(panel.getByRole('link', { name: 'LinkedIn' })).toBeVisible()
      expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), `${viewport.width}`).toBe(true)
    }
  })

  test('S2.2 FR-003 the footer reads Brad Thome · Dallas–Fort Worth, the name linking home', async ({ page }) => {
    await openGallery(page)
    const footer = page.locator('footer.ds-footer')
    await expect(footer).toContainText('Brad Thome · Dallas–Fort Worth')
    await expect(footer.getByRole('link', { name: 'Brad Thome' })).toHaveAttribute('href', '/')
  })

  test('S2.3 FR-004 C1–C6 every component is shown, each in its default, hover and focus states', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    for (const selector of [
      '.ds-button--primary',
      '.ds-button--secondary',
      '.ds-button--accent',
      '.ds-button--icon',
      '.ds-link',
      '.ds-link--quiet',
      '.ds-nav-link',
      '.ds-chip',
      '.ds-chip--tag',
      '.ds-roles',
      '.ds-card',
      '.ds-card--highlight',
      '.ds-card--soft',
      '.ds-card--feature',
      'a.ds-card',
      '.ds-eyebrow',
      '.ds-eyebrow--accent',
      '.ds-stat',
    ]) {
      expect(await page.locator(`main ${selector}`).count(), selector).toBeGreaterThan(0)
    }
    for (const selector of ['.ds-button--primary', '.ds-button--secondary', '.ds-link', 'a.ds-card', '.ds-roles__item', '.ds-ask']) {
      expect(await page.locator(`main ${selector}.is-hover`).count(), `${selector} hover`).toBeGreaterThan(0)
      expect(await page.locator(`main ${selector}.is-focus`).count(), `${selector} focus`).toBeGreaterThan(0)
    }
    // A hover example takes the real hover's look: the primary button turns the accent color.
    expect(await styleOf(page, 'main .ds-button--primary.is-hover', 'background-color')).toBe(RGB.light.accent)
    await page.locator('main .ds-button--primary:not(.is-hover):not(.is-focus)').first().hover()
    expect(await styleOf(page, 'main .ds-button--primary:not(.is-hover):not(.is-focus)', 'background-color')).toBe(RGB.light.accent)
  })

  test('S2.4 FR-005 C4 the role switch is a navigation region of links, with the current role marked and filled', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const roles = page.getByRole('navigation', { name: 'Hiring for', exact: true })
    await expect(roles.getByRole('link')).toHaveCount(4)
    const current = roles.locator('[aria-current="page"]')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveText('Any role')
    expect(await styleOf(page, '.ds-roles [aria-current="page"]', 'background-color')).toBe(RGB.light.ink)
    expect(await roles.locator('button').count()).toBe(0)
  })

  test('S2.5 C7 the band stays dark in both themes, with its own colors', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enterGallery(page, { viewport: DESKTOP, theme })
      await openGallery(page)
      expect(await styleOf(page, '.ds-band', 'background-color'), theme).toBe(RGB[theme].band)
      expect(await styleOf(page, '.ds-band .ds-eyebrow', 'color'), theme).toBe('rgb(142, 168, 255)')
      expect(await styleOf(page, '.ds-band .ds-card__text', 'color'), theme).toBe('rgb(163, 171, 183)')
    }
  })

  test('S2.6 FR-007 A1 Ask about Brad is a link to the contact section (spec 017, D153), fixed in the corner on a desktop and in the flow on a phone', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const asks = page.getByRole('link', { name: 'Ask about Brad' })
    expect(await asks.count()).toBeGreaterThanOrEqual(4)
    for (const ask of await asks.all()) await expect(ask).toHaveAttribute('href', '#contact')
    const floating = page.locator('.ds-ask--floating')
    await expect(floating).toHaveCount(1)
    expect(await styleOf(page, '.ds-ask--floating', 'position')).toBe('fixed')
    const box = await floating.boundingBox()
    expect(box && DESKTOP.width - (box.x + box.width)).toBeLessThan(80)
    expect(box && DESKTOP.height - (box.y + box.height)).toBeLessThan(60)
    await page.mouse.wheel(0, 2000)
    expect(await floating.boundingBox()).toEqual(box)
    await page.setViewportSize(PHONE)
    expect(await styleOf(page, '.ds-ask--floating', 'position')).toBe('static')
  })
})

test.describe('the receipts', () => {
  test('S3.1 FR-006 R1 on a desktop each claim’s receipts sit in the margin, level with the claim', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const claims = page.locator('.ds-claim')
    expect(await claims.count()).toBeGreaterThanOrEqual(3)
    for (const claim of await claims.all()) {
      const text = await claim.locator('.ds-claim__text').boundingBox()
      const notes = await claim.locator('.ds-claim__notes').boundingBox()
      expect(text && notes && notes.x >= text.x + text.width).toBe(true)
      expect(text && notes && Math.abs(notes.y - text.y)).toBeLessThan(2)
    }
  })

  test('S3.2 FR-006 R2 on a phone the receipts sit in line under the claim, and nothing scrolls sideways', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enterGallery(page, { viewport, theme: 'light' })
      await openGallery(page)
      for (const claim of await page.locator('.ds-claim').all()) {
        const text = await claim.locator('.ds-claim__text').boundingBox()
        const notes = await claim.locator('.ds-claim__notes').boundingBox()
        expect(text && notes && notes.y >= text.y + text.height - 1, `${viewport.width}`).toBe(true)
        expect(text && notes && Math.abs(notes.x - text.x), `${viewport.width}`).toBeLessThan(2)
      }
      expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), `${viewport.width}`).toBe(true)
    }
  })

  test('S3.3 FR-006 a closed receipt shows its number, title and kind, and a click, Enter or Space opens and closes it', async ({ page }) => {
    await enterGallery(page, { viewport: PHONE, theme: 'light' })
    await openGallery(page)
    const receipt = page.locator('#receipt-1')
    const summary = receipt.locator('summary')
    await expect(receipt).not.toHaveAttribute('open')
    await expect(summary).toContainText('1')
    await expect(summary).toContainText('A closed receipt')
    await expect(summary).toContainText('Proof')
    await expect(page.locator('#receipt-3 summary')).toContainText('Ask me')
    await expect(receipt.locator('.ds-receipt__body')).toBeHidden()
    await summary.click()
    await expect(receipt).toHaveAttribute('open')
    await expect(receipt.locator('.ds-receipt__body')).toBeVisible()
    await summary.click()
    await expect(receipt).not.toHaveAttribute('open')
    for (const key of ['Enter', 'Space']) {
      await summary.focus()
      await page.keyboard.press(key)
      await expect(receipt, key).toHaveAttribute('open')
      await page.keyboard.press(key)
      await expect(receipt, key).not.toHaveAttribute('open')
    }
  })

  test('S3.4 FR-006 R5 following a claim’s marker opens its receipt and brings it into view', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enterGallery(page, { viewport, theme: 'light' })
      await openGallery(page)
      const marker = page.locator('.ds-claim a.ds-marker').first()
      await marker.scrollIntoViewIfNeeded()
      await marker.click()
      await expect(page.locator('#receipt-1'), `${viewport.width}`).toHaveAttribute('open')
      await expect(page.locator('#receipt-1 .ds-receipt__body'), `${viewport.width}`).toBeInViewport()
      await expect(page.locator('#receipt-1 summary'), `${viewport.width}`).toBeInViewport()
    }
  })

  test('S3.5 FR-006 R1 R3 a proof marker is filled with the accent and an ask-me marker is outlined, each named for its kind', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const proof = page.locator('.ds-claim a.ds-marker').nth(0)
    const ask = page.locator('.ds-claim a.ds-marker--ask').first()
    await expect(proof).toHaveAttribute('aria-label', 'Receipt 1, proof')
    await expect(ask).toHaveAttribute('aria-label', 'Receipt 3, ask Brad')
    expect(await styleOf(page, '.ds-claim a.ds-marker:not(.ds-marker--ask)', 'background-color')).toBe(RGB.light.accent)
    expect(await styleOf(page, '.ds-claim a.ds-marker--ask', 'background-color')).toBe(RGB.light.surface)
    expect(await styleOf(page, '.ds-claim a.ds-marker--ask', 'border-top-style')).toBe('solid')
  })
})

test.describe('the keyboard, motion and the page', () => {
  test('S4.1 F1–F3 Tab goes to the skip link, then the header in order, each with a ring', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' })
    await openGallery(page)
    const expected = ['Skip to the gallery', 'Brad Thome', 'Tokens', 'Components', 'Receipts', 'Previews', 'Contact', 'Chrome', 'GitHub', 'LinkedIn', 'Résumé PDF']
    for (const label of expected) {
      await page.keyboard.press('Tab')
      const now = await focused(page)
      expect(now?.label, label).toBe(label)
      expect(now?.outline, label).toBe('solid')
    }
    await expect(page.getByRole('link', { name: 'Skip to the gallery' })).toHaveAttribute('href', '#main')
  })

  test('S4.1 FR-011 SC-004 every element Tab reaches shows a 2-pixel ring in the accent color', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enterGallery(page, { viewport: DESKTOP, theme })
      await openGallery(page)
      const missing: string[] = []
      let stops = 0
      for (let i = 0; i < 200; i++) {
        await page.keyboard.press('Tab')
        const now = await focused(page)
        if (now === null) break
        stops += 1
        if (now.outline !== 'solid' || now.width < 2 || now.color !== RGB[theme].accent) missing.push(`${now.tag} "${now.label}": ${now.outline} ${now.width}px ${now.color}`)
        if (await page.evaluate('document.activeElement?.closest("footer") !== null && document.activeElement?.closest("footer") !== undefined')) break
      }
      expect(stops, theme).toBeGreaterThan(40)
      expect(missing, theme).toEqual([])
    }
  })

  test('FR-011 buttons, role links and receipt summaries are at least 44 pixels tall, and markers 24', async ({ page }) => {
    await enterGallery(page, { viewport: PHONE, theme: 'light' })
    await openGallery(page)
    const short = (await page.evaluate(`(() => {
      const found = []
      for (const element of document.querySelectorAll('.ds-button, .ds-roles__item, .ds-receipt__summary')) {
        const box = element.getBoundingClientRect()
        if (box.height > 0 && box.height < 44) found.push(element.className + ': ' + box.height)
      }
      for (const element of document.querySelectorAll('a.ds-marker')) {
        const box = element.getBoundingClientRect()
        if (box.height < 24 || box.width < 24) found.push(element.className + ': ' + box.width + '×' + box.height)
      }
      return found
    })()`)) as string[]
    expect(short).toEqual([])
  })

  test('S4.2 FR-012 with reduced motion nothing has a transition; without it, hover fades in at most 240 ms and nothing loops', async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' }, 'reduce')
    await openGallery(page)
    const moving = '[...document.querySelectorAll("body *")].filter((el) => getComputedStyle(el).transitionDuration.split(",").some((d) => Number.parseFloat(d) > 0)).length'
    expect(await page.evaluate(moving)).toBe(0)
    expect(await page.evaluate('document.getAnimations().length')).toBe(0)
    await enterGallery(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await openGallery(page)
    expect(await page.evaluate(moving)).toBeGreaterThan(0)
    const longest = (await page.evaluate(
      'Math.max(...[...document.querySelectorAll("body *")].flatMap((el) => getComputedStyle(el).transitionDuration.split(",").map((d) => Number.parseFloat(d) * (d.trim().endsWith("ms") ? 1 : 1000))))',
    )) as number
    expect(longest).toBeLessThanOrEqual(240)
    await page.locator('main .ds-button--primary').first().hover()
    const loops = await page.evaluate('document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations === Infinity).length')
    expect(loops).toBe(0)
  })

  test('S4.5 FR-013 the gallery runs no script but the previews script, requests no other host, has no inline style and logs no error', async ({ page, baseURL }) => {
    const errors: string[] = []
    const hosts = new Set<string>()
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => hosts.add(new URL(request.url()).host))
    for (const theme of ['light', 'dark'] as const) {
      await enterGallery(page, { viewport: PHONE, theme })
      await openGallery(page)
      expect(await onlyPreviewScript(page), theme).toBe(true)
      expect(await page.locator('[style]').count(), theme).toBe(0)
    }
    expect([...hosts]).toEqual([new URL(baseURL ?? '').host])
    expect(errors).toEqual([])
  })

  test('S5.2 FR-009 the gallery carries noindex', async ({ page }) => {
    await page.goto(GALLERY)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  })
})
