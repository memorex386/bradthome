import { readFileSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { expect, type Page, test } from '@playwright/test'
import { enter } from '../../010/helpers/e2e.ts'
import { dots, FRESH, fakePulse, LIVE, NOW, PULSE_URL, pulseText, reach } from '../helpers/e2e.ts'

// Spec 041 in the browser: VINDecoded's live pulse on the home and each role
// page (story 1), the API's answer swapped in, or not (story 3), the page
// with no script, "How this works", layout shift and the one module (story
// 9). Every test routes /pulse to a fake and fixes the clock. Amended by
// spec 044 (D247): /pulse answers the App Store alone, the merged-PR tile is
// built only with its own day, and the line names the App Store alone.

const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 375, height: 812 }
const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const pulseFile = JSON.parse(readFileSync(path.join(ROOT, 'apps', 'site', 'content', 'previews', 'pulse.json'), 'utf8')) as {
  appStore: { fetched: string; version: string; released: string }
  github: { fetched: string; merged: number }
}
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const AS_OF = day(pulseFile.appStore.fetched)
const COUNTED = `In the 30 days to ${day(pulseFile.github.fetched)}`
const BUILT = {
  version: `v${pulseFile.appStore.version}`,
  shipped: `Shipped ${day(pulseFile.appStore.released)}`,
  merged: pulseFile.github.merged.toLocaleString('en-US'),
  counted: COUNTED,
  stars: '4.7',
  line: `From the App Store · as of ${AS_OF}`,
}

