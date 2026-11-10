import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, HOME_STATES, openHome, PHONE } from '../../010/helpers/e2e.ts'

// The Hopper story's visual snapshots (S4.5): the section at phone 390×844
// and desktop 1280×800, in light and dark, with reduced motion on (K1–K4);
// receipt 3 open on each size (R1, R2); and a marker and a note's summary
// with keyboard focus (F1, F2). Spec 003's settings apply: the pinned
// container, no pixel tolerance. Baselines come from
// pnpm test:visual tests/011 --update.

const STATE_IDS = { H1: 'K1', H2: 'K2', H3: 'K3', H4: 'K4' } as const

for (const state of HOME_STATES) {
  const id = STATE_IDS[state.id]
  test(`S4.5 FR-008 S1.1 S1.3 ${id} the Hopper story at rest matches its baseline, ${state.size} ${state.theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await openHome(page)
    await expect(page.locator('#hopper')).toHaveScreenshot(`hopper-${state.size}-${state.theme}.png`)
  })
}

for (const [id, size, viewport, theme] of [
  ['R1', 'desktop', DESKTOP, 'light'],
  ['R2', 'phone', PHONE, 'dark'],
] as const) {
  test(`S4.5 S3.2 S3.5 ${id} receipt 3 open matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openHome(page)
    await page.getByRole('link', { name: 'Receipt 3, ask Brad' }).click()
    await page.mouse.move(0, 0)
    await expect(page.locator('#hopper .hopper__topics > li').first()).toHaveScreenshot(`hopper-receipt-${size}-${theme}.png`)
  })
}

for (const [id, size, viewport, theme, target] of [
  ['F1', 'desktop', DESKTOP, 'dark', 'marker'],
  ['F2', 'phone', PHONE, 'light', 'summary'],
] as const) {
  test(`S4.5 S4.1 ${id} a receipt's ${target} with keyboard focus matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openHome(page)
    await page.getByRole('link', { name: 'Receipt 2, ask Brad' }).focus()
    // From marker 2: its note's summary, then marker 3, then receipt 3's summary.
    for (let i = 0; i < (target === 'marker' ? 2 : 3); i++) await page.keyboard.press('Tab')
    // Spec 025: the shot is the topic's claims, inside the card. With the
    // Hopper band moved up, the card's rounded corners anti-aliased one
    // level apart between CI and a local container, as spec 010's card did (#49).
    await expect(page.locator('#hopper .hopper__topics > li').first().locator('.ds-claims')).toHaveScreenshot(`hopper-focus-${size}-${theme}.png`)
  })
}
