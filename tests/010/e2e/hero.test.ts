import { expect, test } from '@playwright/test'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, freezeAt, HOME, NARROW, openHome, PHONE, timings } from '../helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 010's hero in the browser: what it shows, its first frame, its timings,
// layout shift, reduced motion and the keyboard. Playwright's config asks for
// reduced motion by default; the motion tests ask for no-preference.

const WORDS = 'Mobile. Full-stack. Applied AI.'
// Spec 025 (D205): proof tiles replace the chips.
const TEXT = '.hero .ds-eyebrow, .hero__word, .hero__dot, .hero__line, .hero__actions a, .hero__tile, .hero__row, .hero__stack-head > *'

test.describe('what the hero shows', () => {
  test('S1.1 FR-003 H1 on a desktop the eyebrow, words, lines, buttons and chips read in order, with the card to the right', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const eyebrow = page.locator('.hero .ds-eyebrow')
    await expect(eyebrow).toHaveText('Senior mobile & full-stack engineer · Dallas–Fort Worth')
    await expect(eyebrow).toHaveCSS('text-transform', 'uppercase')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(WORDS)
    await expect(page.locator('.hero__word')).toHaveText(['Mobile.', 'Full-stack.', 'Applied AI.'])
    await expect(page.locator('.hero__dot').first()).toHaveCSS('color', RGB.light.accent)
    await expect(page.locator('.hero__line')).toHaveText([
      'I build Android, iOS and web products end to end.',
      'Fast with AI agents, careful with production.',
    ])
    // Spec 017 (D152): Brad's address sits beside the résumé link.
    await expect(page.locator('.hero__actions a')).toHaveText(['See the work at Hopper', 'Read the résumé', 'brad@bradthome.com'])
    await expect(page.locator('.hero__figure')).toHaveText(['5', '10+', 'Founding'])
    await expect(page.locator('.hero__layer')).toHaveText(['Android', 'iOS', 'Web', 'Services', 'AI'])
    const order = await page.evaluate(
      `['.hero .ds-eyebrow', 'h1', '.hero__lines', '.hero__actions', '.hero__proof'].map((s) => document.querySelector(s).getBoundingClientRect().top)`,
    )
    expect(order).toEqual([...(order as number[])].sort((a, b) => a - b))
    const text = await page.locator('.hero__text').boundingBox()
    const card = await page.locator('.hero__stack').boundingBox()
    expect(card?.x ?? 0).toBeGreaterThan((text?.x ?? 0) + (text?.width ?? 0) - 1)
  })

  test('S1.2 H3 on a phone the parts stack in order, the card under the chips, and nothing scrolls sideways', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const chips = await page.locator('.hero__proof').boundingBox()
      const card = await page.locator('.hero__stack').boundingBox()
      expect(card?.y ?? 0, `${viewport.width}`).toBeGreaterThan((chips?.y ?? 0) + (chips?.height ?? 0))
      expect(await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), `${viewport.width}`).toBe(
        true,
      )
    }
  })

  test('S1.4 a screen reader hears the heading, the Highlights list and the End to end region', async ({ page }) => {
    await openHome(page)
    await expect(page.getByRole('heading', { level: 1, name: WORDS })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Highlights' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'End to end' })).toBeVisible()
  })
})

