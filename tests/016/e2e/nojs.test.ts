import { expect, test } from '@playwright/test'
import { DESKTOP, enter, HOME, openHome } from '../../010/helpers/e2e.ts'

// With JavaScript off (S1.5, FR-002), every previewed link is a plain link
// that goes where it says, and no card shows.

test.use({ javaScriptEnabled: false })

test('S1.5 FR-002 with no script, no card shows on hover or focus, and a previewed link keeps its address', async ({ page }) => {
  await enter(page, { viewport: DESKTOP, theme: 'light' })
  await openHome(page)
  await expect(page).toHaveURL(new RegExp(`${HOME}$`))
  const link = page.getByRole('navigation', { name: 'Elsewhere' }).getByRole('link', { name: 'GitHub', exact: true })
  await link.hover()
  await link.focus()
  await page.waitForTimeout(500)
  await expect(page.locator('[data-preview-card]:not(.lp-card--still)').first()).toBeHidden()
  expect(await page.locator('[data-preview-card]:visible').count()).toBe(0)
  await expect(link).toHaveAttribute('href', 'https://github.com/memorex386')
})
