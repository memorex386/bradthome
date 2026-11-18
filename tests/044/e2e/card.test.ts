import { readFileSync } from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { enter, hideFrame } from '../../010/helpers/e2e.ts'
import { type Answer, dots, fakePulse, PULSE_URL, pulseText, reach } from '../../041/helpers/e2e.ts'

// Spec 044 in the browser: VINDecoded's card with the PR count built only,
// counted on Brad's PC, and the App Store live through /pulse (D247). Every
// test routes /pulse to a fake and fixes the clock at 15:12 UTC on
// 2026-11-18. The built numbers come from pulse.json, which each refresh
// changes, so the tests read them from the file, and every screenshot hides
// them (tests/041/helpers/screenshot.css). Baselines come from
// pnpm test:visual tests/044 --update.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const pulseFile = JSON.parse(readFileSync(path.join(ROOT, 'apps', 'site', 'content', 'previews', 'pulse.json'), 'utf8')) as {
  appStore: { fetched: string; version: string; released: string }
  github: { fetched: string; merged: number }
}
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const NOW = new Date('2026-11-18T15:12:00Z')
const ANSWER = {
  appStore: { version: '12.8.0', released: '2026-11-17', rating: 4.8, ratings: 3301, fetched: '2026-11-18T15:00:00.000Z' },
}
const MERGED = pulseFile.github.merged.toLocaleString('en-US')
const COUNTED = `In the 30 days to ${day(pulseFile.github.fetched)}`
const SIZES = [
  ['phone', { width: 375, height: 812 }],
  ['desktop', { width: 1440, height: 900 }],
] as const
const THEMES = ['light', 'dark'] as const
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function open(page: Page, answer: Answer = ANSWER, viewport: { width: number; height: number } = SIZES[1][1], theme: 'light' | 'dark' = 'light') {
  await fakePulse(page, answer)
  await enter(page, { viewport, theme })
  await page.clock.setFixedTime(NOW)
  await page.goto('/')
  await page.evaluate('document.fonts.ready.then(() => undefined)')
  await reach(page)
}

const card = (page: Page) => page.locator('#side-vindecoded')
const prTile = (page: Page) => card(page).locator('.pulse__tile').nth(2)

test.describe('the card says what is true (story 3)', () => {
  test('S3.1 FR-004 the PR tile shows the built count and its day, with no dot, whatever /pulse answers', async ({ page }) => {
    for (const answer of [ANSWER, 'down'] as const) {
      await page.unrouteAll()
      await open(page, answer)
      await expect(prTile(page).locator('dt')).toHaveText('Merged PRs')
      await expect(prTile(page).locator('.pulse__num')).toHaveText(MERGED)
      await expect(prTile(page).locator('.pulse__sub')).toHaveText(COUNTED)
      await expect(prTile(page).locator('.pulse__dot')).toHaveCount(0)
    }
  })

  test('S3.2 FR-004 with /pulse answering, the release, stars and dot swap in, and the line names the App Store alone', async ({ page }) => {
    await open(page)
    expect(await pulseText(page)).toEqual({
      stars: '4.8',
      version: 'v12.8.0',
      shipped: 'Shipped Nov 17, yesterday',
      merged: MERGED,
      counted: COUNTED,
      line: 'Live from the App Store · updated 12 min ago',
    })
    expect(await dots(page)).toBe(1)
  })

  test('S3.3 FR-004 with the API down or refusing, the built numbers stand and the line dates the App Store’s check', async ({ page }) => {
    for (const answer of ['down', 'refused'] as const) {
      await page.unrouteAll()
      await open(page, answer)
      const text = await pulseText(page)
      expect(text.version).toBe(`v${pulseFile.appStore.version}`)
      expect(text.merged).toBe(MERGED)
      expect(text.line).toBe(`From the App Store · as of ${day(pulseFile.appStore.fetched)}`)
      expect(await dots(page)).toBe(0)
    }
  })

  test('S3.3 with no script, the built numbers and both days, and no request', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: SIZES[0][1] })
    const page = await context.newPage()
    let requests = 0
    await page.route(PULSE_URL, (route) => {
      requests += 1
      return route.abort()
    })
    await page.goto('/')
    const text = await pulseText(page)
    expect(text.counted).toBe(COUNTED)
    expect(text.line).toBe(`From the App Store · as of ${day(pulseFile.appStore.fetched)}`)
    expect(requests).toBe(0)
    await context.close()
  })

  test('S3.4 FR-004 "How this works" says Apple is live through the site’s API, and the count is counted on Brad’s computer', async ({ page }) => {
    await open(page)
    await card(page).getByRole('button', { name: 'How this works' }).click()
    const panel = page.locator('#side-vindecoded-how')
    await expect(panel.locator('p').first()).toHaveText(
      'The site’s own API reads the App Store’s public listing at most once an hour and keeps the numbers. This card asks that API, never Apple, and shows the numbers it was built with until it answers. The merged pull requests are counted on Brad’s own computer, from VINDecoded’s private repo, and built into the page with the day they were counted.',
    )
    await expect(panel.locator('ol > li')).toHaveText([
      /App Store\s*Public listing, at most hourly/,
      /The site’s API\s*Cached in Firestore/,
      /This card\s*The release live, the PR count dated/,
    ])
  })

  test('S3.5 FR-005 /privacy says the PR count is built in and Apple alone is asked', async ({ page }) => {
    await page.goto('/privacy')
    const section = page.locator('section, div').filter({ has: page.getByRole('heading', { name: 'VINDecoded’s live numbers' }) }).last()
    await expect(section).toContainText('the app’s latest iOS release and rating')
    await expect(section).toContainText('Apple never sees your visit. The count of merged pull requests is built into the page, so nothing is fetched for it.')
    await expect(section).not.toContainText('GitHub')
  })
})

