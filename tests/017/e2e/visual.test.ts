import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'

// The contact's visual snapshots (S5.4): the hero's first screen on a phone
// (H1), the closing section at rest on a phone and a desktop (C1), Copy
// focused (C2) and copied (C3), in light and dark, and the gallery's section
// (C2–C4). Spec 003's settings apply: the pinned container, no pixel
// tolerance. Baselines come from pnpm test:visual tests/017 --update.

const section = (page: Page) => page.locator('#contact')

/** Tabs until Copy has focus, never a fixed count (spec 010's lesson). */
async function tabToCopy(page: Page): Promise<void> {
  const button = page.locator('#contact [data-email-copy]')
  await page.locator('#contact a').first().focus()
  for (let i = 0; i < 10 && !(await page.evaluate(`document.activeElement?.matches('#contact [data-email-copy]') === true`)); i += 1)
    await page.keyboard.press('Tab')
  await expect(button).toBeFocused()
}

for (const theme of ['light', 'dark'] as const) {
  test(`S5.4 S1.1 H1 the hero's first screen with the address matches its baseline, phone ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: PHONE, theme })
    await openHome(page)
    await expect(page).toHaveScreenshot(`hero-first-screen-phone-${theme}.png`)
  })

  for (const [size, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    test(`S5.4 S2.1 C1 the closing section at rest matches its baseline, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await openHome(page)
      await expect(section(page)).toHaveScreenshot(`contact-rest-${size}-${theme}.png`)
    })
  }

  test(`S5.4 S5.2 S2.2 C2 C3 Copy focused, then copied, matches its baselines, desktop ${theme}`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await enter(page, { viewport: DESKTOP, theme })
    await openHome(page)
    await tabToCopy(page)
    await expect(section(page)).toHaveScreenshot(`contact-focus-desktop-${theme}.png`)
    await page.clock.install()
    await page.keyboard.press('Enter')
    await expect(page.locator('#contact [data-email-copy]')).toHaveAccessibleName('Copied')
    await expect(section(page)).toHaveScreenshot(`contact-copied-desktop-${theme}.png`)
  })

  test(`S5.4 S3.3 C2 C3 C4 the gallery's Contact section matches its baseline, desktop ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: DESKTOP, theme })
    await page.goto('/design-system#contact')
    await page.evaluate('document.fonts.ready.then(() => undefined)')
    await expect(page.locator('#contact')).toHaveScreenshot(`gallery-contact-desktop-${theme}.png`)
  })
}
