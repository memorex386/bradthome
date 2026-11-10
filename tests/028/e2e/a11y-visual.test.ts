import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, hideFrame, PHONE } from '../../010/helpers/e2e.ts'

// Spec 028's accessibility and snapshots: axe at WCAG 2.2 AA with the
// target-size rule on, at rest and with the sections mid-reveal (S6.1), and
// the figures' rules, the address's rule and the copied check in the pinned
// container with no pixel tolerance, at reduced motion (S6.2). Baselines come
// from pnpm test:visual tests/028 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

async function bring(page: Page, id: string, share: number): Promise<void> {
  await page.evaluate(
    `scrollTo({ top: Math.max(0, document.getElementById('${id}').getBoundingClientRect().top + scrollY - innerHeight * ${share}), behavior: 'instant' })`,
  )
  await page.evaluate('new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 200))))')
}

const violations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))
}

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of SIZES) {
    for (const path of ['/', '/ai']) {
      test(`S6.1 SC-004 ${path} has no violation at rest and as its sections reveal, ${size} ${theme}`, async ({ page }) => {
        await enter(page, { viewport, theme }, 'no-preference')
        await open(page, path)
        for (const id of ['hopper', 'experience', 'side', 'contact']) {
          await bring(page, id, 0.4)
          expect(await violations(page), id).toEqual([])
        }
      })
    }

    test(`S6.1 the gallery's figures and copied state have no violation, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme })
      await open(page, '/design-system')
      expect(await violations(page)).toEqual([])
    })

    test(`S6.2 the figures' rules, the address's rule and the copied check match their baselines, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await open(page, '/')
      await hideFrame(page)
      await expect(page.locator('#experience-bleacher-report .ds-stats')).toHaveScreenshot(`reveal-figures-br-${size}-${theme}.png`)
      await expect(page.locator('#side-vindecoded .ds-stats')).toHaveScreenshot(`reveal-figures-side-${size}-${theme}.png`)
      await expect(page.locator('#contact [data-email]')).toHaveScreenshot(`reveal-address-${size}-${theme}.png`)
      await open(page, '/design-system')
      await expect(page.locator('[data-email][data-demo="copied"]')).toHaveScreenshot(`reveal-copied-${size}-${theme}.png`)
    })
  }
}
