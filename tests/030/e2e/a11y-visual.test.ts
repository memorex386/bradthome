import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, hideFrame, PHONE } from '../../010/helpers/e2e.ts'
import { fakeApi } from '../../022/helpers/fake-api.ts'

// Spec 030's accessibility and snapshots: axe at WCAG 2.2 AA with the chat
// opened from a claim (S5.1), and the claims that ask, in the pinned
// container at reduced motion (S5.2). Baselines come from pnpm test:visual
// tests/030 --update. Amended by spec 038 (D229, D230): the claims' sparkles
// ask in place of "Ask me", and there are no drawers to open.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const
const CLAIM = '#receipt-hopper-partner-platform-1'

const violations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))
}

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of SIZES) {
    for (const path of ['/', '/ai']) {
      test(`S5.1 SC-004 ${path} has no violation at rest and with the chat opened from a sparkle, ${size} ${theme}`, async ({ page }) => {
        await fakeApi(page)
        await enter(page, { viewport, theme })
        await page.goto(path)
        await page.evaluate('document.fonts.ready.then(() => undefined)')
        await page.locator(CLAIM).scrollIntoViewIfNeeded()
        expect(await violations(page), 'at rest').toEqual([])
        await page.locator(`${CLAIM} [data-chat-ask]`).click()
        await page.locator('dialog[data-chat-dialog] textarea').waitFor()
        expect(await violations(page), 'chat').toEqual([])
      })
    }

    // Amended by spec 038 (D230): the partner platform's claims, each ending with its sparkle, in place of a drawer's rows.
    test(`S5.2 the partner platform's claims, with their sparkles, match their baselines, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await page.goto('/')
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      await hideFrame(page)
      await expect(page.locator(CLAIM).locator('xpath=ancestor::div[contains(@class, "ds-claims")][1]')).toHaveScreenshot(
        `ask-claims-${size}-${theme}.png`,
      )
    })
  }
}
