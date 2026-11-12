import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, hideFrame, NARROW, PHONE } from '../../010/helpers/e2e.ts'
import { dialogOf, fakeApi } from '../../022/helpers/fake-api.ts'
import { DETAILS } from '../../../apps/site/src/components/home/hero.ts'
import { builtOn, FIXED_DAY, steadyHero } from '../helpers/e2e.ts'

// Spec 036 for everyone: axe at WCAG 2.2 AA with the target-size rule on, on
// the home and each role page in both themes at both sizes (S8.1), and the
// states in mocks/README.md as snapshots in the pinned container with no
// pixel tolerance, the years, bars and timelines held to one day (S8.2).
// Baselines come from pnpm test:visual tests/036 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['desktop', DESKTOP],
  ['phone', PHONE],
] as const
const PAGES = [
  ['M1', '/', 'home'],
  ['M2', '/mobile', 'mobile'],
  ['M3', '/fullstack', 'fullstack'],
  ['M4', '/ai', 'ai'],
] as const

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** The floating "Ask about Brad" covers part of a desktop's hero, so desktop shots hide it. */
const hideAsk = (page: Page): Promise<unknown> =>
  page.evaluate(`document.styleSheets[0]?.insertRule('.chat-ask { visibility: hidden !important }', 0)`)

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of SIZES) {
    test(`S8.1 SC-004 FR-009 the home and each role page have no violation at WCAG 2.2 AA, ${size} ${theme}`, async ({ page }) => {
      await enter(page, { viewport, theme })
      for (const [, address] of PAGES) {
        await open(page, address)
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
        expect(
          results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} at ${n.target.join(' ')}`)),
          address,
        ).toEqual([])
        expect(
          results.passes
            .map((rule) => rule.id)
            .concat(
              results.inapplicable.map((rule) => rule.id),
              results.incomplete.map((rule) => rule.id),
            ),
        ).toContain('target-size')
      }
    })

    for (const [id, address, name] of PAGES) {
      test(`S8.2 ${id} the hero of ${address}, ${size} ${theme}, matches its baseline`, async ({ page }) => {
        await page.clock.setFixedTime(FIXED_TIME)
        await enter(page, { viewport, theme })
        await open(page, address)
        await hideFrame(page)
        if (size === 'desktop') await hideAsk(page)
        await page.mouse.move(0, 0)
        await expect(page.locator('.hero')).toHaveScreenshot(`${id}-${name}-${size}-${theme}.png`)
      })
    }

    test(`S8.2 S6.1 M7 the header, ${size} ${theme}, matches its baseline`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await open(page, '/mobile')
      await expect(page.locator('header.ds-header')).toHaveScreenshot(`M7-header-${size}-${theme}.png`)
    })
  }

  test(`S8.2 S4.1 S4.2 M5 hover on Mobile and focus on Full-stack match their baselines, ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: DESKTOP, theme }, 'no-preference')
    await open(page, '/')
    await page.waitForTimeout(1800)
    await hideFrame(page)
    await hideAsk(page)
    await page.locator('#tile-mobile').hover()
    await page.waitForTimeout(800)
    await expect(page.locator('.hero')).toHaveScreenshot(`M5-hover-desktop-${theme}.png`)
    await page.mouse.move(0, 0)
    await page.locator('#tile-mobile').focus()
    await page.keyboard.press('Tab')
    await page.waitForTimeout(800)
    await expect(page.locator('.hero')).toHaveScreenshot(`M5-focus-desktop-${theme}.png`)
  })

  test(`S8.2 S6.1 SC-005 M7 the narrowest phone's header matches its baseline, ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: NARROW, theme })
    await open(page, '/')
    await expect(page.locator('header.ds-header')).toHaveScreenshot(`M7-header-320-${theme}.png`)
  })
}

test.describe('the header on a phone (M7)', () => {
  test('S8.2 S6.4 M7 the header over the Hopper band matches its baseline, phone light', async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    // Half a screen into the band, as spec 027's shot of the bar there, then the frames for the band's colors to settle.
    const y = await page.evaluate(`Math.round(document.getElementById('hopper').getBoundingClientRect().top + scrollY + innerHeight / 2)`)
    await page.evaluate(`scrollTo({ top: ${y}, behavior: 'instant' })`)
    await expect(page.locator('header.ds-header[data-band]')).toHaveCount(1)
    await page.evaluate('new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 350))))')
    await expect(page).toHaveScreenshot('M7-header-band-phone-light.png', { clip: { x: 0, y: 0, width: PHONE.width, height: 72 } })
  })

  test('S8.2 S6.1 M7 the open menu, holding the sections only, matches its baseline, phone light', async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    await page.evaluate(`document.styleSheets[0]?.insertRule('.chat-corner { visibility: hidden !important }', 0)`)
    await steadyHero(page)
    await page.locator('.ds-header__menu > summary').click()
    const panel = page.locator('header.ds-header').getByRole('navigation', { name: 'Menu' })
    await expect(panel).toBeVisible()
    const header = await page.locator('header.ds-header').boundingBox()
    const menu = await panel.boundingBox()
    const bottom = Math.ceil(Math.max((header?.y ?? 0) + (header?.height ?? 0), (menu?.y ?? 0) + (menu?.height ?? 0))) + 8
    await expect(page).toHaveScreenshot('M7-header-menu-phone-light.png', { clip: { x: 0, y: 0, width: PHONE.width, height: bottom } })
  })
})

// M8: the page as built on FIXED_DAY, opened on a later day, so the one module's own count is what shows; a clock
// behind the build leaves the built counts. The bars stay as built.
test('S8.2 S2.3 S2.4 M8 the years at a later date, and with a clock behind the build, match their baselines', async ({ page }) => {
  await builtOn(page)
  await enter(page, { viewport: DESKTOP, theme: 'light' })
  for (const [when, label] of [
    ['2027-04-30T12:00:00Z', 'apr-2027'],
    ['2027-05-01T12:00:00Z', 'may-2027'],
    ['2027-09-01T12:00:00Z', 'sep-2027'],
    ['2030-11-12T12:00:00Z', 'nov-2030'],
    ['2026-01-15T12:00:00Z', 'behind-2026-01'],
  ] as const) {
    await page.clock.setFixedTime(new Date(when))
    await open(page, '/')
    await page.evaluate(`document.querySelector('.ds-header--sticky')?.style.setProperty('visibility', 'hidden', 'important')`)
    await hideAsk(page)
    await steadyHero(page, FIXED_DAY, false)
    await expect(page.locator('.hero__pick'), label).toHaveScreenshot(`M8-years-${label}.png`)
  }
})

test('S8.2 S3.4 M9 "Ask about this" on /mobile puts the role’s question in the box, unsent, and matches its baseline', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  const api = await fakeApi(page)
  await enter(page, { viewport: DESKTOP, theme: 'light' })
  await open(page, '/mobile')
  await page.locator('.hero__detail--desk').getByRole('link', { name: 'Ask about this' }).click()
  await expect(dialogOf(page).getByLabel('Your question')).toHaveValue(DETAILS.mobile.ask)
  await expect(dialogOf(page)).toHaveScreenshot('M9-ask-mobile-desktop-light.png')
  expect(api.posted).toHaveLength(0)
})

test.describe('with no script', () => {
  test.use({ javaScriptEnabled: false })

  test('S8.2 S8.3 M6 the home on a phone and /fullstack on a desktop match their baselines', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    await hideFrame(page)
    await expect(page.locator('.hero')).toHaveScreenshot('M6-noscript-home-phone-light.png')
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/fullstack')
    await hideFrame(page)
    await expect(page.locator('.hero')).toHaveScreenshot('M6-noscript-fullstack-desktop-light.png')
  })
})
