import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { fontsSettled, STATES } from '../../003/helpers/e2e.ts'
import { type A11yViolation, loadSiteReport } from '../../003/helpers/modules.ts'
import { PATH } from '../helpers/essay.ts'

// The essay's accessibility (FR-008, S4.1, SC-003): axe at WCAG 2.2 AA, with
// the target-size rule on, in both themes at both sizes, plus the narrowest
// phone, where some tables scroll. A failure prints spec 003's C1 message.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const LOOKS = [
  ...STATES.map((state) => ({ label: state.label.replace(/^P(\d) home/, 'E$1 essay'), viewport: state.viewport, theme: state.theme })),
  { label: 'E5 essay, phone 320, light', viewport: { width: 320, height: 700 }, theme: 'light' as const },
]

/** A WCAG criterion from axe's tags, such as 1.4.3 from wcag143. */
function criterion(tags: readonly string[]): string {
  const digits = (tags.find((value) => /^wcag\d{3,4}$/.test(value)) ?? '').slice(4)
  return digits.length === 3 ? digits.split('').join('.') : `${digits[0]}.${digits[1]}.${digits.slice(2)}`
}

test('S4.1 FR-008 SC-003 the essay has no automated violation at WCAG 2.2 AA, in either theme at either size, or at 320 pixels', async ({ page }) => {
  const { a11yMessage } = await loadSiteReport()
  const found: A11yViolation[] = []
  for (const look of LOOKS) {
    await page.setViewportSize(look.viewport)
    await page.emulateMedia({ colorScheme: look.theme, reducedMotion: 'reduce' })
    await page.goto(PATH)
    await fontsSettled(page)
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    const ran = [...results.passes, ...results.violations, ...results.incomplete, ...results.inapplicable].map((rule) => rule.id)
    expect(ran, look.label).toContain('scrollable-region-focusable')
    expect(ran, look.label).toContain('color-contrast')
    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        found.push({
          state: look.label,
          rule: violation.id,
          wcag: criterion(violation.tags),
          target: node.target.join(' '),
          detail: node.failureSummary?.split('\n').slice(1).join(' ').trim() ?? violation.help,
        })
      }
    }
  }
  expect(found, a11yMessage(found).join('\n')).toEqual([])
})
