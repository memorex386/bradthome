import { expect, test } from '@playwright/test'
import { HELD } from '../../../apps/site/src/components/chat/fixtures.ts'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { dialogOf, fakeApi, openChat } from '../helpers/fake-api.ts'

// Spec 022's snapshots (S10.1, SC-001): each held state in the gallery, and
// the button and the open window on the home (A1, A2), on a phone and a
// desktop, in light and dark. Spec 003's settings apply: the pinned
// container, reduced motion, no pixel tolerance. Baselines come from
// pnpm test:visual tests/022 --update.

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    test(`S10.1 SC-001 every held state in the gallery matches its baseline, ${size} ${theme}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await page.goto('/design-system#chat')
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      for (const state of HELD) {
        await expect(page.locator(`#chat-${state.id.toLowerCase()} .chat-frame`), state.id).toHaveScreenshot(
          `${state.id}-${size}-${theme}.png`,
        )
      }
    })

    test(`S1.1 S1.2 SC-001 A1 A2 the button and the open window on the home match their baselines, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await fakeApi(page)
      await enter(page, { viewport, theme })
      await openHome(page)
      await expect(page.locator('[data-chat-open]')).toHaveScreenshot(`A1-button-${size}-${theme}.png`)
      await openChat(page)
      // The open window as a visitor first sees it, with the question box focused.
      await expect(dialogOf(page).getByLabel('Your question')).toBeFocused()
      await expect(dialogOf(page)).toHaveScreenshot(`A2-open-${size}-${theme}.png`)
    })
  }
}
