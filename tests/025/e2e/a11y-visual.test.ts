import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'

// Spec 025's accessibility and snapshots: axe at WCAG 2.2 AA with the
// target-size rule on (S7.1), and the first screen at rest in the pinned
// container with no pixel tolerance (S7.2). Baselines come from
// pnpm test:visual tests/025 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const WIDE = { width: 1440, height: 900 } as const
const SIZES = [
  ['desktop', DESKTOP],
  ['wide', WIDE],
  ['phone', PHONE],
] as const

for (const path of ['/', '/mobile', '/fullstack', '/ai']) {
  for (const theme of ['light', 'dark'] as const) {
    for (const [size, viewport] of SIZES) {
      test(`S7.1 SC-005 FR-009 ${path} has no violation at WCAG 2.2 AA, ${size} ${theme}`, async ({ page }) => {
        await enter(page, { viewport, theme })
        await page.goto(path)
        await page.evaluate('document.fonts.ready.then(() => undefined)')
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
        const found = results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))
        expect(found).toEqual([])
      })

      test(`S7.2 ${path} first screen at rest matches its baseline, ${size} ${theme}`, async ({ page }) => {
        await page.clock.setFixedTime(FIXED_TIME)
        await enter(page, { viewport, theme })
        await page.goto(path)
        await page.evaluate('document.fonts.ready.then(() => undefined)')
        const name = path === '/' ? 'home' : path.slice(1)
        await expect(page).toHaveScreenshot(`first-screen-${name}-${size}-${theme}.png`)
      })
    }
  }
}
