import { expect, type Page, test } from '@playwright/test'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { DESKTOP, enter, NARROW, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 026 in the browser: one receipts drawer per card, a marker opening
// its drawer and tinting its row, no script, and the page's height (D208).
// Playwright asks for reduced motion by default; the motion tests ask for
// no-preference.

const PAGES = ['/', '/mobile', '/fullstack', '/ai'] as const
const WIDE = { width: 1440, height: 900 } as const
// The cards that hold a drawer, in reading order (T3).
const CARDS = [
  '#hopper .hopper__head',
  '.hopper__topic:has(#hopper-disruption-assistance)',
  '.hopper__topic:has(#hopper-partner-platform)',
  '.hopper__topic:has(#hopper-fintech-ai)',
  '.hopper__topic:has(#hopper-agent-and-experimentation-workflow)',
  '.hopper__topic:has(#hopper-mobile-remoteui-and-webviews)',
  '#experience-bleacher-report',
  '#experience-bookshout',
  '#experience-bottle-rocket',
  '#side-vindecoded',
  '#side-sudoku-world',
] as const
// Each page's height at 5f5ffbc, before this slice, at reduced motion (spec 026's mocks/README.md).
const BEFORE = { phone: 10_497, desktop: 6577, wide: 6656 } as const
const ACCENT_SOFT = { light: 'rgb(234, 240, 254)', dark: 'rgb(28, 36, 64)' } as const
// Inside the Hopper band, the row tints with the band's own soft blue in both themes.
const BAND_FLASH = 'rgba(142, 168, 255, 0.16)'

/** A computed style of the first element matching a selector. */
const style = (page: Page, selector: string, property: string): Promise<string> =>
  page.evaluate(
    `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).getPropertyValue(${JSON.stringify(property)})`,
  ) as Promise<string>

/** Each matching element's height, in CSS pixels. */
const heights = (page: Page, selector: string): Promise<number[]> =>
  page.evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].map((e) => e.getBoundingClientRect().height)`) as Promise<
    number[]
  >

/** Opens every drawer on the page. */
const openAll = (page: Page): Promise<unknown> =>
  page.evaluate(`document.querySelectorAll('main .ds-receipts__drawer').forEach((d) => d.setAttribute('open', ''))`)

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

interface Mark {
  n: string
  kind: 'proof' | 'ask'
  href: string
}

const markers = (page: Page): Promise<Mark[]> =>
  page.evaluate(
    `[...document.querySelectorAll('main [data-claim] a.ds-marker')].map((a) => ({ n: a.textContent.trim(), kind: a.classList.contains('ds-marker--ask') ? 'ask' : 'proof', href: a.getAttribute('href') }))`,
  ) as Promise<Mark[]>

const rows = (page: Page): Promise<{ id: string; n: string; value: number; kind: string; title: string; end: string[] }[]> =>
  page.evaluate(
    `[...document.querySelectorAll('main .ds-receipts__row')].map((li) => ({ id: li.id, n: li.querySelector('.ds-marker').textContent.trim(), value: li.value, kind: li.querySelector('.ds-marker--ask') ? 'ask' : 'proof', title: li.querySelector('.ds-receipts__title').textContent.replace(/\\s+/g, ' ').trim(), end: [...li.querySelectorAll('.ds-receipts__kind, .ds-receipts__source')].map((e) => e.textContent.trim()) }))`,
  ) as never

test.describe('one drawer per card (T3)', () => {
  test('S1.1 SC-001 FR-001 eleven cards hold one drawer each, and no per-claim receipt is left', async ({ page }) => {
    for (const address of PAGES) {
      await open(page, address)
      await expect(page.locator('main .ds-receipts'), address).toHaveCount(11)
      for (const card of CARDS) await expect(page.locator(`${card} .ds-receipts`), `${address} ${card}`).toHaveCount(1)
      await expect(page.locator('main details.ds-receipt, main .ds-claim__notes'), address).toHaveCount(0)
      await expect(page.locator('main .ds-receipts__drawer[open]'), address).toHaveCount(0)
    }
  })

  test("S1.2 S1.3 SC-001 rows and markers are numbered 1 to 23 in reading order, and each marker's number and kind match its row", async ({
    page,
  }) => {
    const numbers = Array.from({ length: 23 }, (_, i) => String(i + 1))
    for (const address of PAGES) {
      await open(page, address)
      const marks = await markers(page)
      const list = await rows(page)
      expect(
        marks.map((m) => m.n),
        address,
      ).toEqual(numbers)
      expect(
        list.map((r) => r.n),
        address,
      ).toEqual(numbers)
      for (const mark of marks) {
        const row = list.find((r) => `#${r.id}` === mark.href)
        expect(row, `${address} ${mark.href}`).toBeDefined()
        expect([row?.n, row?.value, row?.kind], `${address} ${mark.href}`).toEqual([mark.n, Number(mark.n), mark.kind])
      }
      for (const row of list) {
        expect(row.title, `${address} ${row.id}`).toMatch(/^Receipt \d+: \S/)
        if (row.kind === 'ask') expect(row.end, row.id).toEqual(['Ask me'])
        else for (const host of row.end) expect(host, row.id).toMatch(/^(?!www\.)[a-z0-9.-]+\.[a-z]+$/)
      }
    }
  })

  test("S1.2 a proof row links each evidence URL, in the claim's order, by its host", async ({ page }) => {
    await open(page, '/')
    const sources = page.locator('#receipt-vindecoded-3 a.ds-receipts__source')
    await expect(sources).toHaveText(['play.google.com', 'apps.apple.com'])
    await expect(sources.first()).toHaveAttribute('href', /^https:\/\/play\.google\.com\//)
    await expect(page.locator('#receipt-bleacher-report-3 a.ds-receipts__source')).toHaveText(['play.google.com'])
  })

  test('S1.4 the control shows its numbers and "Receipts", and its summary from 48 rem', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    const featured = page.locator('#experience-bleacher-report .ds-receipts__summary')
    await expect(featured.locator('.ds-receipts__numbers .ds-marker')).toHaveText(['13', '14', '15'])
    await expect(featured.locator('.ds-receipts__label')).toHaveText('Receipts')
    await expect(featured.locator('.ds-receipts__sum')).toHaveText('1 with a public link · 2 to ask about')
    await expect(page.locator('.hopper__topic:has(#hopper-fintech-ai) .ds-receipts__sum')).toHaveText('No public link yet')
    await expect(page.locator('.hopper__topic:has(#hopper-partner-platform) .ds-receipts__sum')).toHaveText('No public links yet')
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    await expect(page.locator('.hopper__topic:has(#hopper-partner-platform) .ds-receipts__sum')).toBeHidden()
    await expect(page.locator('.hopper__topic:has(#hopper-partner-platform) .ds-receipts__label')).toBeVisible()
  })

  test('S1.5 beside the tags the control ends the last tag line, or wraps under it; alone it is a full-width bar', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      const placed = (await page.evaluate(`[...document.querySelectorAll('main .ds-receipts')].map((r) => {
        const s = r.querySelector('.ds-receipts__summary').getBoundingClientRect()
        const box = r.getBoundingClientRect()
        const tags = [...r.querySelectorAll('.ds-chip')].map((c) => c.getBoundingClientRect())
        const last = tags.at(-1)
        return { alone: r.classList.contains('ds-receipts--alone'), right: Math.round(box.right - s.right), width: Math.round(s.width - box.width), below: last ? s.top >= last.top - 12 : true, after: last ? s.left >= last.right || s.top >= last.bottom : true }
      })`)) as { alone: boolean; right: number; width: number; below: boolean; after: boolean }[]
      for (const [i, p] of placed.entries()) {
        if (p.alone) expect(p.width, `${viewport.width} ${CARDS[i]}`).toBe(0)
        else expect([p.right, p.below, p.after], `${viewport.width} ${CARDS[i]}`).toEqual([0, true, true])
      }
      // The five Hopper topics, BookShout and Bottle Rocket have tags; the role lines, Bleacher Report and the side projects don't.
      expect(placed.filter((p) => !p.alone).length).toBe(7)
    }
  })

  test('S1.6 a drawer with "Ask me" rows ends with an ask link to Contact; one with only proof has none', async ({ page }) => {
    await open(page, '/')
    await expect(page.locator('.hopper__topic:has(#hopper-partner-platform) .ds-receipts__foot a')).toHaveText('Ask Brad about these')
    await expect(page.locator('.hopper__topic:has(#hopper-fintech-ai) .ds-receipts__foot a')).toHaveText('Ask Brad about it')
    await expect(page.locator('#side-vindecoded .ds-receipts__foot')).toHaveCount(0)
    const hrefs = (await page.evaluate(
      `[...document.querySelectorAll('main .ds-receipts__foot a')].map((a) => a.getAttribute('href'))`,
    )) as string[]
    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) expect(href).toBe('#contact')
  })

  test("S1.7 a proof row's link keeps its link preview", async ({ page }) => {
    await open(page, '/')
    const link = page.locator('#receipt-vindecoded-3 a.ds-receipts__source').first()
    await expect(link).toHaveAttribute('data-preview', /^preview-vindecoded-3-/)
  })

  test("S1.8 the claims' words don't change, and their column is at most 56 rem wide", async ({ page }) => {
    await enter(page, { viewport: WIDE, theme: 'light' })
    await open(page, '/')
    const widths = (await page.evaluate(
      `[...document.querySelectorAll('main .ds-claims')].map((e) => e.getBoundingClientRect().width)`,
    )) as number[]
    for (const width of widths) expect(width).toBeLessThanOrEqual(56 * 16)
    // The degree's line carries its claim too, with no receipt.
    await expect(page.locator('main [data-claim]:not(dd)')).toHaveCount(23)
  })
})

