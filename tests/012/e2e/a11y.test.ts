import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { enter, HOME_STATES, openHome } from '../../010/helpers/e2e.ts'
import { openOnClaim } from '../../011/helpers/e2e.ts'

// Accessibility (S5.3, SC-005, FR-009): axe at WCAG 2.2 AA, with the
// target-size rule on, on the home with the Experience section, in each of its
// four states, at rest and again landed on a claim, which tints. Amended by
// spec 038 (D229): the receipts' drawers are gone, so there are none to open.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const state of HOME_STATES) {
  test(`S5.3 SC-005 FR-009 FR-010 the home with the Experience section has no violation at WCAG 2.2 AA, ${state.size} ${state.theme}, at rest and landed on a claim`, async ({
    page,
  }) => {
    const found: string[] = []
    const run = async (label: string): Promise<void> => {
      const results = await new AxeBuilder({ page }).include('#experience').withTags(TAGS).analyze()
      for (const violation of results.violations) {
        for (const node of violation.nodes)
          found.push(`${label}: ${violation.id} at ${node.target.join(' ')}: ${node.failureSummary ?? violation.help}`)
      }
      expect(
        results.passes
          .map((rule) => rule.id)
          .concat(
            results.inapplicable.map((rule) => rule.id),
            results.incomplete.map((rule) => rule.id),
          ),
      ).toContain('target-size')
    }
    await enter(page, state)
    await openHome(page)
    await expect(page.locator('#experience details, #experience .ds-marker')).toHaveCount(0)
    await run('at rest')
    await openOnClaim(page, 'bleacher-report-3')
    await expect(page.locator('#receipt-bleacher-report-3:target')).toHaveCount(1)
    await run('landed')
    expect(found).toEqual([])
  })
}
