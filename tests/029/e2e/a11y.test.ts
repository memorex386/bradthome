import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'

// Spec 029's accessibility: axe at WCAG 2.2 AA on the home and each role
// page, in both themes at desktop and phone sizes, after a role switch has
// morphed into it (S4.1). The switch looks the same at rest, so the existing
// baselines stand for its look.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const

const violations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))
}

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of SIZES) {
    test(`S4.1 SC-004 the home and each role page have no violation after a switch, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme }, 'no-preference')
      await page.goto('/')
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      expect(await violations(page), '/').toEqual([])
      for (const href of ['/mobile', '/fullstack', '/ai']) {
        await page.locator(`.hero__roles a[href="${href}"]`).click()
        await page.waitForURL(`**${href}`)
        await page.evaluate('new Promise((done) => setTimeout(done, 600))')
        expect(await violations(page), href).toEqual([])
      }
    })
  }
}
