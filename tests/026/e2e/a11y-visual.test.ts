import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'

// Spec 026's accessibility and snapshots: axe at WCAG 2.2 AA with the
// target-size rule on, drawers closed and open (S4.1, S4.3), and cards with
// their drawers in the pinned container with no pixel tolerance (S4.4).
// Baselines come from pnpm test:visual tests/026 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const
// One card of each kind: in the band with tags, on the page with tags, and alone.
const SHOTS = [
  ['hopper', '#hopper-partner-platform', '#receipt-hopper-partner-platform-2'],
  ['experience', '#experience-bookshout', '#receipt-bookshout-1'],
  ['side', '#side-vindecoded', '#receipt-vindecoded-3'],
] as const

const openAll = (page: Page): Promise<unknown> =>
  page.evaluate(`document.querySelectorAll('.ds-receipts__drawer').forEach((d) => d.setAttribute('open', ''))`)

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of SIZES) {
    for (const path of ['/', '/ai', '/design-system']) {
      test(`S4.1 S4.3 SC-004 FR-007 ${path} has no violation at WCAG 2.2 AA with drawers closed and open, ${size} ${theme}`, async ({
        page,
      }) => {
        await enter(page, { viewport, theme })
        await page.goto(path)
        await page.evaluate('document.fonts.ready.then(() => undefined)')
        for (const state of ['closed', 'open']) {
          if (state === 'open') await openAll(page)
          const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
          const found = results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))
          expect(found, state).toEqual([])
        }
      })
    }

    for (const [name, card, row] of SHOTS) {
      test(`S4.4 ${name} card with its drawer closed and opened from a marker matches its baselines, ${size} ${theme}`, async ({
        page,
      }) => {
        await page.clock.setFixedTime(FIXED_TIME)
        await enter(page, { viewport, theme })
        await page.goto('/')
        await page.evaluate('document.fonts.ready.then(() => undefined)')
        await expect(page.locator(card)).toHaveScreenshot(`receipts-${name}-closed-${size}-${theme}.png`)
        await page.goto(`/${row}`)
        await page.evaluate('document.fonts.ready.then(() => undefined)')
        await expect(page.locator(card)).toHaveScreenshot(`receipts-${name}-open-${size}-${theme}.png`)
      })
    }

    test(`S4.4 the gallery's receipts section matches its baseline, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme })
      await page.goto('/design-system')
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      await expect(page.locator('#receipts')).toHaveScreenshot(`receipts-gallery-${size}-${theme}.png`)
    })
  }
}
