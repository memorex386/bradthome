import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { enterGallery, openGallery } from '../../009/helpers/e2e.ts'
import { DESKTOP, enter, hideFrame, PHONE } from '../../010/helpers/e2e.ts'
import { fakeApi } from '../../022/helpers/fake-api.ts'
import { steadyRecords } from '../../033/helpers/e2e.ts'

// Spec 038 for everyone: axe at WCAG 2.2 AA, with the target-size rule on,
// on the home, each role page and the gallery, in both themes at both sizes
// (SC-006), and each state in mocks/README.md as a snapshot in the pinned
// container with no pixel tolerance (M1–M10). The build-dated counts on
// bradthome.com's card are held steady (spec 033). Baselines come from
// pnpm test:visual tests/038 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const
const THEMES = ['light', 'dark'] as const

const violations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  expect(
    results.passes
      .map((rule) => rule.id)
      .concat(
        results.inapplicable.map((rule) => rule.id),
        results.incomplete.map((rule) => rule.id),
      ),
  ).toContain('target-size')
  return results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`))
}

async function open(page: Page, address: string): Promise<void> {
  await page.clock.setFixedTime(FIXED_TIME)
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** The cards each state shows, as mocks/README.md names them. */
const CARDS = [
  ['M1', '/', '.hopper__topic:has(#hopper-disruption-assistance)', 'capital-one'],
  ['M2', '/', '#experience-bleacher-report', 'bleacher-report'],
  ['M3', '/', '#side-vindecoded', 'vindecoded'],
  ['M4', '/', '#side-bradthome-com', 'bradthome-com'],
  ['M8', '/fullstack', '.hopper__topic:has(#hopper-disruption-assistance)', 'fullstack-capital-one'],
] as const

for (const theme of THEMES) {
  for (const [size, viewport] of SIZES) {
    test(`SC-006 S2.9 the home, each role page and the gallery have no violation at WCAG 2.2 AA, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme })
      for (const address of ['/', '/mobile', '/fullstack', '/ai', '/design-system']) {
        await open(page, address)
        expect(await violations(page), address).toEqual([])
      }
    })

    test(`SC-006 S2.2 the home has no violation with the chat opened from a sparkle, ${size} ${theme}`, async ({ page }) => {
      await fakeApi(page)
      await enter(page, { viewport, theme })
      await open(page, '/')
      await page.locator('#receipt-vindecoded-3 .ds-claim-ask').click()
      await page.locator('dialog[data-chat-dialog] textarea').waitFor()
      expect(await violations(page)).toEqual([])
    })

    for (const [id, address, selector, name] of CARDS) {
      test(`S1.1 ${id} the ${name} card at rest matches its baseline, ${size} ${theme}`, async ({ page }) => {
        await enter(page, { viewport, theme })
        await open(page, address)
        await hideFrame(page)
        await steadyRecords(page)
        // Amended by spec 040 (D238): VINDecoded's App Store icon is masked here. RealPage's card moved the card a fraction
        // of a pixel, and there the icon's rounded corners drew one level apart on CI's runners and on Brad's PC (54
        // pixels, by 1). This shot is about the card's proof; spec 039's M4 shots check the icon itself.
        const mask = id === 'M3' ? [page.locator(`${selector} .side__badge--icon`)] : []
        await expect(page.locator(selector)).toHaveScreenshot(`${id}-${name}-${size}-${theme}.png`, { mask })
      })
    }

    // M7: a chat source link lands on its claim, tinted, at reduced motion.
    test(`S3.2 M7 a landed claim, tinted, matches its baseline, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme })
      await open(page, '/#receipt-hopper-fintech-ai-1')
      await hideFrame(page)
      await expect(page.locator('.hopper__topic:has(#hopper-fintech-ai)')).toHaveScreenshot(`M7-landed-${size}-${theme}.png`)
    })
  }

  // M5: a sparkle's hover and keyboard focus, with its tooltip, on a card and in the band.
  // Amended by spec 040 (D238): the card's sparkle is Bleacher Report's first claim's. RealPage's card and the longer
  // heading moved the card a fraction of a pixel, and there the second claim's focused sparkle, on its second line under
  // its own first, drew one pixel of its ring two ways from run to run in the pinned container; the first claim, one
  // line, drew the same bytes in every run.
  for (const [where, id] of [
    ['card', 'receipt-bleacher-report-1'],
    ['band', 'receipt-hopper-disruption-assistance-3'],
  ] as const) {
    for (const state of ['hover', 'focus'] as const) {
      test(`S2.5 M5 a sparkle’s ${state} on the ${where}, with its tooltip, matches its baseline, desktop ${theme}`, async ({ page }) => {
        await enter(page, { viewport: DESKTOP, theme })
        await open(page, '/')
        await hideFrame(page)
        const sparkle = page.locator(`#${id} .ds-claim-ask`)
        // Amended by spec 042: the scroll and the clip land on whole pixels, since the tooltip's corners drew two ways
        // from run to run, and machine to machine, when the clip started part way into one.
        await sparkle.evaluate((element) => {
          element.scrollIntoView({ block: 'center' })
          element.ownerDocument.defaultView?.scrollTo(0, Math.round(element.ownerDocument.defaultView.scrollY))
        })
        if (state === 'hover') await sparkle.hover()
        else {
          // Amended by spec 042: focused directly, with no keys, so no link before it opens its preview on the way
          // (spec 016); with no pointer input yet, Chromium draws the keyboard's ring for it, which the poll checks.
          await sparkle.focus()
          await expect.poll(() => sparkle.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
          await page.evaluate('new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))')
        }
        const box = await page.locator(`#${id}`).boundingBox()
        if (box === null) throw new Error(`No box for ${id}`)
        await expect(page).toHaveScreenshot(`M5-${state}-${where}-desktop-${theme}.png`, {
          clip: {
            x: Math.floor(box.x - 24),
            y: Math.floor(box.y - 56),
            width: Math.ceil(box.width + 48),
            height: Math.ceil(box.height + 80),
          },
        })
      })
    }
  }

  // M10: the gallery's parts, and the same in the band.
  for (const section of ['proof', 'proof-band'] as const) {
    test(`S5.2 M10 the gallery’s #${section} matches its baseline, desktop ${theme}`, async ({ page }) => {
      await enterGallery(page, { viewport: DESKTOP, theme })
      await page.clock.setFixedTime(FIXED_TIME)
      await openGallery(page)
      await expect(page.locator(`#${section}`)).toHaveScreenshot(`M10-gallery-${section}-desktop-${theme}.png`)
    })
  }
}

// M6: the chat opened from a sparkle, its question in the box, unsent.
for (const [size, viewport] of SIZES) {
  test(`S2.2 M6 the chat opened from a sparkle matches its baseline, ${size} light`, async ({ page }) => {
    await fakeApi(page)
    await enter(page, { viewport, theme: 'light' })
    await open(page, '/')
    await page.locator('#receipt-hopper-partner-platform-1 .ds-claim-ask').click()
    await page.locator('dialog[data-chat-dialog] textarea').waitFor()
    await expect(page.locator('dialog[data-chat-dialog]')).toHaveScreenshot(`M6-chat-${size}-light.png`)
  })
}

// M9: no script. The page's own script is off; the test's evaluations still run, as spec 036's M6 does.
test.describe('with no script', () => {
  test.use({ javaScriptEnabled: false })

  for (const [size, viewport] of SIZES) {
    test(`S2.6 M9 the partner platform's card with no script matches its baseline, ${size} light`, async ({ page }) => {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      await hideFrame(page)
      await expect(page.locator('.hopper__topic:has(#hopper-partner-platform)')).toHaveScreenshot(`M9-noscript-${size}-light.png`)
    })
  }
})
