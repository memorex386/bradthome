import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { enter, fontsSettled, MISSING, STATES } from '../helpers/e2e.ts'
import { type A11yViolation, loadSiteReport } from '../helpers/modules.ts'
import { COLORS, rgb } from '../helpers/site.ts'

// Accessibility (FR-010, S2.3, S4.2, SC-002, C1): axe at WCAG 2.2 AA, with
// the target-size rule on, on every page, in both themes, at both sizes. A
// failure prints C1's message.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGES = [
  { path: '/', name: 'home' },
  { path: MISSING, name: '404' },
]

/** A WCAG criterion from axe's tags, such as wcag143 for 1.4.3. */
function criterion(tags: readonly string[]): string {
  const tag = tags.find((value) => /^wcag\d{3,4}$/.test(value)) ?? ''
  const digits = tag.slice(4)
  return digits.length === 3 ? digits.split('').join('.') : `${digits[0]}.${digits[1]}.${digits.slice(2)}`
}

test('S2.3 FR-010 SC-002 C1 no page has an automated violation at WCAG 2.2 AA, in either theme at either size', async ({ page }) => {
  const { a11yMessage } = await loadSiteReport()
  const found: A11yViolation[] = []
  for (const { path, name } of PAGES) {
    for (const state of STATES) {
      await enter(page, state)
      await page.goto(path)
      await fontsSettled(page)
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
      for (const violation of results.violations) {
        for (const node of violation.nodes) {
          found.push({
            state: state.label.replace('home', name),
            rule: violation.id,
            wcag: criterion(violation.tags),
            target: node.target.join(' '),
            detail: node.failureSummary?.split('\n').slice(1).join(' ').trim() ?? violation.help,
          })
        }
      }
    }
  }
  expect(found, a11yMessage(found).join('\n')).toEqual([])
})

test('S2.3 FR-010 the target-size rule runs, with the WCAG 2.2 AA tags', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const ran = [...results.passes, ...results.violations, ...results.incomplete, ...results.inapplicable].map((rule) => rule.id)
  expect(ran).toContain('target-size')
  expect(ran).toContain('color-contrast')
})

const BODY_FONT = 'getComputedStyle(document.body).getPropertyValue("font-family")'

test('S4.2 SC-002 a missing path answers 404 with a page in the same layout and theme', async ({ page }) => {
  await page.goto('/')
  const homeFont = await page.evaluate(BODY_FONT)
  for (const state of STATES) {
    await enter(page, state)
    const response = await page.goto(MISSING)
    expect(response?.status(), state.label).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect(await page.evaluate(BODY_FONT), state.label).toBe(homeFont)
    expect(await page.evaluate('getComputedStyle(document.body).getPropertyValue("background-color")'), state.label).toBe(
      rgb(COLORS[state.theme].background),
    )
  }
})
