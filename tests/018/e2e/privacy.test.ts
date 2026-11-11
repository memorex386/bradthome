import { expect, type Page, test } from '@playwright/test'
import { contrast, DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'
import { LEDE, MOMENTS, SECTIONS } from '../../../apps/site/src/components/privacy/privacy.ts'
import { fakeUmami, openProd, sentAtLeast, settle } from '../helpers/umami.ts'

// The privacy note and its footer link in the browser (Story 5, S6.1–S6.3,
// FR-006, FR-008): the link on every new page, the note's words, noindex and
// header, the keyboard, target size, contrast and layout shift.

const FOOTED = ['/', '/mobile', '/fullstack', '/ai', '/privacy', '/design-system'] as const
// The one module's size on main before this slice, with spec 017's copy button (3,383 bytes). SC-005: the analytics add under 2.5 KB.
const MODULE_BEFORE = 3383

/** Tabs until the target has focus, never a fixed count (spec 010's lesson). */
async function tabTo(page: Page, selector: string, limit = 200): Promise<void> {
  for (let i = 0; i < limit; i += 1) {
    if (await page.evaluate(`document.activeElement?.matches(${JSON.stringify(selector)}) === true`)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('Tab never reached the target')
}

async function watchShifts(page: Page): Promise<void> {
  await page.addInitScript(`window.__shift = 0; new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`)
}

test.describe('the footer link', () => {
  test('S5.1 FR-006 P1 every new page links "Privacy" to /privacy in its footer, and every footer link is at least 24 by 24 pixels', async ({ page }) => {
    for (const viewport of [PHONE, DESKTOP]) {
      await enter(page, { viewport, theme: 'light' })
      for (const address of FOOTED) {
        await page.goto(address)
        const link = page.locator('footer.ds-footer').getByRole('link', { name: 'Privacy', exact: true })
        await expect(link, address).toHaveAttribute('href', '/privacy')
        for (const each of await page.locator('footer.ds-footer a').all()) {
          const box = await each.boundingBox()
          expect(box !== null && box.width >= 24 && box.height >= 24, `${address} ${JSON.stringify(box)}`).toBe(true)
        }
      }
    }
  })

  test('S6.2 P1 Tab reaches the Privacy link in the footer with a visible ring, and Enter opens /privacy', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await page.goto('/')
    await tabTo(page, '.ds-footer__privacy')
    const ring = await page.evaluate(
      `(() => { const style = getComputedStyle(document.activeElement); return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) >= 2 })()`,
    )
    expect(ring).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/privacy$/)
  })
})

test.describe('the note', () => {
  test('S5.2 S5.3 FR-006 P2 /privacy shows the title, the lede, each section and its facts, and how to reach Brad', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await page.goto('/privacy')
    const main = page.locator('main')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy')
    await expect(main).toContainText(LEDE)
    for (const section of SECTIONS) {
      await expect(page.getByRole('heading', { level: 2, name: section.heading })).toBeVisible()
      for (const text of [...(section.paragraphs ?? []), ...(section.items ?? [])]) await expect(main, text).toContainText(text)
    }
    for (const moment of MOMENTS) await expect(page.locator('main li', { hasText: moment })).toHaveCount(1)
    for (const fact of ['Umami Cloud', 'No cookies', 'Do Not Track', 'Global Privacy Control', 'US region for 6 months', 'Only Brad sees the counts'])
      await expect(main, fact).toContainText(fact)
    await expect(main.getByRole('link', { name: 'brad@bradthome.com' })).toHaveAttribute('href', 'mailto:brad@bradthome.com')
  })

  test('S5.4 /privacy carries noindex, and its header links to the sections of the home', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    const nav = page.getByRole('navigation', { name: 'Sections' })
    for (const [name, href] of [
      ['Hopper', '/#hopper'],
      ['Experience', '/#experience'],
      ['On the side', '/#side'],
      ['Contact', '/#contact'],
    ] as const)
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href)
  })

  test('S6.1 FR-008 every text on /privacy and in its footer has 4.5:1 contrast, light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await page.goto('/privacy')
      const pairs = (await page.evaluate(`(() => {
        const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return 'rgb(255, 255, 255)' }
        const els = [...document.querySelectorAll('main h1, main h2, main p, main li, main a, footer span, footer a')]
        return els.map((el) => [getComputedStyle(el).color, bgOf(el), el.textContent.trim().slice(0, 40)])
      })()`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(10)
      for (const [color, bg, text] of pairs) expect(contrast(color, bg), `${theme}: ${text}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

test.describe('still and small', () => {
  test('S6.3 FR-008 SC-005 with the sender running against the fake, the home and /privacy shift by 0, and the module grows by under 2.5 KB', async ({ page, context, baseURL }) => {
    const fake = await fakeUmami(context, baseURL ?? '')
    await watchShifts(page)
    for (const viewport of [PHONE, DESKTOP]) {
      await enter(page, { viewport, theme: 'light' })
      for (const address of ['/', '/privacy']) {
        fake.sent.length = 0
        await openProd(page, address)
        await sentAtLeast(page, fake, 1)
        expect(fake.sent.length, address).toBeGreaterThan(0)
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        await settle(page)
        expect(await page.evaluate('window.__shift'), `${address} ${viewport.width}`).toBe(0)
      }
    }
    const src = await page.locator('script[src]').first().getAttribute('src')
    const size = (await (await page.request.get(new URL(src ?? '', baseURL).toString())).body()).length
    // Spec 022 adds the chat's loader to the same module, under 3 KB of its own,
    // spec 025 the hero's deep-link settle, at most 512 bytes (D204), and spec 027
    // the sticky header's observers, at most 1,280 bytes (Brad's Gate 1 card, D209).
    // Spec 028 adds the section reveals, at most 1,024 bytes (Brad's Gate 1 card, D211).
    // Spec 029 adds the role switch's morph, at most 768 bytes (Brad's Gate 1 card, D212).
    // Spec 030 adds the chat's hand-off from "Ask me", at most 384 bytes (Brad's Gate 1 card, D213).
    expect(size - MODULE_BEFORE, 'SC-005').toBeLessThan(2560 + 3072 + 512 + 1280 + 1024 + 768 + 384)
  })
})
