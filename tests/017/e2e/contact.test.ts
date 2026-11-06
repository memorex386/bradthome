import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { contrast, DESKTOP, enter, HOME, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// The contact in the browser (Stories 1–5): the hero's address in a phone's
// first screen, the header's Contact, the closing section, copy allowed and
// refused, no layout shift, the ask-me links, the gallery, no outside request,
// one script, every built page's addresses, target sizes and contrast.
// Playwright's config asks for reduced motion by default.

const PAGES = [HOME, '/mobile', '/fullstack', '/ai'] as const
const EMAIL = 'brad@bradthome.com'
const DIST = path.join(import.meta.dirname, '..', '..', '..', 'apps', 'site', 'dist')

const section = (page: Page): Locator => page.locator('#contact')
const copyButton = (page: Page): Locator => section(page).getByRole('button', { name: /Copy address|Copied|Address selected/ })
const status = (page: Page): Locator => section(page).getByRole('status')

/** Starts counting layout shifts from now. */
async function watchShifts(page: Page): Promise<void> {
  await page.evaluate(
    `window.__shift = 0; new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: false })`,
  )
}

/** Tabs until the target has focus, never a fixed count (spec 010's lesson). */
async function tabTo(page: Page, selector: string, limit = 80): Promise<void> {
  for (let i = 0; i < limit; i += 1) {
    if (await page.evaluate(`document.activeElement?.matches(${JSON.stringify(selector)}) === true`)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('Tab never reached the target')
}

function htmlIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    return statSync(full).isDirectory() ? htmlIn(full) : full.endsWith('.html') ? [full] : []
  })
}

test.describe('the first screen', () => {
  test('S1.1 S1.2 SC-001 FR-002 H1 on a phone, every new page shows the address beside the résumé link, inside the first screen', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' })
    for (const address of PAGES) {
      await page.goto(address)
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      const links = page.locator('.hero__actions a')
      await expect(links.nth(1), address).toHaveText('Read the résumé')
      const email = links.nth(2)
      await expect(email, address).toHaveText(EMAIL)
      await expect(email, address).toHaveAttribute('href', `mailto:${EMAIL}`)
      const box = await email.boundingBox()
      expect(box && box.y >= 0 && box.y + box.height <= PHONE.height && box.x + box.width <= PHONE.width, address).toBe(true)
    }
  })

  test('S1.3 FR-003 the header\'s sections end with Contact, on a desktop and in the phone\'s menu', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const sections = page.getByRole('navigation', { name: 'Sections' }).getByRole('link')
    await expect(sections).toHaveText(['Hopper', 'Experience', 'On the side', 'Contact'])
    await expect(sections.last()).toHaveAttribute('href', '#contact')
    await enter(page, { viewport: PHONE, theme: 'light' })
    await openHome(page)
    await page.locator('.ds-header__menu > summary').click()
    await expect(page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '#contact')
  })
})

test.describe('the closing section', () => {
  test('S2.1 FR-003 C1 every new page closes with Get in touch: the address, Copy, LinkedIn, GitHub and its résumé PDF', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    const resumes = { [HOME]: 'full-stack', '/mobile': 'mobile', '/fullstack': 'full-stack', '/ai': 'applied-ai' } as const
    for (const address of PAGES) {
      await page.goto(address)
      await expect(page.locator('main > section').last(), address).toHaveAttribute('id', 'contact')
      await expect(section(page).getByRole('heading', { level: 2 })).toHaveText('Get in touch')
      const mail = section(page).getByRole('link', { name: EMAIL })
      await expect(mail).toHaveAttribute('href', `mailto:${EMAIL}`)
      await expect(copyButton(page)).toHaveAccessibleName('Copy address')
      await expect(status(page)).toHaveText('')
      const links = section(page).locator('.contact__links > li > a:first-child')
      await expect(links).toHaveText(['LinkedIn', 'GitHub', 'Résumé PDF'])
      await expect(links.nth(2), address).toHaveAttribute('href', `/resume/brad-thome-${resumes[address]}.pdf`)
    }
  })

  test('S3.2 FR-005 every ask-me receipt\'s link goes to #contact', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const address of PAGES) {
      await page.goto(address)
      const asks = page.locator('.ds-receipt--ask a.ds-link')
      expect(await asks.count(), address).toBeGreaterThan(0)
      for (const href of await asks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))) expect(href, address).toBe('#contact')
    }
  })
})

