import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { enter, HOME_STATES } from '../../010/helpers/e2e.ts'

// Accessibility (S5.1, SC-003, FR-008): axe at WCAG 2.2 AA, with the
// target-size rule on, over each whole role page in each of its four states.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const path of ['/mobile', '/fullstack', '/ai']) {
  for (const state of HOME_STATES) {
    test(`S5.1 SC-003 FR-008 ${path} has no violation at WCAG 2.2 AA, ${state.size} ${state.theme}`, async ({ page }) => {
      await enter(page, state)
      await page.goto(path)
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
      const found = results.violations.flatMap((violation) =>
        violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}: ${node.failureSummary ?? violation.help}`),
      )
      expect(
        results.passes.map((rule) => rule.id).concat(
          results.inapplicable.map((rule) => rule.id),
          results.incomplete.map((rule) => rule.id),
        ),
      ).toContain('target-size')
      expect(found).toEqual([])
    })
  }
}
