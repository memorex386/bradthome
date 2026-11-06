import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, HOME_STATES, openHome, PHONE } from '../helpers/e2e.ts'

// /v2's visual snapshots (S3.2): the whole page at phone 390×844 and desktop
// 1280×800, in light and dark, with reduced motion on, so the hero is at
// rest, plus the hero's first button with keyboard focus, shot as the hero.
// Spec 003's settings apply (playwright.config.ts): the pinned container, no
// pixel tolerance. Baselines
// are in tests/snapshots/010/e2e/ and come from pnpm test:visual tests/010 --update.

for (const state of HOME_STATES) {
  test(`S3.2 ${state.id} /v2 at rest matches its baseline, ${state.size} ${state.theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await openHome(page)
    await expect(page).toHaveScreenshot(`home-${state.size}-${state.theme}.png`, { fullPage: true })
  })
}

for (const [id, size, viewport, theme] of [
  ['F1', 'desktop', DESKTOP, 'light'],
  ['F2', 'phone', PHONE, 'dark'],
] as const) {
  test(`S3.2 S4.1 ${id} a hero button with keyboard focus matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openHome(page)
    // Tab to the hero's first button, as the title says. A fixed count drifted
    // onto a role pill and the header's GitHub link once spec 014 added the
    // role switch, and the pill's ring, overlapping its neighbour, flaked on
    // main at 91d1d65.
    const button = page.locator('.hero').getByRole('link', { name: 'See the work at Hopper' })
    for (let i = 0; i < 20 && !(await button.evaluate((el) => el === el.ownerDocument.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(button).toBeFocused()
    // Steady the shot: the fonts are in, the scroll that focus started has
    // settled for two frames, and any transition is stopped. The pixel
    // threshold is unchanged.
    await page.evaluate('document.fonts.ready')
    await expect
      .poll(() => page.evaluate('new Promise((done) => { const y = scrollY; requestAnimationFrame(() => requestAnimationFrame(() => done(scrollY === y))) })'))
      .toBe(true)
    // The shot is the hero, the button's own section: the role switch's pill
    // edges above it rasterize a few pixels differently from run to run.
    await expect(page.locator('.hero')).toHaveScreenshot(`home-focus-${size}-${theme}.png`, { animations: 'disabled' })
  })
}
