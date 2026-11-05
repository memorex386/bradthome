import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'

// Accessibility (S5.1, SC-003, FR-012): axe at WCAG 2.2 AA, with the
// target-size rule on, for each card state in light and dark: a focus card
// on a desktop, a sheet on a phone, and the gallery's held-open cards.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function violations(page: Page, include: string): Promise<string[]> {
  const results = await new AxeBuilder({ page }).include(include).withTags(TAGS).analyze()
  return results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}`))
}

for (const theme of ['light', 'dark'] as const) {
  test(`S5.1 SC-003 FR-012 an open focus card, a sheet and the gallery's cards have no violation at WCAG 2.2 AA, ${theme}`, async ({ browser }) => {
    const desktopContext = await browser.newContext()
    const desktop = await desktopContext.newPage()
    await enter(desktop, { viewport: DESKTOP, theme })
    await openHome(desktop)
    const link = desktop.getByRole('navigation', { name: 'Elsewhere' }).getByRole('link', { name: 'GitHub', exact: true })
    await link.focus()
    await desktop.keyboard.press('Shift+Tab')
    await desktop.keyboard.press('Tab')
    await expect(desktop.locator('#preview-header-github')).toBeVisible()
    expect(await violations(desktop, '#preview-header-github')).toEqual([])
    await desktop.goto('/design-system#previews')
    expect(await violations(desktop, '#previews')).toEqual([])
    await desktopContext.close()

    const context = await browser.newContext({ hasTouch: true, isMobile: true })
    const phone = await context.newPage()
    await enter(phone, { viewport: PHONE, theme })
    await openHome(phone)
    await phone.locator('.ds-header__menu > summary').tap()
    await phone.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'LinkedIn', exact: true }).tap()
    await expect(phone.locator('#preview-menu-linkedin')).toBeVisible()
    expect(await violations(phone, '#preview-menu-linkedin')).toEqual([])
    await context.close()
  })
}
