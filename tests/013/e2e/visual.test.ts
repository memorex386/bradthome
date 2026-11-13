import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, HOME_STATES, openHome, PHONE, hideFrame } from '../../010/helpers/e2e.ts'
import { openOnClaim } from '../../011/helpers/e2e.ts'
import { steadyRecords } from '../../033/helpers/e2e.ts'

// The "On the side" section's visual snapshots (S4.5): the section at phone
// 390×844 and desktop 1280×800, in light and dark, with reduced motion on
// (P1–P4); a card landed on by a link to one of its claims, on each size (R1,
// R2); and the 1M+ stat and a link with keyboard focus (F1, F2), amended by
// spec 038 (D229), which retires the receipts' drawers and markers. Spec
// 003's settings apply: the pinned container, no pixel tolerance. Baselines
// come from pnpm test:visual tests/013 --update.

const STATE_IDS = { H1: 'P1', H2: 'P2', H3: 'P3', H4: 'P4' } as const

for (const state of HOME_STATES) {
  const id = STATE_IDS[state.id]
  test(`S4.5 FR-010 S1.1 S1.5 ${id} the side projects at rest match their baseline, ${state.size} ${state.theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await openHome(page)
    await hideFrame(page)
    // Spec 033: the section holds bradthome.com's card, its counts and date held steady.
    await steadyRecords(page)
    await expect(page.locator('#side')).toHaveScreenshot(`side-${state.size}-${state.theme}.png`)
  })
}

// Amended by spec 038 (D229): there's no drawer to open. A link to a claim, as a chat answer's source is, lands on it,
// and the claim shows its tint: VINDecoded's downloads, under their linked stats, and Sudoku World's claim with no link.
for (const [id, size, viewport, theme, claim, card] of [
  ['R1', 'desktop', DESKTOP, 'light', 'vindecoded-3', 'vindecoded'],
  ['R2', 'phone', PHONE, 'dark', 'sudoku-world-2', 'sudoku-world'],
] as const) {
  test(`S4.5 S3.2 S3.3 ${id} the ${card} card landed on by a link to ${claim} matches its baseline, ${size} ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openOnClaim(page, claim)
    await page.mouse.move(0, 0)
    await hideFrame(page)
    await expect(page.locator(`#side-${card}`)).toHaveScreenshot(`side-receipt-${size}-${theme}.png`)
  })
}

// Amended by spec 038 (D229): VINDecoded's card now starts with its linked stats, so the first thing it focuses is the
// 1M+ stat, ringed whole, in place of marker 22.
test('S4.5 S4.1 F1 the 1M+ stat focused matches its baseline, desktop dark', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: DESKTOP, theme: 'dark' })
  await openHome(page)
  // The last thing before the side projects is Bottle Rocket's sparkle.
  await page.locator('#receipt-bottle-rocket-2 .ds-claim-ask').focus()
  await page.keyboard.press('Tab')
  await hideFrame(page)
  await expect(page.locator('#side-vindecoded')).toHaveScreenshot('side-focus-desktop-dark.png')
})

test('S4.5 S4.1 F2 the case study link focused matches its baseline, phone light', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await enter(page, { viewport: PHONE, theme: 'light' })
  await openHome(page)
  await page.getByRole('link', { name: 'vindecoded.com', exact: true }).focus()
  await page.keyboard.press('Tab')
  await hideFrame(page)
  await expect(page.locator('#side-vindecoded')).toHaveScreenshot('side-focus-phone-light.png')
})
