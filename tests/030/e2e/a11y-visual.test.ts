import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, hideFrame, PHONE } from '../../010/helpers/e2e.ts'
import { fakeApi } from '../../022/helpers/fake-api.ts'

// Spec 030's accessibility and snapshots: axe at WCAG 2.2 AA with a drawer
// open and with the chat opened from a receipt (S5.1), and an open drawer's
// rows, with their "Ask me" links, in the pinned container at reduced motion
// (S5.2). Baselines come from pnpm test:visual tests/030 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const
const DRAWER = '#receipt-hopper-partner-platform-1'

const violations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))
}

async function openDrawer(page: Page): Promise<void> {
  await page.evaluate(`document.querySelector('${DRAWER}').closest('details').open = true`)
  await page.locator(DRAWER).scrollIntoViewIfNeeded()
}

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of SIZES) {
    for (const path of ['/', '/ai']) {
      test(`S5.1 SC-004 ${path} has no violation with a drawer open and the chat opened from "Ask me", ${size} ${theme}`, async ({
        page,
      }) => {
        await fakeApi(page)
        await enter(page, { viewport, theme })
        await page.goto(path)
        await page.evaluate('document.fonts.ready.then(() => undefined)')
        await openDrawer(page)
        expect(await violations(page), 'drawer').toEqual([])
        await page.locator(`${DRAWER} [data-chat-ask]`).click()
        await page.locator('dialog[data-chat-dialog] textarea').waitFor()
        expect(await violations(page), 'chat').toEqual([])
      })
    }

    test(`S5.2 an open drawer's rows, with their "Ask me" links, match their baselines, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await page.goto('/')
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      await hideFrame(page)
      await openDrawer(page)
      await expect(page.locator(DRAWER).locator('xpath=ancestor::ol[1]')).toHaveScreenshot(`ask-rows-${size}-${theme}.png`)
    })
  }
}
