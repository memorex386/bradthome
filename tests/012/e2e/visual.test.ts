import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, HOME_STATES, openHome, PHONE, hideFrame } from '../../010/helpers/e2e.ts'
import { openOnClaim } from '../../011/helpers/e2e.ts'

// The Experience section's visual snapshots (S5.5): the section at phone
// 390×844 and desktop 1280×800, in light and dark, with reduced motion on
// (E1–E4); a card landed on by a link to one of its claims, on each size
// (R1, R2); and a timeline row and the 10M+ claim's sparkle with keyboard
// focus (F1, F2), amended by spec 038 (D229, D230), which retires the
// receipts' drawers and markers. Spec 003's settings apply: the pinned
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

// Amended by spec 038 (D229): there's no drawer to open. A link to a claim, as a chat answer's source is, lands on it,
// and the claim shows its tint: the 10M+ claim, under its linked stat, and BookShout's first.
for (const [id, size, viewport, theme, claim, card] of [
  ['R1', 'desktop', DESKTOP, 'light', 'bleacher-report-3', 'bleacher-report'],
  ['R2', 'phone', PHONE, 'dark', 'bookshout-2', 'bookshout'],
] as const) {
  test(`S5.5 S4.2 S4.5 ${id} the ${card} card landed on by a link to ${claim} matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openOnClaim(page, claim)
    await page.mouse.move(0, 0)
    await hideFrame(page)
    await expect(page.locator(`#experience-${card}`)).toHaveScreenshot(`experience-receipt-${size}-${theme}.png`)
  })
}

test('S5.5 S5.1 F1 the timeline with its Hopper row focused matches its baseline, desktop dark', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: DESKTOP, theme: 'dark' })
  await openHome(page)
  // Amended by spec 038 (D229): the last thing before the timeline is the Hopper story's last sparkle.
  await page.locator('#receipt-hopper-mobile-remoteui-and-webviews-4 .ds-claim-ask').focus()
  await page.keyboard.press('Tab')
  await hideFrame(page)
  await expect(page.locator('#experience .experience__timeline')).toHaveScreenshot('experience-focus-desktop-dark.png')
})

// Amended by spec 038 (D230): the 10M+ claim's sparkle, with its ring and "Ask about this", in place of marker 18.
test('S5.5 S5.1 F2 the 10M+ claim’s sparkle focused matches its baseline, phone light', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: PHONE, theme: 'light' })
  await openHome(page)
  await page.locator('#receipt-bleacher-report-2 .ds-claim-ask').focus()
  await page.keyboard.press('Tab')
  await hideFrame(page)
  await expect(page.locator('#experience-bleacher-report')).toHaveScreenshot('experience-focus-phone-light.png')
})