test.describe('a marker opens its drawer (S2, MA-12)', () => {
  test('S2.1 S2.2 following a marker opens its drawer, brings its row into view and tints it, held under reduced motion', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: PHONE, theme })
      await open(page, '/')
      await page.locator('.hopper__topic:has(#hopper-partner-platform) a.ds-marker', { hasText: '7' }).click()
      await expect(page).toHaveURL(/#receipt-hopper-partner-platform-2$/)
      await expect(page.locator('.hopper__topic:has(#hopper-partner-platform) .ds-receipts__drawer')).toHaveAttribute('open')
      const row = page.locator('#receipt-hopper-partner-platform-2')
      await expect(row).toBeInViewport()
      const top = (await page.evaluate(
        `document.querySelector('#receipt-hopper-partner-platform-2').getBoundingClientRect().top`,
      )) as number
      expect(top, theme).toBeGreaterThan(PHONE.height * 0.2)
      expect(await style(page, '#receipt-hopper-partner-platform-2', 'background-color'), theme).toBe(BAND_FLASH)
    }
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    await page.locator('#side-sudoku-world a.ds-marker', { hasText: '23' }).click()
    expect(await style(page, '#receipt-sudoku-world-2', 'background-color')).toBe(ACCENT_SOFT.light)
  })

  test('S2.2 S2.4 with motion allowed, the row tints out over 650 ms, the chevron turns in 240 ms and the drawer opens in 280 ms', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await page.waitForTimeout(1800)
    // Record every animation that runs from the click on, so none is missed between frames.
    await page.evaluate(
      `window.__seen = new Set(); window.__watch = setInterval(() => { for (const a of document.getAnimations()) window.__seen.add([a.animationName ?? a.transitionProperty, a.effect.pseudoElement ?? '', Math.round(Number(a.effect.getTiming().duration))].join(' ')) }, 10)`,
    )
    // Chromium doesn't list a transition on ::details-content in getAnimations(), so the drawer's height is sampled each frame.
    await page.evaluate(
      `window.__heights = []; const box = document.querySelector('.hopper__topic:has(#hopper-partner-platform) details'); const start = performance.now(); const sample = () => { window.__heights.push([Math.round(performance.now() - start), parseFloat(getComputedStyle(box, '::details-content').height)]); if (performance.now() - start < 500) requestAnimationFrame(sample) }; requestAnimationFrame(sample)`,
    )
    await page.locator('.hopper__topic:has(#hopper-partner-platform) a.ds-marker', { hasText: '6' }).click()
    for (const expected of ['ds-receipts-flash  650', 'rotate  240'])
      await expect.poll(() => page.evaluate('[...window.__seen]'), { message: expected }).toContain(expected)
    await page.waitForTimeout(600)
    const heights = (await page.evaluate('window.__heights')) as [number, number][]
    const full = Math.max(...heights.map(([, h]) => h))
    const opening = heights.filter(([, h]) => h > 0 && h < full)
    expect(full).toBeGreaterThan(40)
    expect(opening.length, 'the drawer passes through heights between closed and open').toBeGreaterThan(2)
    // It reaches its full height within 280 ms of starting to open, give or take two frames.
    expect((opening.at(-1)?.[0] ?? 0) - (opening[0]?.[0] ?? 0)).toBeLessThanOrEqual(280 + 34)
    await page.waitForTimeout(800)
    expect(await style(page, '#receipt-hopper-partner-platform-1', 'background-color')).toBe('rgba(0, 0, 0, 0)')
  })

  test('S2.3 the control opens and closes the drawer by click, Enter and Space, and the chevron turns', async ({ page }) => {
    await open(page, '/')
    const drawer = page.locator('#experience-bookshout .ds-receipts__drawer')
    const summary = drawer.locator('summary')
    await summary.click()
    await expect(drawer).toHaveAttribute('open')
    expect(await style(page, '#experience-bookshout .ds-receipts__chevron', 'rotate')).toBe('180deg')
    await summary.press('Enter')
    await expect(drawer).not.toHaveAttribute('open')
    await summary.press('Space')
    await expect(drawer).toHaveAttribute('open')
    await expect(drawer.locator('.ds-receipts__row')).toHaveCount(2)
  })

  test('S2.4 under reduced motion nothing in a drawer animates or transitions', async ({ page }) => {
    await open(page, '/')
    await page.locator('.hopper__topic:has(#hopper-partner-platform) a.ds-marker', { hasText: '8' }).click()
    expect(await page.evaluate('document.getAnimations().length')).toBe(0)
  })

  test('S2.5 SC-003 with no script, each drawer opens from its control and from each of its markers', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: PHONE })
    const page = await context.newPage()
    for (const address of PAGES) {
      await page.goto(address)
      for (const mark of await markers(page)) {
        await page.goto(`${address}${mark.href}`)
        const open = await page.evaluate(`document.querySelector(${JSON.stringify(mark.href)}).closest('details').open`)
        expect(open, `${address}${mark.href}`).toBe(true)
      }
      await page.goto(address)
      await page.locator('#experience-bottle-rocket summary').click()
      await expect(page.locator('#experience-bottle-rocket details')).toHaveAttribute('open')
    }
    await context.close()
  })
})

