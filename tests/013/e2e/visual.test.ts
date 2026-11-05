import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, HOME_STATES, openHome, PHONE } from '../../010/helpers/e2e.ts'

// The "On the side" section's visual snapshots (S4.5): the section at phone
// 390×844 and desktop 1280×800, in light and dark, with reduced motion on
// (P1–P4); a receipt open on each size (R1, R2); and a marker and a link with
// keyboard focus (F1, F2). Spec 003's settings apply: the pinned container,
// no pixel tolerance. Baselines come from pnpm test:visual tests/013 --update.

const STATE_IDS = { H1: 'P1', H2: 'P2', H3: 'P3', H4: 'P4' } as const

for (const state of HOME_STATES) {
  const id = STATE_IDS[state.id]
  test(`S4.5 FR-010 S1.1 S1.5 ${id} the side projects at rest match their baseline, ${state.size} ${state.theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await openHome(page)
    await expect(page.locator('#side')).toHaveScreenshot(`side-${state.size}-${state.theme}.png`)
  })
}

for (const [id, size, viewport, theme, n, card] of [
  ['R1', 'desktop', DESKTOP, 'light', '20, proof', 'vindecoded'],
  ['R2', 'phone', PHONE, 'dark', '23, ask Brad', 'sudoku-world'],
] as const) {
  test(`S4.5 S3.2 S3.3 ${id} receipt ${n} open matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openHome(page)
    await page.getByRole('link', { name: `Receipt ${n}` }).click()
    await page.mouse.move(0, 0)
    await expect(page.locator(`#side-${card}`)).toHaveScreenshot(`side-receipt-${size}-${theme}.png`)
  })
}

test('S4.5 S4.1 F1 marker 19 focused matches its baseline, desktop dark', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: DESKTOP, theme: 'dark' })
  await openHome(page)
  await page.locator('#receipt-bottle-rocket-2 summary').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('#side-vindecoded')).toHaveScreenshot('side-focus-desktop-dark.png')
})

test('S4.5 S4.1 F2 the case study link focused matches its baseline, phone light', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: PHONE, theme: 'light' })
  await openHome(page)
  await page.getByRole('link', { name: 'vindecoded.com', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('#side-vindecoded')).toHaveScreenshot('side-focus-phone-light.png')
})
