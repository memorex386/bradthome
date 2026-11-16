import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { enterGallery, openGallery } from '../../009/helpers/e2e.ts'
import { DESKTOP, enter, hideFrame, loadPictures, PHONE } from '../../010/helpers/e2e.ts'
import { steadyRecords } from '../../033/helpers/e2e.ts'

// Spec 039 for everyone: axe at WCAG 2.2 AA on the home, each role page, the
// essay, /evals and the gallery, in both themes at both sizes (SC-004), and
// each state in mocks/README.md as a snapshot in the pinned container with no
// pixel tolerance (M1–M10). Pictures load before each shot, so a lazy one
// never misses it. Baselines come from pnpm test:visual tests/039 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const
const THEMES = ['light', 'dark'] as const

async function open(page: Page, address: string): Promise<void> {
  await page.clock.setFixedTime(FIXED_TIME)
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** The parts each state shows, as mocks/README.md names them. */
const PARTS = [
  ['M1', '/', '#hopper .hopper__head', 'hopper-head'],
  ['M1', '/', '.hopper__topic:has(#hopper-disruption-assistance)', 'capital-one'],
  ['M1', '/', '.hopper__topic:has(#hopper-mobile-remoteui-and-webviews)', 'remoteui'],
  ['M1', '/', '.hopper__topic:has(#hopper-agent-and-experimentation-workflow)', 'loop'],
  ['M2', '/mobile', '#hopper .hopper__topic', 'mobile-remoteui'],
  ['M3', '/', '#experience-bleacher-report .experience__card-head', 'bleacher-report-head'],
  ['M4', '/', '#side-vindecoded .side__card-head', 'vindecoded-head'],
  ['M4', '/', '#side-sudoku-world .side__card-head', 'sudoku-world-head'],
  ['M4', '/', '#side-bradthome-com .side__card-head', 'bradthome-com-head'],
  ['M5', '/', '#contact .contact__head', 'contact-photo'],
  ['M6', '/', '.ds-footer', 'footer'],
] as const

for (const theme of THEMES) {
  for (const [size, viewport] of SIZES) {
    // One test a page, so each page's scan has its own time: the gallery alone is long.
    for (const address of ['/', '/mobile', '/fullstack', '/ai', '/vindecoded-agents', '/evals', '/design-system']) {
      test(`SC-004 S8.4 ${address} has no violation at WCAG 2.2 AA, ${size} ${theme}`, async ({ page }) => {
        await enter(page, { viewport, theme })
        await open(page, address)
        await loadPictures(page)
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
        expect(
          results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}`)),
        ).toEqual([])
      })
    }

    for (const [id, address, selector, name] of PARTS) {
      test(`S2.1 S3.5 S4.1 ${id} the ${name} matches its baseline, ${size} ${theme}`, async ({ page }) => {
        await enter(page, { viewport, theme })
        await open(page, address)
        await hideFrame(page)
        await steadyRecords(page)
        await loadPictures(page)
        await expect(page.locator(selector).first()).toHaveScreenshot(`${id}-${name}-${size}-${theme}.png`)
      })
    }
  }

  // M8: the site icon in a light and a dark tab, larger, and on a home screen, from the gallery.
  test(`S5.1 S5.2 M8 the site icon's row in the gallery matches its baseline, desktop ${theme}`, async ({ page }) => {
    await enterGallery(page, { viewport: DESKTOP, theme })
    await page.clock.setFixedTime(FIXED_TIME)
    await openGallery(page)
    await loadPictures(page)
    await expect(page.locator('#pictures .g-icons')).toHaveScreenshot(`M8-site-icon-desktop-${theme}.png`)
  })

  // M10: the gallery's pictures, and its band.
  for (const section of ['pictures', 'pictures-band'] as const) {
    test(`S7.1 M10 the gallery’s #${section} matches its baseline, desktop ${theme}`, async ({ page }) => {
      await enterGallery(page, { viewport: DESKTOP, theme })
      await page.clock.setFixedTime(FIXED_TIME)
      await openGallery(page)
      await loadPictures(page)
      await expect(page.locator(`#${section}`)).toHaveScreenshot(`M10-gallery-${section}-desktop-${theme}.png`)
    })
  }
}

// M7: each share card as the build drew it, compared pixel for pixel with its baseline.
for (const id of ['home', 'mobile', 'fullstack', 'ai', 'vindecoded-agents', 'evals'] as const) {
  test(`S1.1 S1.2 S1.3 S1.4 M7 the ${id} share card matches its baseline`, async ({ page }) => {
    const body = await (await page.request.get(`/share/${id}.png`)).body()
    expect(body).toMatchSnapshot(`M7-share-${id}.png`, { maxDiffPixels: 0, threshold: 0 })
  })
}

// M9: no script. The page's own script is off; the test's evaluations still run, as spec 036's M6 does.
test.describe('with no script', () => {
  test.use({ javaScriptEnabled: false })

  for (const [size, viewport] of SIZES) {
    for (const [name, selector] of [
      ['capital-one', '.hopper__topic:has(#hopper-disruption-assistance)'],
      ['vindecoded-head', '#side-vindecoded .side__card-head'],
    ] as const) {
      test(`S3.7 M9 the ${name} with no script matches its baseline, ${size} light`, async ({ page }) => {
        await enter(page, { viewport, theme: 'light' })
        await open(page, '/')
        await hideFrame(page)
        await loadPictures(page)
        await expect(page.locator(selector)).toHaveScreenshot(`M9-noscript-${name}-${size}-light.png`)
      })
    }
  }
})