test.describe('the page is shorter on a phone (S3)', () => {
  test('S3.1 S3.2 S3.3 SC-002 FR-006 the phone page is 800 px shorter, and each desktop page within 3%', async ({ page }) => {
    for (const address of PAGES) {
      for (const [size, viewport] of [
        ['phone', PHONE],
        ['desktop', DESKTOP],
        ['wide', WIDE],
      ] as const) {
        await enter(page, { viewport, theme: 'light' })
        await open(page, address)
        const height = (await page.evaluate('document.documentElement.scrollHeight')) as number
        if (size === 'phone') expect(height, `${address} ${size}`).toBeLessThanOrEqual(BEFORE.phone - 800)
        else expect(Math.abs(height - BEFORE[size]) / BEFORE[size], `${address} ${size}: ${height}`).toBeLessThan(0.03)
      }
    }
  })
})

test.describe('it works for everyone (S4)', () => {
  test('S4.2 each control and row link is 44 px tall with a 2 px accent ring, and names itself', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      await openAll(page)
      for (const height of await heights(page, 'main .ds-receipts__summary, main .ds-receipts__source'))
        expect(height, `${viewport.width}`).toBeGreaterThanOrEqual(44)
      const scroll = (await page.evaluate('document.documentElement.scrollWidth')) as number
      expect(scroll, `${viewport.width}`).toBeLessThanOrEqual(viewport.width)
    }
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await page.locator('.hopper__topic:has(#hopper-fintech-ai) summary').focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    const ring = await focused(page)
    expect([ring?.tag, ring?.width, ring?.color]).toEqual(['summary', 2, RGB.light.accent])
    await expect(page.locator('.hopper__topic:has(#hopper-fintech-ai) summary')).toHaveAccessibleName('Receipts No public link yet')
  })

  test('S4.5 SC-004 the page loads with no layout shift', async ({ page }) => {
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' }, 'no-preference')
      await page.goto('/')
      await page.waitForTimeout(1900)
      expect(await page.evaluate('window.__shift'), `${viewport.width}`).toBe(0)
    }
  })
})

