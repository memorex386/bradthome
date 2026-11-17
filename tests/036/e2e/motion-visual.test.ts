import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, hideFrame } from '../../010/helpers/e2e.ts'
import { WHOLE_TILES } from '../helpers/e2e.ts'

// Spec 036's M5 in the pinned container: hover on Mobile and keyboard focus on
// Full-stack, with motion allowed, as snapshots with no pixel tolerance (S8.2).
// Chromium redraws only the changed part of a tile, and where the hero's
// entrance and hover leave those partial redraws depends on the frames a busy
// machine drew, so a few rounded edges near them came out a level apart from
// run to run. This file's browser draws each changed tile whole, through
// Chromium's --disable-partial-raster, added to the config's switches
// (WHOLE_TILES), so the shots come out the same every run. The switch changes
// how the pixels are drawn, not what the page shows, and the other files keep
// the default browser and their baselines.
// Baselines come from pnpm test:visual tests/036 --update.

test.use(WHOLE_TILES)

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** The floating "Ask about Brad" covers part of a desktop's hero, so desktop shots hide it. */
const hideAsk = (page: Page): Promise<unknown> =>
  page.evaluate(`document.styleSheets[0]?.insertRule('.chat-ask { visibility: hidden !important }', 0)`)

for (const theme of ['light', 'dark'] as const) {
  test(`S8.2 S4.1 S4.2 M5 hover on Mobile and focus on Full-stack match their baselines, ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: DESKTOP, theme }, 'no-preference')
    await open(page, '/')
    await page.waitForTimeout(1800)
    await hideFrame(page)
    await hideAsk(page)
    await page.locator('#tile-mobile').hover()
    await page.waitForTimeout(800)
    await expect(page.locator('.hero')).toHaveScreenshot(`M5-hover-desktop-${theme}.png`)
    await page.mouse.move(0, 0)
    await page.locator('#tile-mobile').focus()
    await page.keyboard.press('Tab')
    await page.waitForTimeout(800)
    await expect(page.locator('.hero')).toHaveScreenshot(`M5-focus-desktop-${theme}.png`)
  })
}
