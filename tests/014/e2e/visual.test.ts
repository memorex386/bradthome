import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, PHONE, hideFrame } from '../../010/helpers/e2e.ts'

// The role pages' visual snapshots (S5.4): the top of each page, the header,
// the switch and the hero, at phone 390×844 and desktop 1280×800, in light
// and dark, with reduced motion on (M1–M6); and the switch with a link
// focused (F1). Spec 003's settings apply: the pinned container, no pixel
// tolerance. Baselines come from pnpm test:visual tests/014 --update.

const STATES = [
  ['M1', '/mobile', 'desktop', DESKTOP, 'light'],
  ['M2', '/mobile', 'phone', PHONE, 'dark'],
  ['M3', '/fullstack', 'desktop', DESKTOP, 'dark'],
  ['M4', '/fullstack', 'phone', PHONE, 'light'],
  ['M5', '/ai', 'desktop', DESKTOP, 'light'],
  ['M6', '/ai', 'phone', PHONE, 'dark'],
] as const

for (const [id, path, size, viewport, theme] of STATES) {
  test(`S5.4 FR-010 S1.4 S1.6 ${id} the top of ${path} matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await page.goto(path)
    await page.evaluate('document.fonts.ready.then(() => undefined)')
    await expect(page).toHaveScreenshot(`role${path.replace('/', '-')}-${size}-${theme}.png`)
  })
}

test('S5.4 S3.3 F1 the switch with "Applied AI" focused on /mobile matches its baseline, desktop light', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: DESKTOP, theme: 'light' })
  await page.goto('/mobile')
  await page.evaluate('document.fonts.ready.then(() => undefined)')
  // Spec 025: the switch is "Tailor this page", under the hero's tiles.
  await page.getByRole('navigation', { name: 'Tailor this page' }).getByRole('link', { name: 'Full-stack' }).focus()
  await page.keyboard.press('Tab')
  await hideFrame(page)
  await expect(page.locator('.hero__roles')).toHaveScreenshot('role-switch-focus-desktop-light.png')
})
