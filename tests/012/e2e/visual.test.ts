import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, HOME_STATES, openHome, PHONE, hideFrame } from '../../010/helpers/e2e.ts'

// The Experience section's visual snapshots (S5.5): the section at phone
// 390×844 and desktop 1280×800, in light and dark, with reduced motion on
// (E1–E4); a receipt open on each size (R1, R2); and a timeline row and a
// marker with keyboard focus (F1, F2). Spec 003's settings apply: the pinned
// container, no pixel tolerance. Baselines come from
// pnpm test:visual tests/012 --update.

const STATE_IDS = { H1: 'E1', H2: 'E2', H3: 'E3', H4: 'E4' } as const

for (const state of HOME_STATES) {
  const id = STATE_IDS[state.id]
  test(`S5.5 FR-010 S1.1 S1.5 ${id} the Experience section at rest matches its baseline, ${state.size} ${state.theme}`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await openHome(page)
    await hideFrame(page)
    await expect(page.locator('#experience')).toHaveScreenshot(`experience-${state.size}-${state.theme}.png`)
  })
}

for (const [id, size, viewport, theme, n, card] of [
  ['R1', 'desktop', DESKTOP, 'light', '15, proof', 'bleacher-report'],
  ['R2', 'phone', PHONE, 'dark', '16, ask Brad', 'bookshout'],
] as const) {
  test(`S5.5 S4.2 S4.3 ${id} receipt ${n} open matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openHome(page)
    await page.getByRole('link', { name: `Receipt ${n}` }).click()
    await page.mouse.move(0, 0)
    await hideFrame(page)
    await expect(page.locator(`#experience-${card}`)).toHaveScreenshot(`experience-receipt-${size}-${theme}.png`)
  })
}

test('S5.5 S5.1 F1 the timeline with its Hopper row focused matches its baseline, desktop dark', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: DESKTOP, theme: 'dark' })
  await openHome(page)
  // Spec 026: the last thing before the timeline is the Hopper topic's Receipts control.
  await page.locator('.hopper__topic:has(#hopper-mobile-remoteui-and-webviews) .ds-receipts__summary').focus()
  await page.keyboard.press('Tab')
  await hideFrame(page)
  await expect(page.locator('#experience .experience__timeline')).toHaveScreenshot('experience-focus-desktop-dark.png')
})

test('S5.5 S5.1 F2 marker 15 focused matches its baseline, phone light', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: PHONE, theme: 'light' })
  await openHome(page)
  // Amended by spec 034 (D219).
  await page.getByRole('link', { name: 'Receipt 17, ask Brad' }).focus()
  // From marker 14, marker 15 is next: its card's Receipts control follows the markers (spec 026).
  await page.keyboard.press('Tab')
  await hideFrame(page)
  await expect(page.locator('#experience-bleacher-report')).toHaveScreenshot('experience-focus-phone-light.png')
})
