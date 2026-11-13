import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, HOME_STATES, openHome, PHONE, hideFrame } from '../../010/helpers/e2e.ts'
import { openOnClaim } from '../helpers/e2e.ts'

// The Hopper story's visual snapshots (S4.5): the section at phone 390×844
// and desktop 1280×800, in light and dark, with reduced motion on (K1–K4);
// the Capital One card landed on by a link to its first claim, on each size
// (R1, R2); and a sparkle and a source with keyboard focus (F1, F2), amended
// by spec 038 (D229, D230), which retires the receipts' drawers and markers.
// Spec 003's settings apply: the pinned container, no pixel tolerance.
// Baselines come from pnpm test:visual tests/011 --update.

const STATE_IDS = { H1: 'K1', H2: 'K2', H3: 'K3', H4: 'K4' } as const

for (const state of HOME_STATES) {
  const id = STATE_IDS[state.id]
  test(`S4.5 FR-008 S1.1 S1.3 ${id} the Hopper story at rest matches its baseline, ${state.size} ${state.theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, state)
    await openHome(page)
    await hideFrame(page)
    await expect(page.locator('#hopper')).toHaveScreenshot(`hopper-${state.size}-${state.theme}.png`)
  })
}

// Amended by spec 038 (D229): there's no drawer to open. A link to the card's first claim, as a chat answer's source
// is, lands on it, and the claim shows its tint.
for (const [id, size, viewport, theme] of [
  ['R1', 'desktop', DESKTOP, 'light'],
  ['R2', 'phone', PHONE, 'dark'],
] as const) {
  test(`S4.5 S3.5 ${id} the Capital One card landed on by a link to its first claim matches its baseline, ${size} ${theme}`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openOnClaim(page, 'hopper-disruption-assistance-1')
    await page.mouse.move(0, 0)
    await hideFrame(page)
    await expect(page.locator('#hopper .hopper__topics > li').first()).toHaveScreenshot(`hopper-receipt-${size}-${theme}.png`)
  })
}

// Amended by spec 038 (D229, D230): a sparkle, with its ring and "Ask about this", and a source, in place of a marker
// and a drawer's control.
for (const [id, size, viewport, theme, target] of [
  ['F1', 'desktop', DESKTOP, 'dark', 'sparkle'],
  ['F2', 'phone', PHONE, 'light', 'source'],
] as const) {
  test(`S4.5 S4.1 ${id} a ${target} on the Capital One card with keyboard focus matches its baseline, ${size} ${theme}`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport, theme })
    await openHome(page)
    // The sparkle before the one to focus: the role's last, then the card's first; or the card's last, then its first source.
    const from = target === 'sparkle' ? 'hopper-role-and-dates-2' : 'hopper-disruption-assistance-4'
    await page.locator(`#receipt-${from} .ds-claim-ask`).focus()
    await page.keyboard.press('Tab')
    // Spec 025: the shot is inside the card. With the Hopper band moved up,
    // the card's rounded corners anti-aliased one level apart between CI and
    // a local container, as spec 010's card did (#49).
    const inside = target === 'sparkle' ? '.ds-claims' : '.ds-sources'
    await hideFrame(page)
    await expect(page.locator('#hopper .hopper__topics > li').first().locator(inside)).toHaveScreenshot(`hopper-focus-${size}-${theme}.png`)
  })
}