test.describe('copy', () => {
  test('S2.2 S2.5 SC-002 SC-004 FR-004 C3 a click copies exactly the address, says so, shows Copied for 2 seconds, and nothing moves', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await enter(page, { viewport: PHONE, theme: 'light' })
    await openHome(page)
    await section(page).scrollIntoViewIfNeeded()
    const button = copyButton(page)
    const before = await button.boundingBox()
    await watchShifts(page)
    await page.clock.install()
    await button.click()
    await expect(button).toHaveAccessibleName('Copied')
    await expect(status(page)).toHaveText(`Copied ${EMAIL} to the clipboard.`)
    expect(await page.evaluate('navigator.clipboard.readText()')).toBe(EMAIL)
    const after = await button.boundingBox()
    expect(after?.width).toBe(before?.width)
    expect(after?.height).toBe(before?.height)
    await page.clock.runFor(1900)
    await expect(button).toHaveAccessibleName('Copied')
    await page.clock.runFor(200)
    await expect(button).toHaveAccessibleName('Copy address')
    expect(await page.evaluate('window.__shift')).toBe(0)
  })

  test('S5.2 FR-004 C2 Tab reaches the address, then Copy; Enter and Space each copy, and focus stays with its ring', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const mail = section(page).getByRole('link', { name: EMAIL })
    // Start just before the section, then Tab until the address has focus.
    await page.locator('#side a').last().focus()
    await tabTo(page, '#contact .ds-email__address')
    await expect(mail).toBeFocused()
    await page.keyboard.press('Tab')
    const button = copyButton(page)
    await expect(button).toBeFocused()
    expect(await page.evaluate(`getComputedStyle(document.querySelector('#contact [data-email-copy]')).outlineStyle`)).toBe('solid')
    for (const key of ['Enter', 'Space']) {
      await page.evaluate('navigator.clipboard.writeText("")')
      await page.keyboard.press(key)
      await expect(button, key).toHaveAccessibleName('Copied')
      expect(await page.evaluate('navigator.clipboard.readText()'), key).toBe(EMAIL)
      await expect(button).toBeFocused()
    }
  })

  test('S2.3 S2.5 FR-004 C4 where the clipboard refuses, the address is selected, the label and live region say so, and the link still works', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) } })
    })
    await enter(page, { viewport: PHONE, theme: 'light' })
    await openHome(page)
    await section(page).scrollIntoViewIfNeeded()
    const button = copyButton(page)
    const before = await button.boundingBox()
    await watchShifts(page)
    await button.click()
    await expect(button).toHaveAccessibleName('Address selected')
    await expect(status(page)).toHaveText("Couldn't copy here, so the address is selected. Copy it with your keyboard or the menu.")
    expect(await page.evaluate('String(window.getSelection())')).toBe(EMAIL)
    expect((await button.boundingBox())?.width).toBe(before?.width)
    await expect(section(page).getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`)
    expect(await page.evaluate('window.__shift')).toBe(0)
  })

  test('S2.3 FR-004 where the clipboard is missing, Copy selects the address', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined })
    })
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await copyButton(page).click()
    await expect(copyButton(page)).toHaveAccessibleName('Address selected')
    expect(await page.evaluate('String(window.getSelection())')).toBe(EMAIL)
  })
})

test.describe('nothing leaves, one script', () => {
  test('S4.1 S4.2 FR-007 using Copy makes no request to another host, and each page with Copy loads only the one module', async ({ page, context, baseURL }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const origins = new Set<string>()
    page.on('request', (request) => origins.add(new URL(request.url()).origin))
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const address of [...PAGES, '/design-system']) {
      await page.goto(address)
      expect(await page.locator('[data-email-copy]').count(), address).toBeGreaterThan(0)
      expect(await onlyPreviewScript(page), address).toBe(true)
    }
    await openHome(page)
    await copyButton(page).click()
    await expect(copyButton(page)).toHaveAccessibleName('Copied')
    expect([...origins]).toEqual([new URL(baseURL ?? '').origin])
  })

  test('S3.1 SC-003 FR-006 every built page links mail only to brad@bradthome.com, shows no other address, and no phone number', () => {
    const pages = htmlIn(DIST)
    expect(pages.length).toBeGreaterThan(5)
    for (const file of pages) {
      const html = readFileSync(file, 'utf8')
      for (const [, href] of html.matchAll(/href="(mailto:[^"]*)"/g)) expect(href, file).toBe(`mailto:${EMAIL}`)
      const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ')
      for (const [address] of text.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)) expect(address, file).toBe(EMAIL)
      expect(text.match(/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/)?.[0], file).toBeUndefined()
    }
  })
})

test.describe('the gallery, sizes and contrast', () => {
  test('S3.3 FR-005 the gallery\'s Contact section holds rest, focus, copied and refused, and its asks go to #contact', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await page.goto('/design-system#contact')
    const blocks = page.locator('#contact .ds-email')
    await expect(blocks).toHaveCount(4)
    const names = ['Copy address', 'Copy address', 'Copied', 'Address selected']
    for (const [i, name] of names.entries()) await expect(blocks.nth(i).locator('button')).toHaveAccessibleName(name)
    await expect(blocks.nth(1).locator('button')).toHaveClass(/is-focus/)
    await expect(page.locator('#contact .ds-email-link')).toHaveAttribute('href', `mailto:${EMAIL}`)
    for (const ask of await page.getByRole('link', { name: /Ask (about Brad|Brad about it)/ }).all()) await expect(ask).toHaveAttribute('href', '#contact')
  })

  test('S5.1 FR-008 the Copy button, the section\'s links and the hero\'s address are at least 44 pixels tall', async ({ page }) => {
    for (const viewport of [PHONE, DESKTOP]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      for (const target of [copyButton(page), ...(await section(page).locator('.contact__links > li > a:first-child').all()), page.locator('.hero__actions a').nth(2)]) {
        expect((await target.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('S5.3 FR-008 every text in the section and the hero\'s address has 4.5:1 contrast, light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      const pairs = (await page.evaluate(`(() => {
        const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return 'rgb(255, 255, 255)' }
        const els = [...document.querySelectorAll('#contact h2, #contact a, #contact button, .hero__actions .ds-email-link')]
        return els.map((el) => [getComputedStyle(el).color, bgOf(el), el.textContent.trim()])
      })()`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(5)
      for (const [color, bg, text] of pairs) expect(contrast(color, bg), `${theme}: ${text}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
