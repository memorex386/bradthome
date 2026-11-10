import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, PHONE, hideFrame } from '../../010/helpers/e2e.ts'

// The privacy note's visual snapshots (S6.4): /privacy whole (P2) and the
// footer (P1), on a phone and a desktop in light and dark, and the footer's
// link focused. Spec 003's settings apply: the pinned container, no pixel
// tolerance. Baselines come from pnpm test:visual tests/018 --update.

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    test(`S6.4 S5.2 P2 /privacy matches its baseline, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await page.goto('/privacy')
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      await expect(page).toHaveScreenshot(`privacy-${size}-${theme}.png`, { fullPage: true })
    })

    test(`S6.4 S5.1 P1 the footer with its Privacy link matches its baseline, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await page.goto('/')
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      await hideFrame(page)
      await expect(page.locator('footer.ds-footer')).toHaveScreenshot(`footer-${size}-${theme}.png`)
    })
  }

  test(`S6.4 S6.2 P1 the footer's Privacy link focused matches its baseline, ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: DESKTOP, theme })
    await page.goto('/')
    await page.evaluate('document.fonts.ready.then(() => undefined)')
    // Tab from the footer's first link until the privacy link has focus, never a fixed count.
    await page.locator('footer.ds-footer a').first().focus()
    for (let i = 0; i < 10 && !(await page.evaluate(`document.activeElement?.matches('.ds-footer__privacy') === true`)); i += 1) await page.keyboard.press('Tab')
    await expect(page.locator('.ds-footer__privacy')).toBeFocused()
    await hideFrame(page)
    await expect(page.locator('footer.ds-footer')).toHaveScreenshot(`footer-focused-${theme}.png`)
  })
}
