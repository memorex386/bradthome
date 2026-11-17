import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { contrast, enter, hideFrame } from '../../010/helpers/e2e.ts'
import { openOnClaim } from '../../011/helpers/e2e.ts'

// Spec 040 for everyone: axe at WCAG 2.2 AA over the Experience section on the
// home and each role page, in both themes at the brief's two sizes, RealPage's
// card's contrast, and each state in mocks/README.md as a snapshot in the
// pinned container with no pixel tolerance (M1, M2, M3, M7, and the card's
// sparkle focused). Baselines come from pnpm test:visual tests/040 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['phone', { width: 375, height: 812 }],
  ['desktop', { width: 1440, height: 900 }],
] as const
const THEMES = ['light', 'dark'] as const

async function open(page: Page, address: string): Promise<void> {
  await page.clock.setFixedTime(FIXED_TIME)
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** An element's color and the opaque color behind it, layered as the browser paints them. */
const pairOf = (page: Page, selector: string): Promise<{ color: string; back: string }> =>
  // A function on the element, not code built from strings (CodeQL's js/bad-code-sanitization), reading styles through its own window.
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const style = (node: typeof element) => node.ownerDocument.defaultView?.getComputedStyle(node)
      const parse = (value: string) => {
        const parts = (value.match(/[\d.]+/g) ?? []).map(Number)
        return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts.length > 3 ? (parts[3] ?? 1) : 1 }
      }
      const white = { r: 255, g: 255, b: 255, a: 1 }
      const layers: { r: number; g: number; b: number; a: number }[] = []
      for (let node: typeof element | null = element; node; node = node.parentElement) {
        const color = parse(style(node)?.backgroundColor ?? '')
        if (color.a > 0) layers.push(color)
        if (color.a === 1) break
      }
      let base = layers.length > 0 && layers.at(-1)?.a === 1 ? (layers.pop() ?? white) : white
      while (layers.length > 0) {
        const top = layers.pop() ?? base
        base = {
          r: top.r * top.a + base.r * (1 - top.a),
          g: top.g * top.a + base.g * (1 - top.a),
          b: top.b * top.a + base.b * (1 - top.a),
          a: 1,
        }
      }
      return { color: style(element)?.color ?? '', back: `rgb(${[base.r, base.g, base.b].map(Math.round).join(', ')})` }
    })

for (const theme of THEMES) {
  for (const [size, viewport] of SIZES) {
    for (const address of ['/', '/mobile', '/fullstack', '/ai']) {
      test(`S5.2 SC-004 FR-008 ${address}’s Experience section has no violation at WCAG 2.2 AA, ${size} ${theme}`, async ({ page }) => {
        await enter(page, { viewport, theme })
        await open(page, address)
        const results = await new AxeBuilder({ page }).include('#experience').withTags(TAGS).analyze()
        expect(
          results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}`)),
        ).toEqual([])
      })
    }
  }

  test(`S5.2 FR-008 RealPage’s card’s words meet 4.5:1 and its sparkle 3:1, ${theme}`, async ({ page }) => {
    await enter(page, { viewport: { width: 1440, height: 900 }, theme })
    await open(page, '/')
    for (const selector of [
      '#experience-realpage .ds-card__kicker',
      '#experience-realpage h3',
      '#experience-realpage .ds-claim',
      '#experience-realpage li',
    ]) {
      const { color, back } = await pairOf(page, selector)
      expect(contrast(color, back), `${selector}: ${color} on ${back}`).toBeGreaterThanOrEqual(4.5)
    }
    const sparkle = await pairOf(page, '#experience-realpage .ds-claim-ask')
    expect(contrast(sparkle.color, sparkle.back), `sparkle: ${sparkle.color} on ${sparkle.back}`).toBeGreaterThanOrEqual(3)
  })

  for (const [size, viewport] of SIZES) {
    test(`S5.6 S1.1 M1 the home’s Experience section with RealPage’s card matches its baseline, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme })
      await open(page, '/')
      await hideFrame(page)
      await expect(page.locator('#experience')).toHaveScreenshot(`M1-experience-${size}-${theme}.png`)
    })

    test(`S5.6 S1.2 M3 RealPage’s card matches its baseline, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme })
      await open(page, '/')
      await hideFrame(page)
      await expect(page.locator('#experience-realpage')).toHaveScreenshot(`M3-realpage-${size}-${theme}.png`)
    })
  }
}

// M2: a role page's section, with the home's cards, claims and words (S1.3's browser test compares them). It has its
// own baseline: the section sits lower on a role page, by a fraction of a pixel, so its text draws a little differently.
test('S5.6 S1.3 M2 /mobile’s Experience section with RealPage’s card matches its baseline, phone light', async ({ page }) => {
  await enter(page, { viewport: { width: 375, height: 812 }, theme: 'light' })
  await open(page, '/mobile')
  await hideFrame(page)
  await expect(page.locator('#experience')).toHaveScreenshot('M2-experience-mobile-phone-light.png')
})

// M7: a link to RealPage's sentence, as the corpus sends it, lands on it with its tint.
test('S5.6 S4.1 M7 RealPage’s card landed on by a link to realpage-2 matches its baseline, desktop light', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: { width: 1440, height: 900 }, theme: 'light' })
  await openOnClaim(page, 'realpage-2')
  await page.mouse.move(0, 0)
  await hideFrame(page)
  await expect(page.locator('#experience-realpage')).toHaveScreenshot('M7-realpage-landed-desktop-light.png')
})

test('S5.6 S1.2 RealPage’s sparkle focused, with its ring and "Ask about this", matches its baseline, phone light', async ({ page }) => {
  await enter(page, { viewport: { width: 375, height: 812 }, theme: 'light' })
  await open(page, '/')
  await page.locator('#receipt-bleacher-report-3 .ds-claim-ask').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('#receipt-realpage-2 .ds-claim-ask')).toBeFocused()
  await hideFrame(page)
  await expect(page.locator('#experience-realpage')).toHaveScreenshot('M3-realpage-focus-phone-light.png')
})
