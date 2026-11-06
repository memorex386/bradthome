import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'

// Accessibility (S5.1, SC-005, FR-008): axe at WCAG 2.2 AA, with the
// target-size rule on, on the hero and the section at rest and copied, on a
// phone and a desktop, and the gallery's held states, in light and dark.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function violations(page: Page, include: string): Promise<string[]> {
  const results = await new AxeBuilder({ page }).include(include).withTags(TAGS).analyze()
  return results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}`))
}

for (const theme of ['light', 'dark'] as const) {
  test(`S5.1 SC-005 FR-008 the hero's address, the section at rest and copied, and the gallery's states have no violation at WCAG 2.2 AA, ${theme}`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    for (const viewport of [PHONE, DESKTOP]) {
      await enter(page, { viewport, theme })
      await openHome(page)
      expect(await violations(page, '.hero__actions')).toEqual([])
      expect(await violations(page, '#contact')).toEqual([])
      await page.locator('#contact [data-email-copy]').click()
      await expect(page.locator('#contact [data-email-copy]')).toHaveAccessibleName('Copied')
      expect(await violations(page, '#contact')).toEqual([])
    }
    await enter(page, { viewport: DESKTOP, theme })
    await page.goto('/design-system#contact')
    expect(await violations(page, '#contact')).toEqual([])
  })
}