test.describe('the first frame and the sequence', () => {
  test('S1.3 SC-004 Q1 in the first frame every part is in place, opaque and unblurred, and the words meet AA in both themes', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme }, 'no-preference')
      await page.goto(HOME)
      expect(await freezeAt(page, 0), theme).toBeGreaterThan(0)
      const parts = (await page.evaluate(`[...document.querySelectorAll(${JSON.stringify(TEXT)})].map((el) => {
        const style = getComputedStyle(el)
        return { text: el.textContent.trim().slice(0, 20), opacity: style.opacity, filter: style.filter, visibility: style.visibility }
      })`)) as { text: string; opacity: string; filter: string; visibility: string }[]
      expect(parts.length, theme).toBeGreaterThan(15)
      for (const part of parts) expect(part, `${theme} ${part.text}`).toMatchObject({ opacity: '1', filter: 'none', visibility: 'visible' })
      const colors = (await page.evaluate(
        `[...document.querySelectorAll('.hero__word')].map((el) => getComputedStyle(el).color)`,
      )) as string[]
      expect(
        colors.some((color) => color !== RGB[theme].ink),
        `${theme}: the words start muted`,
      ).toBe(true)
      for (const color of colors) expect(contrast(color, RGB[theme].bg), `${theme} ${color}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  // Spec 025 (D204) moved the hero to the Brisk pace; its own tests check every animation against the motion table.
  test('S2.1 S2.2 S2.3 SC-003 FR-004 the animations keep the Brisk pace: words 300 ms apart over 520 ms, and all at rest by 1,600 ms', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto(HOME)
    const all = await timings(page)
    const find = (cls: string, name: string): { delay: number; duration: number } => {
      const found = all.find((timing) => timing.target.split(' ').includes(cls) && timing.name === name)
      expect(found, `${cls} ${name}`).toBeDefined()
      return { delay: found?.delay ?? -1, duration: found?.duration ?? -1 }
    }
    expect(find('hero__word--1', 'hero-word-rise')).toEqual({ delay: 0, duration: 520 })
    expect(find('hero__word--2', 'hero-word-rise')).toEqual({ delay: 300, duration: 520 })
    expect(find('hero__word--3', 'hero-word-rise')).toEqual({ delay: 600, duration: 520 })
    expect(find('hero__row--1', 'hero-row')).toEqual({ delay: 140, duration: 700 })
    expect(find('hero__row--2', 'hero-row')).toEqual({ delay: 440, duration: 700 })
    expect(find('hero__row--3', 'hero-row')).toEqual({ delay: 740, duration: 700 })
    expect(find('hero__dot', 'hero-dot')).toEqual({ delay: 286, duration: 520 })
    expect(find('hero__line--1', 'hero-rise')).toEqual({ delay: 760, duration: 540 })
    expect(find('hero__line--2', 'hero-rise')).toEqual({ delay: 880, duration: 540 })
    expect(find('hero__actions', 'hero-rise')).toEqual({ delay: 1000, duration: 540 })
    expect(find('hero__proof', 'hero-rise')).toEqual({ delay: 1060, duration: 540 })
    expect(Math.max(...all.map((timing) => timing.delay + timing.duration))).toBeLessThanOrEqual(1600)
  })

  test('S2.1 Q2 mid-sequence, the landed word is ink and the next is still on its way', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'dark' }, 'no-preference')
    await page.goto(HOME)
    await freezeAt(page, 700)
    const colors = (await page.evaluate(
      `[...document.querySelectorAll('.hero__word')].map((el) => getComputedStyle(el).color)`,
    )) as string[]
    expect(colors[0]).toBe(RGB.dark.ink)
    expect(colors[2]).not.toBe(RGB.dark.ink)
  })

  test('S2.4 FR-005 every animation plays once, none is running after 2.7 s, and the page runs no script but the previews script', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' }, 'no-preference')
    await page.goto(HOME)
    const all = await timings(page)
    expect(all.length).toBeGreaterThan(10)
    for (const timing of all) expect(timing.iterations, `${timing.target} ${timing.name}`).toBe(1)
    await page.waitForTimeout(2900)
    expect(await page.evaluate('document.getAnimations().filter((a) => a.playState === "running").length')).toBe(0)
    expect(await onlyPreviewScript(page)).toBe(true)
    expect(await page.locator('[style]').count()).toBe(0)
  })

  test('S2.5 SC-001 the sequence shifts nothing: layout shifts add up to 0', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' }, 'no-preference')
      await page.addInitScript(
        `window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shift += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
      )
      await page.goto(HOME)
      await page.waitForTimeout(3000)
      expect(await page.evaluate('window.__shift'), `${viewport.width}`).toBe(0)
    }
  })

  test('S3.1 with reduced motion nothing on the page animates or transitions, and the hero is at rest', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      expect(await page.evaluate('document.getAnimations().length'), theme).toBe(0)
      const moving = await page.evaluate(
        `[...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); return s.animationName !== 'none' || s.transitionDuration.split(',').some((d) => Number.parseFloat(d) > 0) }).length`,
      )
      expect(moving, theme).toBe(0)
      const colors = (await page.evaluate(
        `[...document.querySelectorAll('.hero__word')].map((el) => getComputedStyle(el).color)`,
      )) as string[]
      expect(colors, theme).toEqual([RGB[theme].ink, RGB[theme].ink, RGB[theme].ink])
    }
  })
})

test.describe('the buttons and the keyboard', () => {
  test('S4.1 FR-006 F1 F2 Tab goes to the skip link, the header, then both buttons and the address (spec 017), each with a 2-pixel accent ring', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      for (const label of [
        'Skip to the content',
        'Brad Thome',
        'Hopper',
        'Experience',
        'On the side',
        // Spec 017 (D152): the header's link to the contact section.
        'Contact',
        'GitHub',
        'LinkedIn',
        // Spec 025 (D206): the role switch left the top of the page for the hero, under its tiles.
        'See the work at Hopper',
        'Read the résumé',
        'brad@bradthome.com',
      ]) {
        await page.keyboard.press('Tab')
        const now = await focused(page)
        expect(now?.label, `${theme} ${label}`).toBe(label)
        expect(now?.outline, `${theme} ${label}`).toBe('solid')
        expect(now?.width ?? 0, `${theme} ${label}`).toBeGreaterThanOrEqual(2)
        expect(now?.color, `${theme} ${label}`).toBe(RGB[theme].accent)
      }
    }
  })

  test('S4.2 FR-006 the buttons link the Hopper story and the full-stack résumé PDF (spec 015, D141), and each is at least 44 pixels tall', async ({ page }) => {
    await openHome(page)
    const work = page.getByRole('link', { name: 'See the work at Hopper' })
    const resume = page.getByRole('link', { name: 'Read the résumé' })
    await expect(work).toHaveAttribute('href', '#hopper')
    await expect(resume).toHaveAttribute('href', '/resume/brad-thome-full-stack.pdf')
    for (const link of [work, resume]) expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
    await work.click()
    await expect(page).toHaveURL(/#hopper$/)
    await expect(page.locator('#hopper').getByRole('heading', { name: 'Fintech products for Hopper and its partners' })).toBeInViewport()
  })
})

test.describe('the essay and 404 page stay v1 (spec 019)', () => {
  test("S6.2 FR-010 v1's pages still load v1's stylesheet, and none links /v2", async ({ page }) => {
    for (const path of ['/vindecoded-agents', '/404']) {
      await page.goto(path)
      const sheets = (await page.evaluate(
        `[...document.querySelectorAll('link[rel=stylesheet]')].map((l) => new URL(l.href).pathname)`,
      )) as string[]
      expect(sheets, path).toHaveLength(1)
      expect(sheets[0], path).toMatch(/^\/_astro\/Base\.[\w-]+\.css$/)
      expect(await page.locator('a[href="/v2"], a[href$="/v2.html"]').count(), path).toBe(0)
    }
  })

  test('S6.3 the home carries no noindex meta tag, and its title and description are set', async ({ page }) => {
    await openHome(page)
    expect(await page.locator('meta[name="robots"]').count()).toBe(0)
    await expect(page).toHaveTitle('Brad Thome')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Android, iOS and web/)
  })
})