async function open(page: Page, address = '/', viewport = DESKTOP): Promise<void> {
  await enter(page, { viewport, theme: 'light' })
  await page.clock.setFixedTime(NOW)
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

const card = (page: Page) => page.locator('#side-vindecoded')
const textOf = async (page: Page, selector: string) =>
  ((await card(page).locator(selector).first().textContent()) ?? '').replace(/\s+/g, ' ').trim()

test.describe('the card reads as Brad chose (story 1)', () => {
  test('S1.1 S1.2 S1.3 S1.4 S1.5 SC-001 FR-001 the parts in order, with their words', async ({ page }) => {
    await fakePulse(page)
    await open(page)
    await reach(page)
    await expect(card(page).locator('h3')).toHaveText('VINDecoded')
    await expect(card(page).locator('.side__kicker')).toHaveText('Vehicle research · since 2015')
    await expect(card(page).locator('img').first()).toHaveAttribute('src', /\/previews\/appstore-1191483515-/)
    expect(await textOf(page, '#receipt-vindecoded-2')).toBe(
      'A profitable vehicle-history and research platform for shoppers, owners and sellers.',
    )
    const tiles = card(page).locator('dl.pulse__tiles > div')
    await expect(tiles).toHaveCount(3)
    expect(await tiles.locator('dt').allTextContents()).toEqual(['Downloads', 'Latest iOS release', 'Merged PRs'])
    expect(await tiles.locator('.pulse__num').allTextContents()).toEqual(['1.4M+', 'v12.7.8', BUILT.merged])
    const subs = (await tiles.locator('.pulse__sub').allTextContents()).map((text) => text.replace(/\s+/g, ' ').trim())
    expect(subs).toEqual(['Android 1M+ ★4.5 · iOS 400K+ ★4.7', 'Shipped Nov 10, 7 days ago', COUNTED])
    // The star reads as "stars", the claim's own word, to a screen reader.
    await expect(tiles.nth(0).locator('[role="img"]')).toHaveText(['★', '★'])
    for (const star of await tiles.nth(0).locator('[role="img"]').all()) await expect(star).toHaveAccessibleName('stars')
    await expect(card(page).locator('h4')).toHaveText(['What I built', 'AI in production'])
    await expect(card(page).getByRole('list', { name: 'VINDecoded, what I built' }).getByRole('listitem')).toHaveText([
      'React/TypeScript web app',
      'Native Android and iOS',
      'Node.js/TypeScript API',
      'SQL',
      'Firebase',
      'Azure',
    ])
    const ai = card(page).locator('#receipt-vindecoded-5')
    await expect(ai.locator('li')).toHaveText([
      'grounded streaming vehicle chat, with provider-switchable models and tool-isolated vehicle data',
      'vision-based VIN, plate and gas-receipt scanning with structured outputs',
    ])
    expect(await ai.textContent()).not.toContain('Shipped production AI features:')
    expect(await textOf(page, '#receipt-vindecoded-7')).toBe('From the case study, Oct 28: 1,530 test files · 113 runbooks · 46 ADRs')
    // The line is the claim's paragraph, then its link beside it.
    expect(
      await card(page)
        .locator('.pulse__study > *')
        .evaluateAll((parts) => parts.map((part) => part.tagName)),
    ).toEqual(['P', 'A'])
    await expect(card(page).locator('.pulse__study > a.ds-link')).toHaveText('Read the case study')
    await expect(card(page).locator('.pulse__study > a.ds-link')).toHaveAttribute('href', '/vindecoded-agents')
    // The line's sparkle asks about the three counts it shows, under the claim's own lead, never the PR count.
    await expect(card(page).locator('#receipt-vindecoded-7 .ds-claim-ask')).toHaveAttribute(
      'data-chat-ask',
      "Tell me more about this: “The case study's counts, measured on 10/28: 1,530 test files; 113 runbooks; 46 ADRs”",
    )
    const all = (await card(page).textContent()) ?? ''
    for (const word of ['1,235', '83%', 'Never say', 'agent branches']) expect(all).not.toContain(word)
    const links = card(page).locator('.pulse__links > a')
    await expect(links).toHaveText([/vindecoded\.com/, 'App Store', 'Google Play'])
    expect(await links.evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href')))).toEqual([
      'https://vindecoded.com',
      'https://apps.apple.com/us/app/vindecoded/id1191483515',
      'https://play.google.com/store/apps/details?id=com.mtsdealersolutions.vindecoded',
    ])
  })

  test('S1.6 SC-001 five claims, each with its anchor and one sparkle, and nothing else asks', async ({ page }) => {
    await fakePulse(page)
    await open(page)
    const ids = ['vindecoded-2', 'vindecoded-3', 'vindecoded-4', 'vindecoded-5', 'vindecoded-7']
    expect(
      await card(page)
        .locator('[data-claim]')
        .evaluateAll((els) => els.map((el) => [el.id, el.getAttribute('data-claim')])),
    ).toEqual(ids.map((id) => [`receipt-${id}`, id]))
    for (const id of ids) await expect(card(page).locator(`#receipt-${id} .ds-claim-ask`), id).toHaveCount(1)
    await expect(card(page).locator('.ds-claim-ask')).toHaveCount(5)
    await expect(card(page).locator('.ds-claim-ask').nth(2)).toHaveAccessibleName('Ask about this: Re-platformed from AngularJS/Cordova')
    await expect(card(page).locator('.pulse__tile a, .pulse__tile button')).toHaveCount(1)
  })

  test('S1.7 FR-001 each role page shows the same card', async ({ page }) => {
    await fakePulse(page)
    await open(page)
    const home = await card(page).innerHTML()
    for (const address of ['/mobile', '/fullstack', '/ai']) {
      await page.goto(address)
      expect(await card(page).innerHTML(), address).toBe(home)
    }
  })

  test('S1.8 at 375 and 320 the tiles stack, the stack sits over the AI, and nothing scrolls sideways', async ({ page }) => {
    await fakePulse(page)
    for (const viewport of [PHONE, { width: 320, height: 720 }]) {
      await open(page, '/', viewport)
      await reach(page)
      const boxes = await card(page)
        .locator('.pulse__tile')
        .evaluateAll((tiles) => tiles.map((tile) => tile.getBoundingClientRect().top))
      expect(boxes[1]).toBeGreaterThan(boxes[0] ?? 0)
      expect(boxes[2]).toBeGreaterThan(boxes[1] ?? 0)
      const [stack, ai] = await card(page)
        .locator('.pulse__built > *')
        .evaluateAll((parts) => parts.map((part) => part.getBoundingClientRect().top))
      expect(ai).toBeGreaterThan(stack ?? 0)
      expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true)
    }
  })

  test("S1.9 Sudoku World's and bradthome.com's cards follow, unchanged", async ({ page }) => {
    await fakePulse(page)
    await open(page)
    expect(await page.locator('#side article').evaluateAll((articles) => articles.map((a) => a.id))).toEqual([
      'side-vindecoded',
      'side-sudoku-world',
      'side-bradthome-com',
    ])
    await expect(page.locator('#side-sudoku-world [data-pulse], #side-bradthome-com [data-pulse]')).toHaveCount(0)
  })
})

