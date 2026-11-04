import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, HOME_STATES, openHome, PHONE } from '../helpers/e2e.ts'

// /v2's visual snapshots (S3.2): the whole page at phone 390×844 and desktop
// 1280×800, in light and dark, with reduced motion on, so the hero is at
// rest, plus each button with keyboard focus. Spec 003's settings apply
// (playwright.config.ts): the pinned container, no pixel tolerance. Baselines
// are in tests/snapshots/010/e2e/ and come from pnpm test:visual tests/010 --update.

for (const state of HOME_STATES) {
  test(`S3.2 ${state.id} /v2 at rest matches its baseline, ${state.size} ${state.theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await openHome(page)
    await expect(page).toHaveScreenshot(`home-${state.size}-${state.theme}.png`, { fullPage: true })
  })
}

for (const [id, size, viewport, theme, tabs] of [
  ['F1', 'desktop', DESKTOP, 'light', 6],
  ['F2', 'phone', PHONE, 'dark', 5],
] as const) {
  test(`S3.2 S4.1 ${id} a hero button with keyboard focus matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openHome(page)
    for (let i = 0; i < tabs; i++) await page.keyboard.press('Tab')
    await expect(page).toHaveScreenshot(`home-focus-${size}-${theme}.png`)
  })
}
