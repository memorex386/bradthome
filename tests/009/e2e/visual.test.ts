import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enterGallery, GALLERY_STATES, openGallery, PHONE } from '../helpers/e2e.ts'

// The gallery's visual snapshots (S4.4): the whole page at phone 390×844 and
// desktop 1280×800, in light and dark, with reduced motion on, plus the phone's
// menu open and a receipt opened by its marker on each size. Spec 003's
// settings apply (playwright.config.ts): the pinned container, no pixel
// tolerance. Baselines are in tests/snapshots/009/e2e/ and come from
// pnpm test:visual --update.

for (const state of GALLERY_STATES) {
  test(`S4.4 ${state.id} the gallery matches its baseline, ${state.size} ${state.theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enterGallery(page, state)
    await openGallery(page)
    await expect(page).toHaveScreenshot(`gallery-${state.size}-${state.theme}.png`, { fullPage: true })
  })
}

test('S4.4 M1 the phone menu, open, matches its baseline', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enterGallery(page, { viewport: PHONE, theme: 'light' })
  await openGallery(page)
  await page.locator('summary[aria-label="Menu"]').click()
  await expect(page).toHaveScreenshot('menu-open-phone-light.png')
})

for (const [size, viewport, theme] of [
  ['desktop', DESKTOP, 'light'],
  ['phone', PHONE, 'dark'],
] as const) {
  test(`S4.4 R5 a receipt opened by its marker matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enterGallery(page, { viewport, theme })
    await openGallery(page)
    const marker = page.locator('.ds-claim a.ds-marker').first()
    await marker.scrollIntoViewIfNeeded()
    await marker.click()
    await expect(page.locator('#receipt-1')).toHaveAttribute('open')
    await expect(page).toHaveScreenshot(`receipt-open-${size}-${theme}.png`)
  })
}