test.describe('live numbers (story 3)', () => {
  test('S3.1 SC-003 FR-004 no request until the card nears the viewport, then exactly one, to the site’s own API', async ({ page }) => {
    const fake = await fakePulse(page)
    const outside: string[] = []
    page.on('request', (request) => {
      const host = new URL(request.url()).hostname
      if (/apple\.com|github\.com|mzstatic/.test(host)) outside.push(request.url())
    })
    await open(page)
    await page.waitForTimeout(1000)
    expect(fake.requests()).toBe(0)
    await reach(page)
    await page.mouse.wheel(0, 2000)
    await page.waitForTimeout(500)
    expect(fake.requests()).toBe(1)
    expect(outside).toEqual([])
  })

  test('S3.2 FR-003 the answer swaps in, with a dot on the release tile and the line dated by the fetch', async ({ page }) => {
    await fakePulse(page, FRESH)
    await open(page)
    await reach(page)
    expect(await pulseText(page)).toEqual({
      stars: '4.8',
      version: 'v12.8.0',
      shipped: 'Shipped Nov 16, yesterday',
      merged: BUILT.merged,
      counted: COUNTED,
      line: 'Live from the App Store · updated 12 min ago',
    })
    expect(await dots(page)).toBe(1)
    await expect(card(page)).toHaveAttribute('data-pulse-live', '')
  })

  test('S3.2 the ages read in minutes, hours and days, and a clock behind the API reads "just now"', async ({ page }) => {
    for (const [fetched, released, line, shipped] of [
      ['2026-11-17T15:11:40Z', '2026-11-17', 'updated just now', 'Shipped Nov 17, today'],
      ['2026-11-17T11:12:00Z', '2026-11-03', 'updated 4 hours ago', 'Shipped Nov 3, 14 days ago'],
      ['2026-11-14T15:12:00Z', '2026-11-20', 'updated 3 days ago', 'Shipped Nov 20'],
    ] as const) {
      await page.unrouteAll()
      await fakePulse(page, { appStore: { ...LIVE.appStore, released, fetched } })
      await open(page)
      await reach(page)
      const text = await pulseText(page)
      expect(text.line).toBe(`Live from the App Store · ${line}`)
      expect(text.shipped).toBe(shipped)
    }
  })

  test('S3.2 the ages are taken when the answer arrives, not when the page loaded', async ({ page }) => {
    await fakePulse(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    // The page loads at 14:40; the visitor reaches the card at 15:12, and the answer was fetched at 15:00.
    await page.clock.setFixedTime(new Date('2026-11-17T14:40:00Z'))
    await page.goto('/')
    await page.clock.setFixedTime(NOW)
    await reach(page)
    expect((await pulseText(page)).line).toBe('Live from the App Store · updated 12 min ago')
  })

  // Amended by spec 044 (D247): with no live count, an answer's GitHub part,
  // as spec 041's API could still send until its next deploy, is ignored.
  test('S3.3 an answer that still carries a GitHub count changes nothing on the PR tile', async ({ page }) => {
    await fakePulse(page, { ...FRESH, github: { merged: 312, days: 30, fetched: '2026-11-17T15:00:00.000Z' } })
    await open(page)
    await reach(page)
    const text = await pulseText(page)
    expect(text.version).toBe('v12.8.0')
    expect(text.merged).toBe(BUILT.merged)
    expect(text.counted).toBe(COUNTED)
    expect(text.line).toBe('Live from the App Store · updated 12 min ago')
    expect(await dots(page)).toBe(1)
    await expect(card(page).locator('.pulse__tile').nth(2).locator('[data-pulse="dot"]')).toHaveCount(0)
  })

  test('S3.4 FR-003 the API down, refusing or unreadable (a slow one is the API’s own test): every built number stays, with no dot and no error', async ({
    page,
  }) => {
    for (const answer of ['down', 'refused', '<html>not json</html>', JSON.stringify({ appStore: { version: 7 } })]) {
      await page.unrouteAll()
      await fakePulse(page, answer)
      await open(page)
      await reach(page)
      expect(await pulseText(page), String(answer)).toEqual(BUILT)
      expect(await dots(page)).toBe(0)
      await expect(card(page)).not.toHaveAttribute('data-pulse-live', '')
    }
  })

  test('S3.5 with no script: the built numbers, dated, and no "How this works"', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP })
    const page = await context.newPage()
    let requests = 0
    await page.route(PULSE_URL, (route) => {
      requests += 1
      return route.abort()
    })
    await page.goto('/')
    expect(await pulseText(page)).toEqual(BUILT)
    await expect(card(page).locator('[data-pulse-how]')).toBeHidden()
    await expect(page.locator('#side-vindecoded-how')).toBeHidden()
    expect(requests).toBe(0)
    await context.close()
  })

  test('S3.6 "How this works" opens and closes its panel, with the note, three steps and the code', async ({ page }) => {
    await fakePulse(page)
    await open(page)
    await reach(page)
    const button = card(page).getByRole('button', { name: 'How this works' })
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toHaveAttribute('aria-controls', 'side-vindecoded-how')
    const panel = page.locator('#side-vindecoded-how')
    await expect(panel).toBeHidden()
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(panel).toBeVisible()
    await expect(panel.locator('p').first()).toHaveText(/^The site’s own API reads the App Store’s public listing/)
    await expect(panel.locator('ol > li')).toHaveText([
      /App Store\s*Public listing, at most hourly/,
      /The site’s API\s*Cached in Firestore/,
      /This card\s*The release live, the PR count dated/,
    ])
    await expect(panel.getByRole('link', { name: 'Read the code on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/memorex386/bradthome/blob/main/apps/chat-api/src/pulse.ts',
    )
    await button.press('Enter')
    await expect(panel).toBeHidden()
  })

  test('S3.7 S9.4 SC-004 the swap moves nothing, with or without reduced motion, and the line is no live region', async ({ page }) => {
    for (const motion of ['reduce', 'no-preference'] as const) {
      await page.goto('about:blank')
      await page.unrouteAll()
      await fakePulse(page, FRESH, 800)
      await page.setViewportSize(DESKTOP)
      await page.emulateMedia({ reducedMotion: motion })
      await page.clock.setFixedTime(NOW)
      await page.addInitScript(
        `window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shift += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
      )
      await page.goto('/')
      await page.locator('#side-vindecoded').scrollIntoViewIfNeeded()
      const before = await card(page).boundingBox()
      await page.waitForTimeout(1500)
      expect((await pulseText(page)).version, motion).toBe('v12.8.0')
      expect(await card(page).boundingBox(), motion).toEqual(before)
      await page.mouse.wheel(0, 20000)
      await page.waitForTimeout(800)
      expect(await page.evaluate('window.__shift'), motion).toBe(0)
      expect(
        await card(page)
          .locator('.pulse__tiles, .pulse__foot')
          .evaluateAll((els) => els.flatMap((el) => el.getAnimations({ subtree: true })).length),
      ).toBe(0)
    }
    await expect(card(page).locator('[aria-live], [role="status"], [role="alert"]')).toHaveCount(0)
  })
})

test.describe('what holds (story 9)', () => {
  test('S9.1 FR-011 the page loads the one module, within Brad’s 2,304-byte allowance over main’s 13,010, and 1,024 gzipped', async ({
    page,
  }) => {
    await fakePulse(page)
    await open(page)
    const scripts = await page.locator('script').evaluateAll((all) => all.map((s) => s.getAttribute('src')))
    expect(scripts).toHaveLength(1)
    const body = await (await page.request.get(scripts[0] ?? '')).body()
    expect(body.length - 13_010).toBeLessThanOrEqual(2_304)
    // Main's module gzipped to 5,012 bytes before this slice.
    expect(gzipSync(body).length - 5_012).toBeLessThanOrEqual(1_024)
  })

  test('S6.2 S7.1 the corpus sends the card’s five claims to their anchors on the built page', async ({ page }) => {
    const corpus = (await (await page.request.get('/corpus.json')).json()) as { sources: { id: string; url: string }[] }
    for (const id of ['vindecoded-2', 'vindecoded-3', 'vindecoded-4', 'vindecoded-5', 'vindecoded-7'])
      expect(corpus.sources.find((source) => source.id === id)?.url, id).toBe(`https://bradthome.com/#receipt-${id}`)
    const llms = await (await page.request.get('/llms.txt')).text()
    expect(llms).toContain('/#receipt-vindecoded-4')
    expect(llms).toContain('/#receipt-vindecoded-5')
  })
})