test.describe('what holds (story 5)', () => {
  test('S5.1 FR-007 SC-004 the page loads the one module, smaller than live v2.12.0’s 15,039 bytes', async ({ page }) => {
    await open(page)
    const scripts = await page.locator('script').evaluateAll((all) => all.map((s) => s.getAttribute('src')))
    expect(scripts).toHaveLength(1)
    const body = await (await page.request.get(scripts[0] ?? '')).body()
    expect(body.length).toBeLessThan(15_039)
  })

  for (const theme of THEMES) {
    test(`S5.2 SC-004 axe finds no WCAG 2.2 AA violation on the card, built, live and explained, phone ${theme}`, async ({ page }) => {
      for (const answer of [ANSWER, 'down'] as const) {
        await page.unrouteAll()
        await open(page, answer, SIZES[0][1], theme)
        if (answer === ANSWER) await card(page).getByRole('button', { name: 'How this works' }).click()
        const results = await new AxeBuilder({ page }).include('#side-vindecoded').withTags(TAGS).analyze()
        expect(results.violations.map((violation) => violation.id)).toEqual([])
      }
    })
  }

  test('S5.3 SC-004 the swap moves nothing and layout shift stays 0', async ({ page }) => {
    await fakePulse(page, ANSWER, 800)
    await enter(page, { viewport: SIZES[1][1], theme: 'light' })
    await page.clock.setFixedTime(NOW)
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shift += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    await page.goto('/')
    await card(page).scrollIntoViewIfNeeded()
    const before = await card(page).boundingBox()
    await page.waitForTimeout(1500)
    expect((await pulseText(page)).version).toBe('v12.8.0')
    expect(await card(page).boundingBox()).toEqual(before)
    expect(await page.evaluate('window.__shift')).toBe(0)
  })

  test('S5.4 each role page shows the same card', async ({ page }) => {
    await open(page)
    const home = await pulseText(page)
    for (const address of ['/mobile', '/fullstack', '/ai']) {
      await page.goto(address)
      await reach(page)
      expect(await pulseText(page), address).toEqual(home)
    }
  })

  for (const theme of THEMES) {
    for (const [size, viewport] of SIZES) {
      test(`S5.5 M1 M2 the card built and live, ${size} ${theme}`, async ({ page }) => {
        await open(page, 'down', viewport, theme)
        await hideFrame(page)
        await expect(card(page)).toHaveScreenshot(`M1-built-${size}-${theme}.png`)
        await page.unrouteAll()
        await open(page, ANSWER, viewport, theme)
        await hideFrame(page)
        await expect(card(page)).toHaveScreenshot(`M2-live-${size}-${theme}.png`)
      })
    }
  }
})
