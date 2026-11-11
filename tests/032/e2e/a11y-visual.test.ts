import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { enter, hideFrame } from '../../010/helpers/e2e.ts'
import { HERO_BUTTON, jump, PHONE_375 } from '../../031/helpers/corner.ts'

// Spec 032's accessibility and snapshot: axe at WCAG 2.2 AA with the pill in
// the hero's place, both themes, and the hero's phone pill in the pinned
// container. Baselines come from pnpm test:visual tests/032 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const theme of ['light', 'dark'] as const) {
  test(`S2.5 SC-002 with the pill in the hero's place, axe finds no violation and one button is named, ${theme}`, async ({ page }) => {
    await enter(page, { viewport: PHONE_375, theme }, 'no-preference')
    await page.goto('/')
    await page.waitForTimeout(2400)
    await jump(page, 400)
    await page.waitForTimeout(600)
    await expect(page.getByRole('button', { name: 'Ask about Brad', exact: true })).toHaveCount(1)
    await expect(page.locator(HERO_BUTTON)).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    expect(results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))).toEqual([])
  })

  test(`S1.1 the hero's phone pill matches its baseline, ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: PHONE_375, theme })
    await page.goto('/')
    await page.evaluate('document.fonts.ready.then(() => undefined)')
    await page.waitForTimeout(1900)
    // With the button in its band the pill is in its place; the shot is of it alone, so nothing scrolls it out.
    await jump(page, 400)
    await hideFrame(page)
    await expect(page.locator(HERO_BUTTON)).toBeVisible()
    await expect(page.locator(HERO_BUTTON)).toHaveScreenshot(`hero-pill-${theme}.png`)
  })
}
