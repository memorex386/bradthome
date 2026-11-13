import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enterGallery, GALLERY_STATES, openGallery, PHONE } from '../helpers/e2e.ts'

// The gallery's visual snapshots (S4.4): the whole page at phone 390×844 and
// desktop 1280×800, in light and dark, with reduced motion on, plus the phone's
// menu open and, on each size, a claim a link has landed on (spec 038, which
// retired the receipt opened by its marker). Spec 003's settings apply
// (playwright.config.ts): the pinned container, no pixel tolerance. Baselines
// are in tests/snapshots/009/e2e/ and come from pnpm test:visual --update.

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
  // Amended by spec 038 (D229): the markers and drawers are gone. Where a marker opened its card's drawer, a link now
  // lands on its claim, which tints while it's the target, so the shot is the card's claims with the first landed on.
  test(`S4.4 a claim a link lands on matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enterGallery(page, { viewport, theme })
    await openGallery(page)
    await page.evaluate(`location.hash = 'g-claim-1'`)
    await expect(page.locator('#g-claim-1')).toBeInViewport()
    // Spec 026: the shot is inside the card, since the card's rounded corners
    // anti-alias a few pixels apart between CI and a local container (spec 025's hand-over).
    await expect(page.locator('#proof .g-claims .ds-claims')).toHaveScreenshot(`proof-landed-${size}-${theme}.png`)
  })
}
