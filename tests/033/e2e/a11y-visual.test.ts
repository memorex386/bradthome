import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, hideFrame, HOME, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { CARD, repoCounts, steadyRecords } from '../helpers/e2e.ts'

// Spec 033's card for everyone: axe at WCAG 2.2 AA with the target-size rule
// on, its contrast, the keyboard's path and ring, no motion and no layout
// shift (S5.1–S5.3, S5.5), and its snapshots in the pinned container with no
// pixel tolerance, the counts and date held steady (S5.4). Baselines come
// from pnpm test:visual tests/033 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const

const openDrawer = (page: Page): Promise<unknown> =>
  page.evaluate(`document.querySelector('${CARD} .ds-receipts__drawer').setAttribute('open', '')`)

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of SIZES) {
    test(`S5.1 SC-005 FR-008 the card has no violation at WCAG 2.2 AA, drawer closed and open, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme })
      await openHome(page)
      for (const state of ['closed', 'open']) {
        if (state === 'open') await openDrawer(page)
        const results = await new AxeBuilder({ page }).include(CARD).withTags(TAGS).analyze()
        expect(results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`)), state).toEqual([])
        expect(
          results.passes
            .map((rule) => rule.id)
            .concat(
              results.inapplicable.map((rule) => rule.id),
              results.incomplete.map((rule) => rule.id),
            ),
        ).toContain('target-size')
      }
    })

    test(`S5.4 M1 M2 the card, drawer closed and open, matches its baselines, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await openHome(page)
      await hideFrame(page)
      await steadyRecords(page)
      await page.locator(CARD).scrollIntoViewIfNeeded()
      await page.mouse.move(0, 0)
      await expect(page.locator(CARD)).toHaveScreenshot(`card-closed-${size}-${theme}.png`)
      await page.locator(`${CARD} .ds-receipts__summary`).click()
      await page.mouse.move(0, 0)
      await expect(page.locator(`${CARD} .ds-receipts__drawer`)).toHaveAttribute('open', '')
      await expect(page.locator(CARD)).toHaveScreenshot(`card-open-${size}-${theme}.png`)
    })
  }

  test(`S5.2 FR-008 the counts, their labels and the date line meet 4.5:1, with the card's other words, ${theme}`, async ({ page }) => {
    for (const [, viewport] of SIZES) {
      await enter(page, { viewport, theme })
      await openHome(page)
      await openDrawer(page)
      const pairs = (await page.evaluate(String.raw`(() => {
        const bg = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return 'rgb(255, 255, 255)' }
        const sel = ['h3', '.ds-card__kicker', '.side__count-value', '.side__count-label', '.side__counted', '.side__counted time', '[data-claim] p', '.side__links > a', '.ds-receipts__label', '.ds-receipts__title', '.ds-receipts__source'].map((s) => '${CARD} ' + s).join(', ')
        return [...document.querySelectorAll(sel)].map((el) => [getComputedStyle(el).color, bg(el), el.className || el.tagName])
      })()`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(15)
      for (const [color, bg, what] of pairs) expect(contrast(color, bg), `${theme} ${what}: ${color} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  test(`S5.3 FR-008 Tab goes through the counts, the markers, the drawer and the link, each with the 2-pixel accent ring, ${theme}`, async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme })
    await openHome(page)
    const counts = repoCounts()
    const last = Number(await page.locator('#side-sudoku-world a.ds-marker').last().textContent())
    await page.locator('#side-sudoku-world .side__links > a').last().focus()
    const expected = [
      { tag: 'a', label: `${counts.decisions} decisions` },
      { tag: 'a', label: `${counts.specs} specs` },
      { tag: 'a', label: `${counts.releases} releases` },
      ...[0, 1, 2, 3].map((at) => ({ tag: 'a', label: `Receipt ${last + 1 + at}, proof` })),
      { tag: 'summary', label: 'Receipts' },
      { tag: 'a', label: 'Read the source on GitHub' },
    ]
    for (const step of expected) {
      await page.keyboard.press('Tab')
      const now = await focused(page)
      expect(now?.tag, `${theme} ${step.label}`).toBe(step.tag)
      expect(squashed(now?.label), theme).toContain(step.label)
      expect(now?.outline).toBe('solid')
      expect(now?.width ?? 0).toBeGreaterThanOrEqual(2)
      expect(now?.color).toBe(RGB[theme].accent)
      expect(contrast(now?.color ?? '', RGB[theme].surface)).toBeGreaterThanOrEqual(3)
    }
    // With its drawer open, the summary leads to each row's links.
    await openDrawer(page)
    await page.locator(`${CARD} .ds-receipts__summary`).focus()
    for (const host of ['github.com', 'bradthome.com', 'github.com', 'github.com', 'bradthome.com']) {
      await page.keyboard.press('Tab')
      expect((await focused(page))?.label).toBe(host)
    }
  })
}

const squashed = (text: string | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim()

test('S5.5 SC-005 FR-008 the card has no motion of its own, and the page shifts nothing as it loads and scrolls to it', async ({ page }) => {
  for (const [, viewport] of SIZES) {
    await page.goto('about:blank')
    await enter(page, { viewport, theme: 'light' }, 'no-preference')
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shift += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    await page.goto(HOME)
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await page.waitForTimeout(3000)
    expect(await page.evaluate('window.__shift'), `${viewport.width}`).toBe(0)
    // Spec 028's reveal settles each card once, and is done by now (D211); the card adds nothing of its own.
    expect(await page.evaluate(`document.getAnimations().filter((a) => a.effect.target.closest('${CARD}')).length`)).toBe(0)
    expect(await page.locator(`${CARD} [style]:not([data-rv], [data-rv] *)`).count()).toBe(0)
  }
})
