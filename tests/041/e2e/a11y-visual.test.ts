import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { enter, hideFrame } from '../../010/helpers/e2e.ts'
import { type Answer, fakePulse, LIVE, NOW, reach } from '../helpers/e2e.ts'

// Spec 041 for everyone: axe at WCAG 2.2 AA over VINDecoded's card on the
// home and each role page, live, built and with "How this works" open, in
// both themes at the brief's two sizes; and each state in mocks/README.md as a
// snapshot in the pinned container with no pixel tolerance (S9.2, S9.6).
// Every screenshot hides the built numbers until the fake answers
// (tests/041/helpers/screenshot.css), so the weekly refresh moves no baseline.
// Baselines come from pnpm test:visual tests/041 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SIZES = [
  ['phone', { width: 375, height: 812 }],
  ['desktop', { width: 1440, height: 900 }],
] as const
const THEMES = ['light', 'dark'] as const

async function open(
  page: Page,
  viewport: { width: number; height: number },
  theme: 'light' | 'dark',
  answer: Answer = LIVE,
  address = '/',
) {
  await fakePulse(page, answer)
  await enter(page, { viewport, theme })
  await page.clock.setFixedTime(NOW)
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
  await reach(page)
  await hideFrame(page)
}

const card = (page: Page) => page.locator('#side-vindecoded')

for (const theme of THEMES) {
  for (const [size, viewport] of SIZES) {
    test(`S9.2 SC-004 FR-011 axe finds no WCAG 2.2 AA violation on the card, live, built and explained, on every page, ${size} ${theme}`, async ({
      page,
    }) => {
      // Eight page loads, each with an axe pass over the card.
      test.setTimeout(120_000)
      for (const address of ['/', '/mobile', '/fullstack', '/ai']) {
        for (const answer of [LIVE, 'down'] as const) {
          await page.unrouteAll()
          await open(page, viewport, theme, answer, address)
          if (answer === LIVE) await card(page).getByRole('button', { name: 'How this works' }).click()
          const results = await new AxeBuilder({ page }).include('#side-vindecoded').withTags(TAGS).analyze()
          expect(
            results.violations.map((violation) => violation.id),
            `${address} ${String(answer === LIVE ? 'live' : answer)}`,
          ).toEqual([])
        }
      }
    })

    test(`S9.6 M1 the card live on the home, ${size} ${theme}`, async ({ page }) => {
      await open(page, viewport, theme)
      await expect(card(page)).toHaveScreenshot(`M1-live-${size}-${theme}.png`)
    })
  }
}

test('S9.6 M6 "How this works" open, desktop light and dark, phone light', async ({ page }) => {
  for (const [size, viewport, theme] of [
    ['desktop', SIZES[1][1], 'light'],
    ['desktop', SIZES[1][1], 'dark'],
    ['phone', SIZES[0][1], 'light'],
  ] as const) {
    await page.unrouteAll()
    await open(page, viewport, theme)
    await card(page).getByRole('button', { name: 'How this works' }).click()
    // The shot never catches a hover the click left behind, and holds the open panel, which is the state.
    await page.mouse.move(0, 0)
    await expect(page.locator('#side-vindecoded-how')).toHaveScreenshot(`M6-how-open-${size}-${theme}.png`)
  }
})

test('S9.6 M4 M5 the API down and one source down, desktop light', async ({ page }) => {
  await open(page, SIZES[1][1], 'light', 'down')
  await expect(card(page)).toHaveScreenshot('M4-api-down-desktop-light.png')
  await page.unrouteAll()
  await open(page, SIZES[1][1], 'light', { appStore: LIVE.appStore })
  await expect(card(page)).toHaveScreenshot('M5-github-missing-desktop-light.png')
})

test('S9.6 M3 with no script, desktop and phone light', async ({ browser }) => {
  for (const [size, viewport] of SIZES) {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport, colorScheme: 'light', reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('#side-vindecoded')).toHaveScreenshot(`M3-noscript-${size}-light.png`)
    await context.close()
  }
})

test('S9.2 FR-011 the sparkles, the button and the links are 24 px targets or more, and the tile sparkle is focusable', async ({
  page,
}) => {
  await open(page, SIZES[0][1], 'light')
  for (const selector of ['.ds-claim-ask', '.pulse__how-button', '.pulse__links > a', '.pulse__study > a']) {
    const boxes = await card(page)
      .locator(selector)
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))
    expect(boxes.length, selector).toBeGreaterThan(0)
    for (const box of boxes) {
      expect(box.width, selector).toBeGreaterThanOrEqual(24)
      expect(box.height, selector).toBeGreaterThanOrEqual(24)
    }
  }
  await card(page).locator('#receipt-vindecoded-3 .ds-claim-ask').focus()
  await expect(card(page).locator('#receipt-vindecoded-3 .ds-claim-ask')).toBeFocused()
})
