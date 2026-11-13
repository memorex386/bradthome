import { expect, test } from '@playwright/test'
import { MISSING } from '../../003/helpers/e2e.ts'
import { DESKTOP, GALLERY } from '../helpers/e2e.ts'

// v1's pages stay as released (S5.1, S5.2, S5.3, SC-003, FR-008, D120, D121):
// the essay and 404 pages load none of the design system, keep v0's look,
// and nothing links the gallery but bradthome.com's one source (D218, D229). v1's home retired with v2.0 (D162). Specs 003, 006 and 007's own tests and
// snapshots, unchanged, check the rest of v1.

const V1 = [
  { path: '/vindecoded-agents', name: 'essay' },
  { path: MISSING, name: '404' },
] as const

test('S5.1 FR-008 SC-003 the v1 pages load one stylesheet with nothing from the design system, and none of its fonts', async ({ page }) => {
  const sheets = new Set<string>()
  for (const { path, name } of V1) {
    const fonts: string[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fonts.push(request.url())
    })
    await page.setViewportSize(DESKTOP)
    await page.goto(path)
    await page.evaluate('document.fonts.ready.then(() => undefined)')
    const links = await page.locator('link[rel="stylesheet"]').evaluateAll((elements) => elements.map((element) => element.getAttribute('href') ?? ''))
    expect(links, name).toHaveLength(1)
    for (const link of links) sheets.add(link)
    const families = (await page.evaluate('[...document.fonts].map((face) => face.family)')) as string[]
    expect(families.join(','), name).not.toMatch(/Inter Tight|JetBrains Mono/)
    expect(await page.locator('[class*="ds-"]').count(), name).toBe(0)
    expect(fonts.filter((url) => /inter-tight|jetbrains-mono/i.test(url)), name).toEqual([])
    expect(fonts.length, `${name} loads v1's fonts`).toBeGreaterThan(0)
    page.removeAllListeners('request')
  }
  expect(sheets.size).toBe(1)
  const css = await (await page.request.get([...sheets][0] ?? '')).text()
  expect(css).not.toMatch(/\.ds-|light-dark\(|Inter Tight|JetBrains Mono|--color-band/)
})

test("S5.3 the v1 pages keep v0's colors and fonts in both themes", async ({ page }) => {
  const v0 = { light: 'rgb(251, 250, 247)', dark: 'rgb(19, 20, 22)' } as const
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    for (const { path, name } of V1) {
      await page.goto(path)
      expect(await page.evaluate('getComputedStyle(document.body).backgroundColor'), `${name} ${theme}`).toBe(v0[theme])
      expect(await page.evaluate('getComputedStyle(document.body).fontFamily'), `${name} ${theme}`).toMatch(/^"?Charis SIL/)
    }
  }
})

test('S5.2 FR-009 no v1 page links the gallery', async ({ page }) => {
  for (const { path, name } of V1) {
    await page.goto(path)
    expect(await page.locator(`a[href*="${GALLERY}"]`).count(), name).toBe(0)
  }
})

// Amended by spec 033 (D218): bradthome.com's lead claim's receipt links the gallery, beside the repo. Nothing else does.
// Amended by spec 038 (D229): the receipts are gone, so the link is the first of bradthome.com's card's sources, its lead
// claim's evidence, by its path, as a source on this site goes. Nothing else links it.
test("S5.2 FR-009 the home and role pages link the gallery once, first in bradthome.com's sources, and the other pages don't link it", async ({
  page,
}) => {
  for (const path of ['/', '/mobile', '/fullstack', '/ai']) {
    await page.goto(path)
    await expect(page.locator(`a[href*="${GALLERY}"]`), path).toHaveCount(1)
    const link = page.locator(`#side-bradthome-com .ds-sources__list > li:first-child > a.ds-source[href="${GALLERY}"]`)
    await expect(link, path).toHaveCount(1)
    await expect(link.locator('.ds-source__label'), path).toHaveText('The design system')
    await expect(link.locator('.ds-source__host'), path).toHaveText('bradthome.com')
  }
  for (const path of ['/evals', '/privacy']) {
    await page.goto(path)
    expect(await page.locator(`a[href*="${GALLERY}"]`).count(), path).toBe(0)
  }
})
