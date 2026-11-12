import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { steadyHero } from '../../036/helpers/e2e.ts'

// The cards' visual snapshots (S5.4): GitHub on hover (L1) and LinkedIn on
// focus (L2, F1) on a desktop, a sheet on a phone (T1, T2), in light and
// dark, and the gallery's section (L3–L5). Spec 003's settings apply: the
// pinned container, no pixel tolerance. Baselines come from
// pnpm test:visual tests/016 --update.

const elsewhere = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Elsewhere' }).getByRole('link', { name, exact: true })

for (const theme of ['light', 'dark'] as const) {
  test(`S5.4 S1.1 S2.1 L1 GitHub's card on hover matches its baseline, desktop ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: DESKTOP, theme })
    await openHome(page)
    // Spec 036: the hero's years and bars are drawn for the build's month, so the shot holds them to one day.
    await steadyHero(page)
    await elsewhere(page, 'GitHub').hover()
    await expect(page.locator('#preview-header-github')).toBeVisible()
    await expect(page).toHaveScreenshot(`hover-github-desktop-${theme}.png`)
  })

  test(`S5.4 S1.2 S2.4 L2 F1 LinkedIn's card on keyboard focus matches its baseline, desktop ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: DESKTOP, theme })
    await openHome(page)
    await steadyHero(page)
    await elsewhere(page, 'GitHub').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#preview-header-linkedin')).toBeVisible()
    await expect(page).toHaveScreenshot(`focus-linkedin-desktop-${theme}.png`)
  })

  test(`S5.4 S5.5 L3 L4 L5 the gallery's cards match their baseline, desktop ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: DESKTOP, theme })
    await page.goto('/design-system#previews')
    await expect(page.locator('#previews')).toHaveScreenshot(`gallery-previews-desktop-${theme}.png`)
  })
}

test.describe('on a phone', () => {
  test.use({ hasTouch: true, isMobile: true })

  for (const theme of ['light', 'dark'] as const) {
    // Amended by spec 036 (D227): GitHub stays in a phone's header, beside the menu, so the sheet opens from there.
    test(`S5.4 S1.3 T1 T2 a sheet from the header's GitHub matches its baseline, phone ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport: PHONE, theme })
      await openHome(page)
      await steadyHero(page)
      await page.locator('header.ds-header').getByRole('link', { name: 'GitHub', exact: true }).tap()
      await expect(page.locator('#preview-header-github')).toBeVisible()
      await expect(page).toHaveScreenshot(`sheet-github-phone-${theme}.png`)
    })
  }
})
