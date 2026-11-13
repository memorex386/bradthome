import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { contrast, DESKTOP, enter, HOME, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// The contact in the browser (Stories 1–5): the hero's address in a phone's
// first screen, the header's Contact, the closing section, copy allowed and
// refused, no layout shift, the claims' sparkles (spec 038), the gallery, no
// outside request, one script, every built page's addresses, target sizes and
// contrast. Playwright's config asks for reduced motion by default.

const PAGES = [HOME, '/mobile', '/fullstack', '/ai'] as const
const EMAIL = 'brad@bradthome.com'
// The one module's size on main before this slice, from spec 016's build (2,366 bytes). SC-004: the copy code adds under 1 KB.
const MODULE_BEFORE = 2366
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
  // Amended by spec 036 (D225, D227): the hero's address is a button after the role tiles and the résumé, reading "Email" on a
  // phone with the address in its name, just below the first screen; the header keeps GitHub, LinkedIn and the résumé in it.
  test('S1.1 S1.2 SC-001 FR-002 H1 on a phone, every new page shows the address after the résumé button, and the header keeps the résumé in the first screen', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' })
    for (const address of PAGES) {
      await page.goto(address)
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      const links = page.locator('.hero__actions a')
      await expect(links.nth(1), address).toHaveText(/résumé PDF$/i)
      const email = links.nth(2)
      await expect(email, address).toHaveAccessibleName(`Email ${EMAIL}`)
      await expect(email, address).toHaveAttribute('href', `mailto:${EMAIL}`)
      const box = await email.boundingBox()
      expect(box && box.x + box.width <= PHONE.width, address).toBe(true)
      const resume = await page.locator('header.ds-header .ds-header__resume').boundingBox()
      expect(resume && resume.y >= 0 && resume.y + resume.height <= PHONE.height, address).toBe(true)
    }
  })

  test("S1.3 FR-003 the header's sections end with Contact, on a desktop and in the phone's menu", async ({ page }) => {
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

  // Amended by spec 038 (D230): the drawers and their ask links are gone (spec 026, D208). Each of the 30 claims ends
  // with a sparkle, which is the ask now, and with no script it's a link to the closing section.
  test("S3.2 FR-005 every claim's sparkle goes to #contact", async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const address of PAGES) {
      await page.goto(address)
      const asks = page.locator('main .ds-claim a.ds-claim-ask')
      await expect(asks, address).toHaveCount(30)
      for (const href of await asks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
        expect(href, address).toBe('#contact')
    }
  })
})

test.describe('copy', () => {
  test('S2.2 S2.5 SC-002 SC-004 FR-004 C3 a click copies exactly the address, says so, shows Copied for 2.6 seconds, and nothing moves', async ({ page, context }) => {
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
    // Spec 028's MA-17: "Copied" holds for 2.6 s, on Brad's Gate 1 card (D211).
    await page.clock.runFor(2500)
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
  test('S4.1 S4.2 SC-004 FR-007 using Copy makes no request to another host, and each page with Copy loads only the one module', async ({ page, context, baseURL }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const origins = new Set<string>()
    page.on('request', (request) => origins.add(new URL(request.url()).origin))
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const address of [...PAGES, '/design-system']) {
      await page.goto(address)
      expect(await page.locator('[data-email-copy]').count(), address).toBeGreaterThan(0)
      expect(await onlyPreviewScript(page), address).toBe(true)
    }
    const src = await page.locator('script[src]').first().getAttribute('src')
    const size = (await (await page.request.get(src ?? '')).body()).length
    // Spec 018 adds the analytics to the same module, under 2.5 KB of its own (its SC-005),
    // and spec 022 the chat's loader, under 3 KB, and spec 025 the hero's
    // deep-link settle, at most 512 bytes (D204), and spec 027 the sticky header's
    // observers, at most 1,280 bytes (Brad's Gate 1 card, D209).
    // Spec 029 adds the role switch's morph, at most 768 bytes (Brad's Gate 1 card, D212).
    // Spec 030 adds the chat's hand-off from "Ask me", at most 384 bytes (Brad's Gate 1 card, D213).
    // Spec 031's Gate 1 allowance for the phone's corner button (D214): 768 bytes more.
    // Spec 032's Gate 1 allowance for the pill's flight (D215): 768 bytes more.
    // Spec 036 adds its own 384-byte allowance on Brad's Gate 1 card: the hero's live years.
    expect(size - MODULE_BEFORE, 'SC-004 the copy code adds under 1 KB').toBeLessThan(1024 + 2560 + 3072 + 512 + 1280 + 1024 + 768 + 384 + 768 + 768 + 384)
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
      // Spec 022's chat adds a subject and the visitor's question to its mail links; the address is still Brad's alone, with no cc or bcc.
      for (const [, href] of html.matchAll(/href="(mailto:[^"]*)"/g)) {
        const mail = new URL(href!.replaceAll('&amp;', '&'))
        expect(`mailto:${mail.pathname}`, file).toBe(`mailto:${EMAIL}`)
        expect([...mail.searchParams.keys()].filter((key) => !['subject', 'body'].includes(key)), file).toEqual([])
      }
      const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ')
      for (const [address] of text.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)) expect(address, file).toBe(EMAIL)
      expect(text.match(/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/)?.[0], file).toBeUndefined()
    }
  })
})

test.describe('the gallery, sizes and contrast', () => {
  test("S3.3 FR-005 the gallery's Contact section holds rest, focus, copied and refused, and its asks go to #contact", async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await page.goto('/design-system#contact')
    const blocks = page.locator('#contact .ds-email')
    await expect(blocks).toHaveCount(4)
    const names = ['Copy address', 'Copy address', 'Copied', 'Address selected']
    for (const [i, name] of names.entries()) await expect(blocks.nth(i).locator('button')).toHaveAccessibleName(name)
    await expect(blocks.nth(1).locator('button')).toHaveClass(/is-focus/)
    await expect(page.locator('#contact .ds-email-link')).toHaveAttribute('href', `mailto:${EMAIL}`)
    // Amended by spec 038 (D230): the gallery's ask beside its claims is each claim's sparkle, named "Ask about this: …",
    // where its drawer's "Ask Brad about it" was.
    expect(await page.getByRole('link', { name: /^Ask about this: / }).count()).toBeGreaterThan(0)
    for (const ask of await page.getByRole('link', { name: /^Ask about (Brad|this)\b/ }).all())
      await expect(ask).toHaveAttribute('href', '#contact')
  })

  test("S5.1 FR-008 the Copy button, the address, the section's links and the hero's address are at least 44 pixels tall", async ({
    page,
  }) => {
    for (const viewport of [PHONE, DESKTOP]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      for (const target of [copyButton(page), section(page).locator('.ds-email__address'), ...(await section(page).locator('.contact__links > li > a:first-child').all()), page.locator('.hero__actions a').nth(2)]) {
        expect((await target.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test("S5.3 FR-008 every text in the section and the hero's address has 4.5:1 contrast, light and dark", async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      const pairs = (await page.evaluate(`(() => {
        const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return 'rgb(255, 255, 255)' }
        const els = [...document.querySelectorAll('#contact h2, #contact a, #contact button, .hero__actions .ds-email-split__link')]
        return els.map((el) => [getComputedStyle(el).color, bgOf(el), el.textContent.trim()])
      })()`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(5)
      for (const [color, bg, text] of pairs) expect(contrast(color, bg), `${theme}: ${text}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
