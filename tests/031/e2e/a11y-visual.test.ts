import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { enter } from '../../010/helpers/e2e.ts'
import { steadyRecords } from '../../033/helpers/e2e.ts'
import { fakeApi } from '../../022/helpers/fake-api.ts'
import { BUTTON, cornerOf, flick, jump, PHONE_375, tapsOf } from '../helpers/corner.ts'

// Spec 031's accessibility and snapshots on a 375 × 812 phone, in both
// themes: axe at WCAG 2.2 AA with the target-size rule on, in each of the
// corner's states and with the sheet open (S5.4), and a snapshot of each
// state's screen in the pinned container. Baselines come from
// pnpm test:visual tests/031 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * The circle, held still: a scroll down shrinks it, and once the stop timer
 * has opened it again, the test puts back the attribute the scroll set, so a
 * check or a shot can take its time.
 */
async function holdCircle(page: Page): Promise<void> {
  await flick(page, 400)
  expect((await cornerOf(page)).small, 'the scroll shrank it').toBe(true)
  await page.waitForTimeout(700)
  await page.evaluate(`document.querySelector('.chat-corner').setAttribute('data-small', '')`)
  await page.waitForTimeout(400)
}

const violations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))
}

for (const theme of ['light', 'dark'] as const) {
  for (const path of ['/', '/ai']) {
    test(`S5.4 SC-003 ${path} has no violation in the corner's states and with the sheet open, ${theme}`, async ({ page }) => {
      await fakeApi(page)
      await enter(page, { viewport: PHONE_375, theme }, 'no-preference')
      await page.goto(path)
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      await page.waitForTimeout(2400)
      expect(await violations(page), 'on load').toEqual([])
      await jump(page, 520)
      expect(await violations(page), 'in the hero').toEqual([])
      await jump(page, 3000)
      await holdCircle(page)
      expect(await violations(page), 'the circle').toEqual([])
      await jump(page, 'end')
      expect(await violations(page), 'at the end').toEqual([])
      await jump(page, 3000)
      await page.locator(BUTTON).click()
      await page.locator('dialog[data-chat-dialog] textarea').waitFor()
      // With motion allowed the sheet fades in; axe reads its colors once it has.
      await page.waitForTimeout(800)
      expect(await violations(page), 'the sheet').toEqual([])
    })
  }

  test(`S1.1 S1.2 S1.4 S3.3 S1.5 the corner's states match their baselines, ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await fakeApi(page)
    await enter(page, { viewport: PHONE_375, theme })
    await page.goto('/')
    await page.evaluate('document.fonts.ready.then(() => undefined)')
    // The corner first shows at 1.8 s, once the hero has settled.
    await page.waitForTimeout(1900)
    await expect(page).toHaveScreenshot(`corner-load-${theme}.png`)
    await jump(page, 520)
    await expect(page).toHaveScreenshot(`corner-hero-${theme}.png`)
    await jump(page, 3000)
    await expect(page).toHaveScreenshot(`corner-stopped-${theme}.png`)
    // Reduced motion: scrolling down leaves the full pill.
    await flick(page, 400)
    await expect(page).toHaveScreenshot(`corner-reduced-scrolling-${theme}.png`)
    await jump(page, 'end')
    // Spec 033: bradthome.com's card ends the side section, its counts and date held steady.
    await steadyRecords(page)
    await expect(page).toHaveScreenshot(`corner-end-${theme}.png`)
    await jump(page, 3000)
    await page.locator(BUTTON).click()
    await page.locator('dialog[data-chat-dialog] textarea').waitFor()
    await expect(page).toHaveScreenshot(`corner-sheet-${theme}.png`)
  })

  test(`S2.1 the circle while scrolling down matches its baseline, ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: PHONE_375, theme }, 'no-preference')
    await page.goto('/')
    await page.evaluate('document.fonts.ready.then(() => undefined)')
    await page.waitForTimeout(2400)
    await jump(page, 3000)
    await holdCircle(page)
    expect(await tapsOf(page)).toEqual({ circle: true, words: false })
    await expect(page).toHaveScreenshot(`corner-scrolling-${theme}.png`)
  })
}
