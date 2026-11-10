import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'

// Spec 027's accessibility and snapshots: axe at WCAG 2.2 AA with the
// target-size rule on, at the top, mid-page, over the band and with the phone
// menu open (S8.1), and the frame in the pinned container with no pixel
// tolerance, at reduced motion (S8.2). Baselines come from
// pnpm test:visual tests/027 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

async function at(page: Page, y: number): Promise<void> {
  await page.evaluate(`scrollTo({ top: ${y}, behavior: 'instant' })`)
  await page.evaluate('new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 350))))')
}

const topOf = (page: Page, id: string, share: number): Promise<number> =>
  page.evaluate(
    `Math.max(0, Math.round(document.getElementById('${id}').getBoundingClientRect().top + scrollY - innerHeight * ${share}))`,
  ) as Promise<number>

const violations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))
}

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of SIZES) {
    for (const path of ['/', '/ai']) {
      test(`S8.1 SC-004 ${path} has no violation at the top, mid-page, over the band and with the menu open, ${size} ${theme}`, async ({
        page,
      }) => {
        await enter(page, { viewport, theme })
        await open(page, path)
        expect(await violations(page), 'top').toEqual([])
        await at(page, await topOf(page, 'hopper', -0.5))
        expect(await violations(page), 'band').toEqual([])
        await at(page, await topOf(page, 'experience', 0.3))
        expect(await violations(page), 'mid-page').toEqual([])
        if (size === 'phone') {
          await page.locator('.ds-header__menu > summary').click()
          expect(await violations(page), 'menu').toEqual([])
        }
      })
    }

    test(`S8.1 the gallery keeps its header and has no violation, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme })
      await open(page, '/design-system')
      await expect(page.locator('header.ds-header--sticky')).toHaveCount(0)
      expect(await violations(page)).toEqual([])
    })

    test(`S8.2 the frame at rest, condensed, over the band, the switch and the footer match their baselines, ${size} ${theme}`, async ({
      page,
    }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await open(page, '/')
      const bar = { x: 0, y: 0, width: viewport.width, height: 72 }
      await at(page, 0)
      await expect(page).toHaveScreenshot(`frame-top-${size}-${theme}.png`, { clip: bar })
      await at(page, await topOf(page, 'experience', 0.3))
      await expect(page).toHaveScreenshot(`frame-reading-${size}-${theme}.png`, { clip: bar })
      await at(page, await topOf(page, 'hopper', -0.5))
      await expect(page).toHaveScreenshot(`frame-band-${size}-${theme}.png`, { clip: bar })
      await at(page, 0)
      await expect(page.locator('.ds-roles--quiet')).toHaveScreenshot(`frame-switch-${size}-${theme}.png`)
      await expect(page.locator('footer.ds-footer')).toHaveScreenshot(`frame-footer-${size}-${theme}.png`)
      if (size === 'phone') {
        await at(page, await topOf(page, 'experience', 0.3))
        await page.locator('.ds-header__menu > summary').click()
        await expect(page.locator('.ds-header__menu-panel')).toHaveScreenshot(`frame-menu-${size}-${theme}.png`)
      }
    })
  }
}
