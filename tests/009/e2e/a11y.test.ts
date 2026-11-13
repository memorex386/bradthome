import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { enterGallery, GALLERY_STATES, openGallery } from '../helpers/e2e.ts'

// Accessibility (S4.3, SC-002, FR-016): axe at WCAG 2.2 AA, with the
// target-size rule on, on the gallery in each of its four states, and again
// with every disclosure open (on a phone, the menu) and with a link landed on
// the band's claim, which tints it. Amended by spec 038 (D229): the receipts'
// drawers are gone, and a claim's tint is the state a link to it opens.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const state of GALLERY_STATES) {
  test(`S4.3 SC-002 FR-016 ${state.id} the gallery has no violation at WCAG 2.2 AA, ${state.size} ${state.theme}, closed, open and with a claim landed on`, async ({
    page,
  }) => {
    await enterGallery(page, state)
    await openGallery(page)
    const found: string[] = []
    const run = async (label: string): Promise<void> => {
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
      for (const violation of results.violations) {
        for (const node of violation.nodes) found.push(`${label}: ${violation.id} at ${node.target.join(' ')}: ${node.failureSummary ?? violation.help}`)
      }
      expect(results.passes.map((rule) => rule.id).concat(results.inapplicable.map((rule) => rule.id), results.incomplete.map((rule) => rule.id))).toContain('target-size')
    }
    await run('closed')
    await page.evaluate('for (const details of document.querySelectorAll("details")) details.open = true')
    await run('open')
    // The gallery holds the page's tint on a claim at rest; the band's shows only when a link lands there.
    await page.evaluate(`location.hash = 'g-claim-band'`)
    await expect(page.locator('#g-claim-band')).toBeInViewport()
    await run('landed')
    expect(found).toEqual([])
  })
}
