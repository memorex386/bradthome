import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { enter, PHONE } from '../../010/helpers/e2e.ts'
import { steadyHero, WHOLE_TILES } from '../helpers/e2e.ts'

// Spec 036's M7 open menu in the pinned container, as a snapshot with no pixel
// tolerance (S8.2). The click leaves the menu button hovered and pressed, and
// Chromium redraws only the changed part of a tile, so on a busy machine the
// button's rounded edges came out a level or two apart from run to run, as
// M5's did (motion-visual.test.ts). This file's browser draws each changed tile
// whole, through Chromium's --disable-partial-raster (WHOLE_TILES), so the shot
// comes out the same every run, and the same as the baseline the default
// browser drew. Baselines come from pnpm test:visual tests/036 --update.

test.use(WHOLE_TILES)

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

test.describe('the header on a phone (M7)', () => {
  test('S8.2 S6.1 M7 the open menu, holding the sections only, matches its baseline, phone light', async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    await page.evaluate(`document.styleSheets[0]?.insertRule('.chat-corner { visibility: hidden !important }', 0)`)
    await steadyHero(page)
    await page.locator('.ds-header__menu > summary').click()
    const panel = page.locator('header.ds-header').getByRole('navigation', { name: 'Menu' })
    await expect(panel).toBeVisible()
    const header = await page.locator('header.ds-header').boundingBox()
    const menu = await panel.boundingBox()
    const bottom = Math.ceil(Math.max((header?.y ?? 0) + (header?.height ?? 0), (menu?.y ?? 0) + (menu?.height ?? 0))) + 8
    await expect(page).toHaveScreenshot('M7-header-menu-phone-light.png', { clip: { x: 0, y: 0, width: PHONE.width, height: bottom } })
  })
})
