import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'

// Accessibility (S6.1, SC-006, FR-008): axe at WCAG 2.2 AA, with the
// target-size rule on, on /privacy whole and on the footer of /v2, on a phone
// and a desktop, in light and dark.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function violations(page: Page, include?: string): Promise<string[]> {
  const builder = new AxeBuilder({ page }).withTags(TAGS)
  const results = await (include === undefined ? builder : builder.include(include)).analyze()
  return results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}`))
}

for (const theme of ['light', 'dark'] as const) {
  test(`S6.1 SC-006 FR-008 /privacy and the footer have no violation at WCAG 2.2 AA, ${theme}`, async ({ page }) => {
    for (const viewport of [PHONE, DESKTOP]) {
      await enter(page, { viewport, theme })
      await page.goto('/privacy')
      expect(await violations(page)).toEqual([])
      await page.goto('/v2')
      expect(await violations(page, 'footer.ds-footer')).toEqual([])
    }
  })
}
