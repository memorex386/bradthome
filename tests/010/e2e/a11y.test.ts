import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { enter, freezeAt, HOME, HOME_STATES, openHome } from '../helpers/e2e.ts'

// Accessibility (S4.3, SC-002, FR-011): axe at WCAG 2.2 AA, with the
// target-size rule on, on /v2 in each of its four states, at rest with reduced
// motion and again in the first frame of the sequence, when the words are gray.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const state of HOME_STATES) {
  test(`S4.3 SC-002 FR-011 ${state.id} /v2 has no violation at WCAG 2.2 AA, ${state.size} ${state.theme}, at rest and in the first frame`, async ({
    page,
  }) => {
    const found: string[] = []
    const run = async (label: string): Promise<void> => {
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
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
    await run('at rest')
    await enter(page, state, 'no-preference')
    await page.goto(HOME)
    await page.evaluate('document.fonts.ready.then(() => undefined)')
    await freezeAt(page, 0)
    await run('first frame')
    expect(found).toEqual([])
  })
}