test.describe('nothing new runs (S4.6)', () => {
  // The one module at 5f5ffbc, before this slice: this slice changes no script source, so the build's module is the same bytes.
  const MODULE_BYTES = 8510

  test('S4.6 SC-005 FR-008 each page loads only the one module, at its size before this slice, and nothing in main carries an inline style', async ({
    page,
  }) => {
    for (const address of [...PAGES, '/design-system']) {
      await open(page, address)
      expect(await onlyPreviewScript(page), address).toBe(true)
      expect(await page.locator('main [style]').count(), address).toBe(0)
    }
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    expect((await (await page.request.get(src)).body()).length).toBe(MODULE_BYTES)
  })
})

test.describe('the gallery (S5)', () => {
  test('S5.1 the receipts section shows a tagged card with a closed drawer, an open drawer, and the markers in hover and focus', async ({
    page,
  }) => {
    await open(page, '/design-system')
    const section = page.locator('#receipts')
    await expect(section.locator('.ds-receipts')).toHaveCount(2)
    await expect(section.locator('.ds-receipts').first().locator('.ds-chip')).toHaveCount(2)
    await expect(section.locator('.ds-receipts__drawer').first()).not.toHaveAttribute('open')
    await expect(section.locator('.ds-receipts--alone .ds-receipts__drawer')).toHaveAttribute('open')
    await expect(section.locator('.ds-receipts__row .ds-receipts__kind')).toHaveText(['Ask me', 'Ask me'])
    await expect(section.locator('.ds-marker.is-hover')).toHaveCount(2)
    await expect(section.locator('.ds-marker.is-focus')).toHaveCount(2)
    await expect(page.locator('.ds-claim, .ds-receipt')).toHaveCount(0)
  })
})
