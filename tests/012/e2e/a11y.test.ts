import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { enter, HOME_STATES, openHome } from '../../010/helpers/e2e.ts'

// Accessibility (S5.3, SC-005, FR-009): axe at WCAG 2.2 AA, with the
// target-size rule on, on /v2 with the Experience section, in each of its four
// states, with every receipt closed and again with every receipt open.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const state of HOME_STATES) {
  test(`S5.3 SC-005 FR-009 FR-010 /v2 with the Experience section has no violation at WCAG 2.2 AA, ${state.size} ${state.theme}, notes closed and open`, async ({
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
    await run('closed')
    await page.evaluate(`document.querySelectorAll('#experience details').forEach((d) => { d.open = true })`)
    await expect(page.locator('#experience details[open]')).toHaveCount(6)
    await run('open')
    expect(found).toEqual([])
  })
}
