import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { CLAIMS } from '../helpers/claims.ts'
import { AT_SUMMARY, DESKTOP, drawn, FIGURE, leave, open, PHONE, playUntil, reach, RUNNING, STAGE, titles } from '../helpers/e2e.ts'

// Spec 047 in the browser: the replay's place and size (S1.1), what it plays
// and in what order on both paths (S1.2–S1.5), the visitor's control (story
// 2), what screen readers, keyboards and a page with no script get (story 3),
// the claims (S4.1, S4.2) and the budgets that hold in a browser (story 5).
// The clock is Playwright's, run by each test.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
/** Hides or shows the tab, as a browser does when the visitor switches away. */
const HIDE = (hidden: boolean) =>
  `Object.defineProperty(document, 'hidden', { configurable: true, get: () => ${hidden} }); document.dispatchEvent(new Event('visibilitychange'))`
const OPENING = `document.querySelectorAll('.r-pills').length === 1 && [...document.querySelectorAll('[data-r-log] .r-t')].some((e) => e.textContent === 'offer_viewed')`

test.describe('the replay plays (story 1)', () => {
  for (const [size, viewport] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ] as const) {
    test(`S1.1 FR-001 SC-005 S5.7 the replay sits after the claims and before the tags, at its size (${size})`, async ({ page }) => {
      await open(page, { viewport })
      await reach(page)
      const card = page.locator('.hopper__topic:has(#hopper-fintech-ai)')
      const order = await card.evaluate((element) =>
        [...element.children].map((child) => (child.matches('[data-replay]') ? 'replay' : child.matches('.ds-claims') ? 'claims' : child.matches('.ds-chips, [class*="chips"]') ? 'tags' : 'other')),
      )
      expect(order.indexOf('replay')).toBeGreaterThan(order.indexOf('claims'))
      expect(order.indexOf('replay')).toBeLessThan(order.lastIndexOf('tags'))
      const phone = await page.locator(`${STAGE} .r-phone`).boundingBox()
      const trace = await page.locator(`${STAGE} .r-trace`).boundingBox()
      const figure = await page.locator(FIGURE).boundingBox()
      if (!phone || !trace || !figure) throw new Error('The replay has no box.')
      expect(Math.round(phone.height)).toBe(596)
      if (size === 'desktop') {
        expect(trace.x).toBeGreaterThan(phone.x + phone.width)
        expect(Math.abs(trace.y - phone.y)).toBeLessThan(1)
        expect(Math.round(trace.height)).toBe(596)
        expect(Math.abs(figure.height - 716)).toBeLessThanOrEqual(4)
      } else {
        expect(trace.y).toBeGreaterThan(phone.y + phone.height)
        expect(Math.round(trace.height)).toBe(448)
        expect(Math.abs(figure.height - 1276)).toBeLessThanOrEqual(24)
      }
      expect(await page.evaluate('document.documentElement.scrollWidth')).toBe(viewport.width)
      expect(figure.x + figure.width).toBeLessThanOrEqual(viewport.width)
    })
  }

  test('S1.2 SC-001 the opening and the first offer show within 6 s, and the steps play in order to the summary', async ({ page }) => {
    await open(page)
    await reach(page)
    await page.clock.runFor(6000)
    // Read once, with the clock paused, so a card that comes later than 6 s fails.
    expect(await page.locator('[data-r-chat] .r-ai').count()).toBe(1)
    expect(await page.locator('[data-r-chat] .r-offer--a').count()).toBe(1)
    expect((await titles(page)).slice(0, 3)).toEqual(['Flight', 'Traveler', 'Offers'])
    await playUntil(page, OPENING)
    await playUntil(page, AT_SUMMARY)
    await expect(page.locator('[data-r-chat] .r-me')).toHaveText([/What if it's only delayed 90 minutes\?$/, /Yeah, I'll take it$/, /No thanks$/])
    await expect(page.locator('[data-r-chat] .r-offer--decided')).toHaveCount(2)
    await expect(page.locator('.r-offer--a .r-btn.r-pick')).toHaveCount(1)
    await expect(page.locator('.r-offer--b .r-no.r-pick')).toHaveCount(1)
    await expect(page.locator('.r-done')).toContainText('Added to your total$9')
    const all = await titles(page)
    expect(all.at(-1)).toBe('Release gate')
    await expect(page.locator('[data-r-log] .r-now')).toHaveCount(1)
    await expect(page.locator('[data-r-log] .r-ent').last()).toHaveClass(/r-now/)
  })

  test('S1.3 FR-004 after a 5 s hold at the summary it plays again from the first step', async ({ page }) => {
    await open(page)
    await reach(page)
    await playUntil(page, AT_SUMMARY)
    // The release gate's line holds 650 ms, then the summary holds 5 s.
    await page.clock.runFor(5000)
    await expect(page.locator('.r-done')).toHaveCount(1)
    await page.clock.runFor(1000)
    await expect(page.locator('.r-done')).toHaveCount(0)
    expect((await titles(page)).length).toBeLessThan(4)
  })

  test('S1.4 "Declines first" plays the other way, and the pressed button says which is playing', async ({ page }) => {
    await open(page)
    await reach(page)
    const declines = page.getByRole('button', { name: 'Declines first' })
    await declines.click()
    await expect(declines).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Accepts first' })).toHaveAttribute('aria-pressed', 'false')
    await reach(page)
    await playUntil(page, AT_SUMMARY)
    await expect(page.locator('[data-r-chat] .r-me')).toHaveText([/90 minutes\?$/, /I don't think I need that$/, /Yeah, add that$/])
    await expect(page.locator('.r-offer--a .r-no.r-pick')).toHaveCount(1)
    await expect(page.locator('.r-offer--b .r-btn.r-pick')).toHaveCount(1)
    await expect(page.locator('[data-r-chat] .r-ai').nth(2)).toHaveText(/^No problem\. If what you'd really like is peace of mind before the trip/)
    await expect(page.locator('.r-done')).toContainText('Added to your total$38')
  })

  test('S1.5 FR-007 the label and its link show under every frame', async ({ page }) => {
    await open(page)
    await reach(page)
    const label = page.locator(`${FIGURE} figcaption`)
    for (const at of [0, 6000, 20_000]) {
      await page.clock.runFor(at)
      await expect(label).toBeVisible()
      await expect(label).toHaveText(
        "An illustration drawn from Brad's account, not a screenshot or a real trace. The flight, prices, risks, terms and data are sample values. Read the conversation",
      )
    }
    await expect(label.getByRole('link', { name: 'Read the conversation' })).toHaveAttribute('href', '/offer-agent')
  })
})

test.describe('the visitor stays in control (story 2)', () => {
  test('S2.1 FR-005 Pause comes first, then Restart and the two paths, each 44 px or more with a visible focus ring', async ({ page }) => {
    await open(page)
    await reach(page)
    const buttons = page.locator(`${FIGURE} button`)
    await expect(buttons).toHaveText(['Pause', 'Restart', 'Accepts first', 'Declines first'])
    await expect(page.locator(`${FIGURE} [role="group"]`)).toHaveAttribute('aria-label', 'What the traveler does with the first offer')
    for (const button of await buttons.all()) {
      const box = await button.boundingBox()
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
    await buttons.first().focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(buttons.first()).not.toHaveCSS('outline-style', 'none')
  })

  test('S2.2 Pause holds the replay where it is, and Play carries on from there', async ({ page }) => {
    await open(page)
    await reach(page)
    await page.clock.runFor(4000)
    const main = page.locator(`${FIGURE} button`).first()
    await main.click()
    await expect(main).toHaveText('Play')
    const held = await drawn(page)
    await page.clock.runFor(20_000)
    expect(await drawn(page)).toEqual(held)
    await main.click()
    await expect(main).toHaveText('Pause')
    await page.clock.runFor(3000)
    expect((await drawn(page)).log).toBeGreaterThan(held.log)
  })

  test('S2.3 FR-004 it holds while scrolled away or with the tab hidden, and carries on when back', async ({ page }) => {
    await open(page)
    await reach(page)
    await page.clock.runFor(3000)
    await leave(page)
    const away = await drawn(page)
    await page.clock.runFor(20_000)
    expect(await drawn(page)).toEqual(away)
    await reach(page)
    await page.clock.runFor(3000)
    const back = await drawn(page)
    expect(back.log).toBeGreaterThan(away.log)
    await page.evaluate(HIDE(true))
    await page.clock.runFor(20_000)
    expect(await drawn(page)).toEqual(back)
    await page.evaluate(HIDE(false))
    await page.clock.runFor(3000)
    expect((await drawn(page)).log).toBeGreaterThan(back.log)
  })

  test('S2.4 Restart plays from the first step, even when paused', async ({ page }) => {
    await open(page)
    await reach(page)
    await page.clock.runFor(15_000)
    const main = page.locator(`${FIGURE} button`).first()
    await main.click()
    await page.getByRole('button', { name: 'Restart' }).click()
    await expect(main).toHaveText('Pause')
    await page.clock.runFor(100)
    expect(await titles(page)).toEqual([])
    await expect(page.locator('[data-r-log] .r-sec')).toHaveText(['Before the first word'])
    await page.clock.runFor(2000)
    expect((await titles(page))[0]).toBe('Flight')
  })

  test('S2.5 FR-006 with reduced motion it shows the finished frame still, switches paths, and plays once only on Play', async ({ page }) => {
    await open(page, { motion: 'reduce' })
    await reach(page)
    const main = page.locator(`${FIGURE} button`).first()
    await expect(main).toHaveText('Play')
    await expect(page.locator('.r-done')).toContainText('$9')
    const still = await drawn(page)
    await page.clock.runFor(30_000)
    expect(await drawn(page)).toEqual(still)
    await page.getByRole('button', { name: 'Declines first' }).click()
    await expect(page.locator('.r-done')).toContainText('$38')
    await expect(main).toHaveText('Play')
    await main.click()
    await expect(main).toHaveText('Pause')
    await page.clock.runFor(100)
    expect((await drawn(page)).log).toBeLessThan(still.log)
    expect(await page.evaluate(`${RUNNING}.length`)).toBe(0)
    await reach(page)
    await playUntil(page, AT_SUMMARY)
    await page.clock.runFor(1000)
    await expect(main).toHaveText('Play')
    const ended = await drawn(page)
    await page.clock.runFor(30_000)
    expect(await drawn(page)).toEqual(ended)
  })

  test('S2.6 FR-006 with motion allowed its only motions are MA-29–MA-32, each finite', async ({ page }) => {
    await open(page)
    await reach(page)
    const seen = new Map<string, number>()
    for (let step = 0; step < 40; step += 1) {
      await page.clock.runFor(250)
      const running = (await page.evaluate(RUNNING)) as { name: string; duration: number; iterations: number }[]
      for (const animation of running) {
        expect(Number.isFinite(animation.iterations), animation.name).toBe(true)
        seen.set(`${animation.name} ${animation.duration}`, animation.iterations)
      }
    }
    for (const key of seen.keys()) expect(['r-rise 350', 'r-rise 300', 'r-pulse 250']).toContain(key)
    expect(seen.has('r-rise 300')).toBe(true)
    await expect(page.locator(`${STAGE} .r-chat`)).toHaveCSS('scroll-behavior', 'smooth')
  })
})

test.describe('everyone can read it (story 3)', () => {
  test('S3.1 FR-007 on the home the phone and trace are hidden from screen readers with nothing focusable, and the link is not', async ({ page }) => {
    await open(page)
    await reach(page)
    await page.clock.runFor(30_000)
    await expect(page.locator(STAGE)).toHaveAttribute('aria-hidden', 'true')
    expect(await page.locator(`${STAGE} a, ${STAGE} button, ${STAGE} [tabindex], ${STAGE} input`).count()).toBe(0)
    await expect(page.getByRole('link', { name: 'Read the conversation' })).toBeVisible()
    const tree = await page.locator(FIGURE).ariaSnapshot()
    expect(tree).not.toMatch(/Trip assistant|Under the hood/)
  })

  test('S3.2 FR-008 /offer-agent shows the claim, the label and both finished frames, in reading order, and links back', async ({ page }) => {
    await open(page, { address: '/offer-agent' })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The offer agent, illustrated')
    await expect(page.locator('main')).toContainText(CLAIMS['hopper-fintech-ai-2'])
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['When the traveler accepts the first offer', 'When the traveler declines the first offer'])
    await expect(page.locator('.r-stage')).toHaveCount(2)
    await expect(page.locator('[aria-hidden="true"].r-stage, [data-replay]')).toHaveCount(0)
    const tree = await page.locator('main').ariaSnapshot()
    expect(tree).toContain('Traveler: Yeah, I\'ll take it')
    expect(tree).toMatch(/chosen: Add to my trip for \$9/)
    expect(tree).toMatch(/chosen: No, thanks/)
    await expect(page.getByRole('link', { name: "Back to Hopper's Fintech AI work" })).toHaveAttribute('href', '/#hopper-fintech-ai')
    const scripts = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => /player\.|replay\.[\w-]+\.css/.test(name)))
    expect(scripts.filter((name) => name.includes('player.'))).toEqual([])
  })

  test.describe('with no script', () => {
    test.use({ javaScriptEnabled: false })

    test('S3.3 the home shows the empty phone and trace at full size, the controls hidden, and the label with its link', async ({ page }) => {
      await page.setViewportSize(PHONE)
      await page.goto('/')
      const figure = page.locator(FIGURE)
      await figure.scrollIntoViewIfNeeded()
      expect(Math.round((await page.locator(`${STAGE} .r-phone`).boundingBox())?.height ?? 0)).toBe(596)
      expect(Math.round((await page.locator(`${STAGE} .r-trace`).boundingBox())?.height ?? 0)).toBe(448)
      await expect(page.locator(`${STAGE} .r-phone`)).toBeEmpty()
      await expect(page.locator(`${FIGURE} .replay__controls`)).toHaveCSS('visibility', 'hidden')
      await expect(page.getByRole('link', { name: 'Read the conversation' })).toBeVisible()
      await page.goto('/offer-agent')
      await expect(page.locator('.r-done')).toHaveCount(2)
    })
  })

  for (const theme of ['light', 'dark'] as const)
    for (const [size, viewport] of [
      ['desktop', DESKTOP],
      ['phone', PHONE],
    ] as const)
      test(`S3.4 SC-004 no accessibility violation on the home's replay and on /offer-agent (${size}, ${theme})`, async ({ page }) => {
        await open(page, { viewport, theme, motion: 'reduce' })
        await reach(page)
        // axe waits on timers of its own, so the clock runs again for it.
        await page.clock.resume()
        const home = await new AxeBuilder({ page }).withTags(TAGS).include(FIGURE).analyze()
        expect(home.violations).toEqual([])
        await open(page, { address: '/offer-agent', viewport, theme, motion: 'reduce' })
        await page.clock.resume()
        const offer = await new AxeBuilder({ page }).withTags(TAGS).analyze()
        expect(offer.violations).toEqual([])
      })
})

