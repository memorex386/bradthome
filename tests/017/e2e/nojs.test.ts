import { expect, test } from '@playwright/test'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'

// With JavaScript off (S2.4, C5), the Copy button is hidden, and the address
// is selectable text inside a working mail link, in the hero and the section.

test.use({ javaScriptEnabled: false })

test('S2.4 FR-004 C5 with no script, no Copy button shows, the address is selectable inside a working mail link, and the section keeps its links', async ({ page }) => {
  for (const viewport of [PHONE, DESKTOP]) {
    await enter(page, { viewport, theme: 'light' })
    await openHome(page)
    await expect(page.locator('[data-email-copy]').first()).toBeHidden()
    expect(await page.locator('[data-email-copy]:visible').count()).toBe(0)
    // Amended by spec 036 (D225): the hero's address is a button whose name is "Email" and the address.
    const links = page.getByRole('link', { name: /^(Email )?brad@bradthome\.com$/ })
    await expect(links).toHaveCount(2)
    for (const link of await links.all()) await expect(link).toHaveAttribute('href', 'mailto:brad@bradthome.com')
    const selects = (await page.evaluate(
      `[...document.querySelectorAll('a[href^="mailto:"]')].map((a) => getComputedStyle(a).userSelect)`,
    )) as string[]
    for (const value of selects) expect(['auto', 'text']).toContain(value)
    await expect(page.locator('#contact .contact__links > li > a:first-child')).toHaveText(['LinkedIn', 'GitHub', 'Résumé PDF'])
  }
})