test.describe('the claims (S4.1, S4.2)', () => {
  test('S4.1 S4.2 the four claims show after the first, word for word, each with its anchor and its sparkle', async ({ page }) => {
    await open(page, { motion: 'reduce' })
    const card = page.locator('.hopper__topic:has(#hopper-fintech-ai)')
    const ids = await card.locator('.ds-claim').evaluateAll((claims) => claims.map((claim) => claim.id))
    expect(ids).toEqual(['receipt-hopper-fintech-ai-1', ...Object.keys(CLAIMS).map((id) => `receipt-${id}`)])
    const titles = {
      'hopper-fintech-ai-2': 'AI sales agent for flight booking',
      'hopper-fintech-ai-3': 'Grounded in flight, traveler and offer data',
      'hopper-fintech-ai-4': 'LLM-as-judge eval gate',
      'hopper-fintech-ai-5': 'Lifted the attach rate by 12.6%',
    }
    for (const [id, text] of Object.entries(CLAIMS)) {
      const claim = page.locator(`#receipt-${id}`)
      expect((await claim.textContent())?.replace(/\s+/g, ' ').trim()).toBe(text)
      await expect(claim.getByRole('link', { name: `Ask about this: ${titles[id as keyof typeof titles]}` })).toHaveAttribute(
        'data-chat-ask',
        `Tell me more about this: “${text}”`,
      )
    }
  })
})

test.describe('nothing else gets slower or moves (story 5)', () => {
  test('S5.2 FR-003 the player and its styles load once, only as the replay comes near', async ({ page }) => {
    const asked: string[] = []
    page.on('request', (request) => {
      if (/\/_astro\/(?:player\.[\w-]+\.js|replay\.[\w-]+\.css)$/.test(request.url())) asked.push(request.url())
    })
    await open(page)
    await page.clock.runFor(2000)
    expect(asked).toEqual([])
    await reach(page)
    await leave(page)
    await reach(page)
    expect(asked.filter((url) => url.endsWith('.js'))).toHaveLength(1)
    expect(asked.filter((url) => url.endsWith('.css'))).toHaveLength(1)
  })

  test('S5.4 SC-003 the home shifts nothing while it loads and scrolls past the playing replay', async ({ page }) => {
    await open(page)
    await page.evaluate(
      `window.shifted = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.shifted += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    await reach(page)
    await page.clock.runFor(20_000)
    await page.mouse.wheel(0, 2000)
    await page.clock.runFor(1000)
    expect(await page.evaluate('window.shifted')).toBe(0)
  })
})
